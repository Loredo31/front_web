import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { configurarSesion, msDesdeUltimaPeticion, refrescarSesion, tokens } from '../api/http';
import { authApi, catalogoApi } from '../api/servicios';
import { Boton, Modal } from '../components/ui';
import { config } from '../config';

const AuthContext = createContext(null);
const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hasani-sesion') : null;

export function AuthProvider({ children }) {
  const [estado, setEstado] = useState('cargando'); // cargando | anonimo | autenticado
  const [usuario, setUsuario] = useState(null); // { clienteId, correo }
  const [aviso, setAviso] = useState(null); // mensaje a mostrar en el login
  const [solicitudCierre, setSolicitudCierre] = useState(null); // aviso recibido por WebSocket

  const limpiarLocal = useCallback((motivo) => {
    tokens.clear();
    catalogoApi.limpiarCache();
    setUsuario(null);
    setSolicitudCierre(null);
    setEstado('anonimo');
    if (motivo) setAviso(motivo);
  }, []);

  const aplicarLogin = useCallback((login) => {
    if (!login?.accessToken) return;
    tokens.set(login.accessToken);
    setUsuario({ clienteId: login.clienteId, correo: login.correo, nombre: login.nombre });
    setEstado('autenticado');
    setAviso(null);
  }, []);

  // El cliente HTTP avisa cuando la sesión termina (40104/40105) o se renuevan tokens.
  useEffect(() => {
    configurarSesion({
      onSesionTerminada: (motivo) => limpiarLocal(motivo),
      onTokensRenovados: (login) => login && setUsuario({ clienteId: login.clienteId, correo: login.correo, nombre: login.nombre }),
    });
  }, [limpiarLocal]);

  // Al cargar la página el access token se perdió: recuperar la sesión con la cookie.
  useEffect(() => {
    refrescarSesion()
      .then(aplicarLogin)
      .catch(() => setEstado('anonimo'));
  }, [aplicarLogin]);

  // Sincronizar logout entre pestañas.
  useEffect(() => {
    if (!canal) return undefined;
    const fn = (e) => { if (e.data?.tipo === 'LOGOUT') limpiarLocal(e.data.motivo); };
    canal.addEventListener('message', fn);
    return () => canal.removeEventListener('message', fn);
  }, [limpiarLocal]);

  const cerrarSesion = useCallback(async ({ llamarBackend = true, motivo } = {}) => {
    if (llamarBackend) {
      try { await authApi.logout(); } catch { /* la sesión local se cierra de todos modos */ }
    }
    canal?.postMessage({ tipo: 'LOGOUT', motivo });
    limpiarLocal(motivo);
  }, [limpiarLocal]);

  useSesionSocket(estado === 'autenticado', {
    onSolicitud: setSolicitudCierre,
    onCerrada: (motivo) => limpiarLocal(motivo || 'Tu sesión se cerró.'),
  });

  const { restante, seguir } = useInactividad(estado === 'autenticado',
    () => cerrarSesion({ motivo: 'Tu sesión se cerró por inactividad (2 minutos sin actividad).' }));

  const valor = useMemo(() => ({
    estado, usuario, aviso, setAviso, aplicarLogin, cerrarSesion, solicitudCierre, setSolicitudCierre,
  }), [estado, usuario, aviso, aplicarLogin, cerrarSesion, solicitudCierre]);

  return (
    <AuthContext.Provider value={valor}>
      {children}
      <Modal abierto={restante !== null} titulo="¿Sigues ahí?">
        <p className="text-sm text-slate-700">
          Por seguridad, tu sesión se cerrará en <b className="text-slate-900">{restante} s</b> por inactividad.
        </p>
        <div className="flex gap-2 justify-end mt-5">
          <Boton variante="secundario" onClick={() => cerrarSesion()}>Cerrar sesión</Boton>
          <Boton onClick={seguir}>Seguir conectado</Boton>
        </div>
      </Modal>
    </AuthContext.Provider>
  );
}

const LIMITE_INACTIVIDAD_MS = 2 * 60 * 1000; // igual que seguridad.sesion.inactividad-maxima del backend
const AVISO_MS = 90 * 1000; // a partir de aquí se muestra la cuenta regresiva
const KEEPALIVE_MS = 10 * 1000; // con actividad, avisar al servidor como máximo cada 10 s
// Sin 'scroll': también lo dispara el código (scrollIntoView, cambios de diseño). wheel/teclado/toques cubren al usuario.
const EVENTOS_ACTIVIDAD = ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchstart'];

/**
 * Cierra la sesión tras 2 minutos sin interacción del usuario (mouse, teclado, toques).
 * Mientras hay interacción, avisa al servidor (POST /auth/actividad) para que tampoco la cierre,
 * y lo comparte con las demás pestañas abiertas.
 */
function useInactividad(activo, onExpira) {
  const [restante, setRestante] = useState(null);
  const ultima = useRef(Date.now());
  const registrarRef = useRef(() => {});
  const onExpiraRef = useRef(onExpira);
  onExpiraRef.current = onExpira;

  useEffect(() => {
    if (!activo) { setRestante(null); return undefined; }
    ultima.current = Date.now();
    let ultimoEvento = 0;
    let ultimoKeepalive = 0;
    let ultimoAvisoPestanas = 0;
    let expirada = false;

    const expirar = () => {
      if (expirada) return;
      expirada = true;
      setRestante(null);
      onExpiraRef.current();
    };
    // ¿Ya pasaron los 2 minutos? (el navegador puede congelar el reloj si la pestaña estuvo en segundo plano)
    const vencida = () => Date.now() - ultima.current >= LIMITE_INACTIVIDAD_MS;

    const registrar = (deOtraPestana = false) => {
      // Mover el mouse al regresar NO revive una sesión que ya venció.
      if (vencida()) { expirar(); return; }
      const ahora = Date.now();
      ultima.current = ahora;
      setRestante(null);
      if (deOtraPestana) return;
      if (msDesdeUltimaPeticion() > KEEPALIVE_MS && ahora - ultimoKeepalive > KEEPALIVE_MS) {
        ultimoKeepalive = ahora;
        authApi.actividad().catch(() => { /* si la sesión ya caducó, el cliente HTTP lleva al login */ });
      }
      if (ahora - ultimoAvisoPestanas > 5000) {
        ultimoAvisoPestanas = ahora;
        canal?.postMessage({ tipo: 'ACTIVIDAD' });
      }
    };
    registrarRef.current = registrar;

    let mouseX = null;
    let mouseY = null;
    const alInteractuar = (e) => {
      if (!e.isTrusted) return; // eventos simulados por scripts o extensiones
      if (e.type === 'mousemove') {
        // El navegador emite mousemove sin que el mouse se mueva cuando cambia lo que hay debajo del cursor
        // (p. ej. al aparecer el aviso de inactividad): solo cuenta si de verdad cambió de posición.
        const movido = mouseX === null || Math.abs(e.screenX - mouseX) + Math.abs(e.screenY - mouseY) > 3;
        mouseX = e.screenX; mouseY = e.screenY;
        if (!movido) return;
      }
      const ahora = Date.now();
      if (ahora - ultimoEvento < 1000) return; // como máximo una vez por segundo
      ultimoEvento = ahora;
      registrar();
    };
    const alMensaje = (e) => { if (e.data?.tipo === 'ACTIVIDAD') registrar(true); };

    const revisar = () => {
      const inactivo = Date.now() - ultima.current;
      if (inactivo >= LIMITE_INACTIVIDAD_MS) expirar();
      else if (inactivo >= AVISO_MS) setRestante(Math.ceil((LIMITE_INACTIVIDAD_MS - inactivo) / 1000));
    };
    // Al volver a la pestaña o a la ventana, revisar de inmediato antes de cualquier otro evento.
    const alVolver = () => { if (document.visibilityState === 'visible') revisar(); };

    EVENTOS_ACTIVIDAD.forEach((ev) => window.addEventListener(ev, alInteractuar, { passive: true, capture: true }));
    canal?.addEventListener('message', alMensaje);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver, true);

    const reloj = setInterval(revisar, 1000);

    return () => {
      clearInterval(reloj);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver, true);
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, alInteractuar, { capture: true }));
      canal?.removeEventListener('message', alMensaje);
    };
  }, [activo]);

  const seguir = useCallback(() => registrarRef.current(), []);
  return { restante, seguir };
}

export const useAuth = () => useContext(AuthContext);

/** WebSocket /ws/sesion: AUTH como primer mensaje, PING cada 30 s y reconexión automática. */
function useSesionSocket(activo, { onSolicitud, onCerrada }) {
  const handlers = useRef({ onSolicitud, onCerrada });
  handlers.current = { onSolicitud, onCerrada };

  useEffect(() => {
    if (!activo) return undefined;
    let ws;
    let ping;
    let reintento;
    let intentos = 0;
    let terminado = false;

    const conectar = () => {
      if (terminado) return;
      ws = new WebSocket(config.wsUrl());
      ws.onopen = () => {
        ws.send(JSON.stringify({ tipo: 'AUTH', token: tokens.get() }));
        ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ tipo: 'PING' })), 30000);
      };
      ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (msg.tipo === 'AUTENTICADO') intentos = 0;
        else if (msg.tipo === 'SOLICITUD_CIERRE') handlers.current.onSolicitud({ ...msg, recibida: Date.now() });
        else if (msg.tipo === 'SESION_CERRADA') { terminado = true; handlers.current.onCerrada(msg.motivo); }
      };
      ws.onclose = () => {
        clearInterval(ping);
        if (terminado) return;
        // Si el token venció, refrescarlo antes de reconectar.
        const espera = Math.min(30000, 1000 * 2 ** intentos++);
        reintento = setTimeout(async () => {
          if (intentos > 2) { try { await refrescarSesion(); } catch { return; } }
          conectar();
        }, espera);
      };
    };

    conectar();
    return () => {
      terminado = true;
      clearInterval(ping);
      clearTimeout(reintento);
      ws?.close();
    };
  }, [activo]);
}
