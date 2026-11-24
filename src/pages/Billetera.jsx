import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCuentas, Icono } from '../layout/AppLayout';
import { pagosApi } from '../api/servicios';
import { Alerta, Cargando, Estado } from '../components/ui';
import { ModalPin } from '../components/Pin';
import { cuentaAgrupada, formatoFecha, formatoMoneda, ultimos4 } from '../utils/formato';
import { useAuth } from '../auth/AuthContext';

export default function Billetera() {
  const { usuario } = useAuth();
  const { cuentas, principal, recargarCuentas, errorCuentas } = useCuentas();
  const [seleccion, setSeleccion] = useState(null);
  const [modalPin, setModalPin] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [pendientes, setPendientes] = useState(0);
  const [ocultarSaldo, setOcultarSaldo] = useState(false);

  const cuenta = cuentas?.find((c) => c.numeroCuenta === seleccion) || principal;
  const primerNombre = (usuario?.nombre || '').split(' ')[0];

  useEffect(() => {
    pagosApi.pendientes(0, 1).then((r) => setPendientes(r.data?.totalElementos || 0)).catch(() => {});
  }, []);

  if (!cuentas) return <Cargando texto="Cargando tu cartera…" />;

  return (
    <div className="space-y-4 animar max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">{primerNombre ? `¡Hola, ${primerNombre}!` : '¡Hola!'}</h1>

      <Alerta>{errorCuentas}</Alerta>
      <Alerta tipo="exito">{mensaje}</Alerta>

      {!cuenta ? (
        <Alerta tipo="aviso">No encontramos cuentas asociadas a tu usuario.</Alerta>
      ) : (
        <>
          {/* Dinero disponible */}
          <section className="tarjeta">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600 font-semibold">
                  Dinero disponible
                  <button onClick={() => setOcultarSaldo(!ocultarSaldo)} className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={ocultarSaldo ? 'Mostrar saldo' : 'Ocultar saldo'} aria-label={ocultarSaldo ? 'Mostrar saldo' : 'Ocultar saldo'}>
                    <Ojo cerrado={ocultarSaldo} />
                  </button>
                </div>
                <button onClick={recargarCuentas} className="text-sm text-blue-600 font-semibold hover:underline cursor-pointer">Actualizar</button>
              </div>
              <p className="text-4xl md:text-5xl font-extrabold text-slate-900 mt-2 tracking-tight">
                {ocultarSaldo ? '$ ••••' : formatoMoneda(cuenta.saldo)}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-500">
                <span className="font-mono">Cuenta {cuentaAgrupada(cuenta.numeroCuenta)}</span>
                <Estado valor={cuenta.estado} />
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-5">
              <Link to="/pagos" className="inline-flex flex-col items-center gap-2 group">
                <span className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition">
                  <Icono nombre="compras" className="w-6 h-6" />
                </span>
                <span className="text-sm font-semibold text-slate-800">Recargas y servicios</span>
              </Link>
            </div>
          </section>

          {pendientes > 0 && (
            <Link to="/historial?vista=pendientes" className="tarjeta p-4 flex items-center justify-between gap-3 hover:bg-amber-50/40 transition">
              <span className="text-sm text-slate-700">
                <b className="text-amber-700">{pendientes} pago(s) en verificación.</b> El monto está retenido hasta que el proveedor responda.
              </span>
              <span className="text-blue-600 text-xl">›</span>
            </Link>
          )}

          {/* PIN */}
          <button onClick={() => setModalPin(true)} className="tarjeta w-full p-4 flex items-center gap-4 text-left hover:bg-slate-50 transition cursor-pointer">
            <span className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg">🔐</span>
            <span className="flex-1">
              <span className="block font-bold text-slate-800">
                {cuenta.tienePin === false ? 'Configura tu PIN de seguridad' : cuenta.tienePin ? 'Cambiar PIN de seguridad' : 'PIN de seguridad'}
              </span>
              <span className="block text-sm text-slate-500">
                {cuenta.tienePin === false
                  ? 'Aún no tienes PIN. Lo necesitas para pagar y modificar tus datos.'
                  : 'Se pide para pagar y modificar tus datos.'}
              </span>
            </span>
            {cuenta.tienePin === true && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">VIGENTE</span>}
            <span className="text-blue-600 text-xl">›</span>
          </button>

          {cuentas.length > 1 && (
            <section className="tarjeta p-4">
              <h2 className="font-bold text-slate-800 mb-3">Mis cuentas</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {cuentas.map((c) => (
                  <button key={c.numeroCuenta} onClick={() => setSeleccion(c.numeroCuenta)}
                    className={`text-left p-3 rounded-md border transition cursor-pointer ${c.numeroCuenta === cuenta.numeroCuenta
                      ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-800 text-sm">•••• {ultimos4(c.numeroCuenta)}</span>
                      <Estado valor={c.estado} />
                    </div>
                    <p className="text-lg font-extrabold text-slate-900 mt-1">{formatoMoneda(c.saldo)}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <p className="text-xs text-slate-500">Cuenta abierta el {formatoFecha(cuenta.fechaCreacion, false)}.</p>
        </>
      )}

      <ModalPin
        abierto={modalPin}
        cuenta={cuenta}
        onCerrar={() => setModalPin(false)}
        onListo={(modo) => {
          setModalPin(false);
          setMensaje(modo === 'configurar' ? 'PIN configurado correctamente. Ya puedes realizar pagos.' : 'PIN actualizado correctamente.');
          recargarCuentas();
        }}
      />
    </div>
  );
}

function Ojo({ cerrado }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {cerrado && <path d="M3 3l18 18" />}
    </svg>
  );
}

/** Título de página (se usa dentro de la tarjeta de cada sección). */
export function Encabezado({ titulo, subtitulo, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-4 border-b border-slate-100 no-imprimir">
      <div>
        <h1 className="font-extrabold text-slate-900 text-xl">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
