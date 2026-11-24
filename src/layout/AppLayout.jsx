import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { authApi, cuentasApi } from '../api/servicios';
import { Boton, Modal } from '../components/ui';
import Marca from '../components/Marca';
import { useCuentaRegresiva } from '../utils/useCuentaRegresiva';

const menu = [
  { a: '/billetera', icono: 'inicio', texto: 'Inicio' },
  { a: '/pagos', icono: 'compras', texto: 'Recargas y servicios' },
  { a: '/historial', icono: 'historial', texto: 'Historial' },
  { a: '/perfil', icono: 'perfil', texto: 'Mi perfil' },
];

// Cuentas del usuario, compartidas entre Billetera, Pagos y Perfil.
const CuentasContext = createContext(null);
export const useCuentas = () => useContext(CuentasContext);

export default function AppLayout() {
  const { usuario, cerrarSesion } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuentas, setCuentas] = useState(null);
  const [errorCuentas, setErrorCuentas] = useState('');

  const recargarCuentas = useCallback(async () => {
    try {
      const r = await cuentasApi.consulta();
      setCuentas(r.data || []);
      setErrorCuentas('');
    } catch (e) {
      setErrorCuentas(e.message);
      setCuentas((c) => c || []);
    }
  }, []);

  useEffect(() => { recargarCuentas(); }, [recargarCuentas]);

  const principal = cuentas?.find((c) => c.estado === 'ACTIVA') || cuentas?.[0] || null;

  const nombre = usuario?.nombre || usuario?.correo || '';
  const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <CuentasContext.Provider value={{ cuentas, principal, recargarCuentas, errorCuentas }}>
      <div className="min-h-screen flex flex-col">
        {/* Encabezado */}
        <header className="bg-white shadow-sm sticky top-0 z-30 no-imprimir">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setMenuAbierto(true)} className="md:hidden p-2 -ml-2 rounded-md hover:bg-slate-100 cursor-pointer" aria-label="Abrir menú">
                <Icono nombre="menu" />
              </button>
              <Marca />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{nombre}</p>
                <button onClick={() => cerrarSesion()} className="text-xs text-blue-600 hover:underline cursor-pointer">Cerrar sesión</button>
              </div>
              <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center" title={usuario?.correo}>
                {iniciales || '•'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex gap-6">
          {/* Menú lateral */}
          <aside className={`${menuAbierto ? 'fixed inset-y-0 left-0 z-40 w-64 shadow-xl rounded-none' : 'hidden'}
            md:static md:block md:w-56 shrink-0 tarjeta p-2 h-fit no-imprimir`}>
            {menuAbierto && <div className="md:hidden p-3 pb-4"><Marca /></div>}
            <nav className="space-y-0.5">
              {menu.map((m) => (
                <NavLink
                  key={m.a}
                  to={m.a}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) => `relative px-3 py-2.5 rounded-md flex items-center gap-3 text-[15px] transition ${isActive
                    ? 'bg-blue-50 text-blue-700 font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-blue-600'
                    : 'text-slate-700 hover:bg-slate-50 font-semibold'}`}
                >
                  <Icono nombre={m.icono} /> {m.texto}
                </NavLink>
              ))}
            </nav>
            <button onClick={() => cerrarSesion()} className="sm:hidden mt-2 w-full px-3 py-2.5 rounded-md flex items-center gap-3 text-[15px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer">
              <Icono nombre="salir" /> Cerrar sesión
            </button>
          </aside>
          {menuAbierto && <div className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" onClick={() => setMenuAbierto(false)} />}

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <DialogoCierre />
    </CuentasContext.Provider>
  );
}

const trazos = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  compras: 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  historial: 'M12 7v5l3 2M21 12a9 9 0 1 1-3-6.7M21 4v4h-4',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  menu: 'M4 6h16M4 12h16M4 18h16',
  salir: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3',
};

export function Icono({ nombre, className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={trazos[nombre]} />
    </svg>
  );
}

/** Aviso por WebSocket: otro dispositivo quiere iniciar sesión. */
function DialogoCierre() {
  const { solicitudCierre, setSolicitudCierre, cerrarSesion } = useAuth();
  const restantes = useCuentaRegresiva(solicitudCierre?.expiraEnSegundos, solicitudCierre?.recibida);
  const [cargando, setCargando] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (solicitudCierre && restantes === 0) setSolicitudCierre(null);
  }, [restantes, solicitudCierre, setSolicitudCierre]);

  if (!solicitudCierre) return null;

  const responder = async (aprobar) => {
    setCargando(aprobar ? 'si' : 'no'); setError('');
    try {
      await authApi.responderSolicitud(solicitudCierre.solicitudId, aprobar);
      if (aprobar) cerrarSesion({ llamarBackend: false, motivo: 'Cerraste esta sesión para iniciar en otro dispositivo.' });
      else setSolicitudCierre(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(null);
    }
  };

  const dispositivo = solicitudCierre.dispositivo || (solicitudCierre.plataforma === 'MOVIL' ? 'la app móvil' : 'otro navegador');

  return (
    <Modal abierto titulo="🔐 Nuevo inicio de sesión">
      <p className="text-sm text-slate-700">
        ¿Cerrar esta sesión para iniciar en <b>{dispositivo}</b>?
      </p>
      <p className="text-xs text-slate-400 mt-1">Si no fuiste tú, rechaza la solicitud y cambia tu contraseña. Expira en {restantes}s.</p>
      {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      <div className="flex gap-2 justify-end mt-5">
        <Boton variante="secundario" onClick={() => responder(false)} cargando={cargando === 'no'} disabled={!!cargando}>Rechazar</Boton>
        <Boton variante="peligro" onClick={() => responder(true)} cargando={cargando === 'si'} disabled={!!cargando}>Sí, cerrar aquí</Boton>
      </div>
    </Modal>
  );
}
