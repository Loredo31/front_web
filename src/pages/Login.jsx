import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layout/AuthLayout';
import { Alerta, Boton, Campo, CodigoOtp, Spinner } from '../components/ui';
import { authApi } from '../api/servicios';
import { useAuth } from '../auth/AuthContext';
import { mmss, useCuentaRegresiva } from '../utils/useCuentaRegresiva';

export default function Login() {
  const { aplicarLogin, aviso, setAviso } = useAuth();
  const navigate = useNavigate();

  const [paso, setPaso] = useState('credenciales'); // credenciales | codigo | sesion | codigoCierre
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [desafio, setDesafio] = useState(null); // { ticket, correoEnmascarado, expiraEnSegundos, enviado }
  const [solicitud, setSolicitud] = useState(null); // { solicitudId, secreto, ... }
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const expira = useCuentaRegresiva(desafio?.expiraEnSegundos, desafio?.enviado);
  const reenvio = useCuentaRegresiva(desafio ? 60 : 0, desafio?.enviado);

  const terminar = (login) => {
    aplicarLogin(login);
    navigate('/billetera', { replace: true });
  };

  const nuevoDesafio = (data) => {
    setDesafio({ ...data, enviado: Date.now() });
    setCodigo('');
  };

  const enviarCredenciales = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setAviso(null);
    setCargando(true);
    try {
      const r = await authApi.login(correo.trim(), password);
      nuevoDesafio(r.data);
      setPaso('codigo');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const verificarCodigo = async (e) => {
    e.preventDefault();
    if (codigo.length !== 6) return setError('Ingresa los 6 dígitos del código.');
    setError(''); setInfo('');
    setCargando(true);
    try {
      const r = await authApi.verificar(desafio.ticket, codigo);
      if (r.status === 409) {
        setSolicitud({ ...r.data, recibida: Date.now() });
        setPaso('sesion');
      } else {
        terminar(r.data);
      }
    } catch (err) {
      setError(err.message);
      setCodigo('');
      if (err.status === 423) volverAlInicio(err.message);
    } finally {
      setCargando(false);
    }
  };

  const reenviar = async () => {
    setError(''); setInfo('');
    try {
      const r = await authApi.reenviar(desafio.ticket);
      nuevoDesafio(r.data);
      setInfo('Te enviamos un código nuevo.');
    } catch (err) {
      setError(err.message);
    }
  };

  const volverAlInicio = (mensaje) => {
    setPaso('credenciales');
    setDesafio(null);
    setSolicitud(null);
    setCodigo('');
    setPassword('');
    if (mensaje) setError(mensaje);
  };

  // ---- Cierre de la otra sesión por correo (respaldo) ----
  const pedirCodigoCierre = async () => {
    setError(''); setCargando(true);
    try {
      const r = await authApi.cierrePorCorreo(solicitud.solicitudId, solicitud.secreto);
      nuevoDesafio(r.data);
      setPaso('codigoCierre');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmarCierreCorreo = async (e) => {
    e.preventDefault();
    if (codigo.length !== 6) return setError('Ingresa los 6 dígitos del código.');
    setError(''); setCargando(true);
    try {
      const r = await authApi.confirmarCierreCorreo(solicitud.solicitudId, solicitud.secreto, desafio.ticket, codigo);
      terminar(r.data?.login || r.data);
    } catch (err) {
      setError(err.message);
      setCodigo('');
    } finally {
      setCargando(false);
    }
  };

  const enCodigo = paso === 'codigo' || paso === 'codigoCierre';

  return (
    <AuthLayout>
      <div className="space-y-4">
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-slate-800">Ingresa a tu cartera</h2>
          <p className="text-sm text-slate-400">Ingresa tus credenciales registradas</p>
        </div>

        <Alerta tipo="aviso">{aviso}</Alerta>
        <Alerta>{error}</Alerta>
        <Alerta tipo="exito">{info}</Alerta>

        {paso === 'sesion' ? (
          <SesionActiva
            solicitud={solicitud}
            onLogin={terminar}
            onError={(m) => volverAlInicio(m)}
            onCorreo={pedirCodigoCierre}
            cargando={cargando}
          />
        ) : (
          <form onSubmit={enCodigo ? (paso === 'codigo' ? verificarCodigo : confirmarCierreCorreo) : enviarCredenciales} className="space-y-3.5">
            <Campo label="Correo electrónico" type="email" autoComplete="username" required value={correo}
              disabled={paso !== 'credenciales'} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" />
            <Campo label="Contraseña" type="password" autoComplete="current-password" required value={password}
              disabled={paso !== 'credenciales'} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

            {enCodigo && (
              <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl animar">
                <label className="text-xs font-bold text-blue-900 block mb-1">
                  {paso === 'codigo' ? 'Código de Seguridad 2FA' : 'Código para cerrar la otra sesión'}
                </label>
                <CodigoOtp valor={codigo} onChange={setCodigo} disabled={cargando || expira === 0} />
                <span className="text-[11px] text-blue-700 block text-center mt-1.5">
                  Enviado a <b>{desafio?.correoEnmascarado}</b> •{' '}
                  {reenvio > 0
                    ? <span className="text-blue-400">Reenviar en {reenvio}s</span>
                    : <button type="button" onClick={reenviar} className="underline font-semibold cursor-pointer">Reenviar</button>}
                </span>
                <span className={`text-[11px] block text-center mt-0.5 ${expira > 0 ? 'text-blue-500' : 'text-rose-600 font-semibold'}`}>
                  {expira > 0 ? `El código vence en ${mmss(expira)}` : 'El código venció, solicita uno nuevo.'}
                </span>
                <p className="text-[10px] text-blue-500 text-center mt-1">¿No lo ves? Revisa tu carpeta de spam.</p>
              </div>
            )}

            <Boton type="submit" cargando={cargando} className="w-full">
              {enCodigo ? 'Ingresar al Sistema' : 'Continuar'}
            </Boton>

            {paso !== 'credenciales' && (
              <button type="button" onClick={() => volverAlInicio()} className="w-full text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
                ← Usar otra cuenta
              </button>
            )}
          </form>
        )}

        <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
          <Link to="/recuperar" className="text-blue-600 font-semibold hover:underline">¿Olvidaste tu contraseña?</Link>
          <Link to="/registro" className="text-blue-600 font-semibold hover:underline">Abrir una cuenta →</Link>
        </div>
      </div>
    </AuthLayout>
  );
}

/** Ya existe una sesión en otro dispositivo: consultar el estado cada 2.5 s. */
function SesionActiva({ solicitud, onLogin, onError, onCorreo, cargando }) {
  const restantes = useCuentaRegresiva(solicitud.expiraEnSegundos, solicitud.recibida);
  const callbacks = useRef({ onLogin, onError });
  callbacks.current = { onLogin, onError };

  useEffect(() => {
    let activo = true;
    let t;
    const consultar = async () => {
      try {
        const r = await authApi.estadoSolicitud(solicitud.solicitudId, solicitud.secreto);
        if (!activo) return;
        const { estado, login } = r.data || {};
        if (login) return callbacks.current.onLogin(login);
        if (estado === 'RECHAZADA') return callbacks.current.onError('El otro dispositivo rechazó cerrar su sesión.');
        if (estado === 'EXPIRADA') return callbacks.current.onError('La solicitud venció. Inicia sesión de nuevo.');
        if (estado === 'CONSUMIDA') return callbacks.current.onError('La solicitud ya se utilizó. Inicia sesión de nuevo.');
      } catch (err) {
        if (!activo) return;
        if (err.status && err.status !== 0) return callbacks.current.onError(err.message);
      }
      t = setTimeout(consultar, 2500);
    };
    t = setTimeout(consultar, 1500);
    return () => { activo = false; clearTimeout(t); };
  }, [solicitud]);

  useEffect(() => {
    if (restantes === 0) callbacks.current.onError('La solicitud venció. Inicia sesión de nuevo.');
  }, [restantes]);

  const dispositivo = solicitud.dispositivoSesionActiva || (solicitud.plataformaSesionActiva === 'MOVIL' ? 'la app móvil' : 'otro navegador');

  return (
    <div className="space-y-3 animar">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
        <p className="font-bold flex items-center gap-2"><span>📱</span> Sesión abierta en otro dispositivo</p>
        <p className="mt-1.5 text-xs leading-relaxed">
          Tienes una sesión abierta en <b>{dispositivo}</b>. Confirma el cierre en ese dispositivo o usa la verificación por correo.
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-amber-700">
          <Spinner /> Esperando confirmación… {mmss(restantes)}
        </div>
      </div>
      <Boton variante="secundario" className="w-full" onClick={onCorreo} cargando={cargando}>
        ✉️ Verificar por correo en su lugar
      </Boton>
      <button type="button" onClick={() => onError()} className="w-full text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
        Cancelar
      </button>
    </div>
  );
}
