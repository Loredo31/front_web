import { useEffect, useState } from 'react';
import { Alerta, Boton, CampoPin, Modal } from './ui';
import { cuentasApi } from '../api/servicios';
import { cuentaAgrupada } from '../utils/formato';

/** Mensaje claro para los errores del PIN (los usan pagos, perfil y PIN). */
export function mensajePin(err) {
  if (err.code === '40905' || (err.status === 409 && /pin/i.test(err.message))) {
    return 'Tu cuenta aún no tiene PIN. Configúralo en Inicio antes de continuar.';
  }
  if (err.code === '40304' || (err.status === 403 && /pin/i.test(err.message))) {
    return `${err.message}. Con 3 intentos incorrectos tu cuenta se bloquea.`;
  }
  return err.message;
}

/** Pide el PIN para autorizar una acción (se envía en X-Auth-Pin). */
export function ModalAutorizar({ abierto, titulo = 'Autorizar con PIN', resumen, textoBoton = 'Confirmar', variante = 'primario', onConfirmar, onCerrar }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => { if (abierto) { setPin(''); setError(''); } }, [abierto]);

  const confirmar = async (e) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) return setError('Ingresa tu PIN completo.');
    setError(''); setCargando(true);
    try {
      await onConfirmar(pin);
    } catch (err) {
      setError(mensajePin(err));
      setPin('');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal abierto={abierto} titulo={titulo} onCerrar={cargando ? undefined : onCerrar}>
      <form onSubmit={confirmar} className="space-y-4">
        {resumen}
        <CampoPin valor={pin} onChange={setPin} autoFocus />
        <Alerta>{error}</Alerta>
        <div className="flex gap-2 justify-end">
          <Boton type="button" variante="secundario" onClick={onCerrar} disabled={cargando}>Cancelar</Boton>
          <Boton type="submit" variante={variante} cargando={cargando}>{textoBoton}</Boton>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Configurar (solo la primera vez) o cambiar el PIN de una cuenta, según `cuenta.tienePin` que envía el backend.
 * Si el backend no lo envía (versión anterior), se deja elegir entre ambas opciones.
 */
export function ModalPin({ abierto, cuenta, onCerrar, onListo }) {
  const conocido = typeof cuenta?.tienePin === 'boolean';
  const [modo, setModo] = useState('cambiar'); // configurar | cambiar
  const [actual, setActual] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setModo(conocido ? (cuenta.tienePin ? 'cambiar' : 'configurar') : 'cambiar');
    setActual(''); setNuevo(''); setConfirmacion(''); setError('');
  }, [abierto, conocido, cuenta]);

  const guardar = async (e) => {
    e.preventDefault();
    if (modo === 'cambiar' && !/^\d{4,6}$/.test(actual)) return setError('Ingresa tu PIN actual.');
    if (!/^\d{4,6}$/.test(nuevo)) return setError('El nuevo PIN debe tener de 4 a 6 dígitos.');
    if (nuevo !== confirmacion) return setError('Los PIN no coinciden.');
    if (/^(\d)\1+$/.test(nuevo) || '0123456789'.includes(nuevo) || '9876543210'.includes(nuevo)) {
      return setError('Elige un PIN menos predecible (evita repetidos o consecutivos).');
    }
    setError(''); setCargando(true);
    try {
      await cuentasApi.pin(cuenta.numeroCuenta, nuevo, modo === 'cambiar' ? actual : undefined);
      onListo?.(modo);
    } catch (err) {
      if (modo === 'configurar' && err.status === 400 && /pin/i.test(err.message)) {
        setModo('cambiar');
        setError('Esta cuenta ya tiene PIN: ingresa tu PIN actual para cambiarlo.');
      } else {
        setError(mensajePin(err));
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal abierto={abierto} titulo={modo === 'configurar' ? '🔐 Configura tu PIN de seguridad' : '🔐 Cambiar PIN de seguridad'}
      onCerrar={cargando ? undefined : onCerrar}>
      <form onSubmit={guardar} className="space-y-3.5">
        <p className="text-xs text-slate-500">Cuenta <span className="font-mono font-semibold text-slate-700">{cuentaAgrupada(cuenta?.numeroCuenta)}</span></p>
        {!conocido && (
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {[['configurar', 'Configurar (primera vez)'], ['cambiar', 'Cambiar PIN']].map(([v, t]) => (
              <button key={v} type="button" onClick={() => { setModo(v); setError(''); }}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${modo === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>{t}</button>
            ))}
          </div>
        )}
        {modo === 'cambiar' && <CampoPin label="PIN actual" valor={actual} onChange={setActual} autoFocus />}
        <CampoPin label="Nuevo PIN" valor={nuevo} onChange={setNuevo} autoFocus={modo === 'configurar'} placeholder="4 a 6 dígitos" />
        <CampoPin label="Confirmar nuevo PIN" valor={confirmacion} onChange={setConfirmacion} placeholder="4 a 6 dígitos" />
        <Alerta>{error}</Alerta>
        <p className="text-[11px] text-slate-400">El PIN se guarda cifrado y se solicita para pagar y modificar tus datos.</p>
        <div className="flex gap-2 justify-end">
          <Boton type="button" variante="secundario" onClick={onCerrar} disabled={cargando}>Cancelar</Boton>
          <Boton type="submit" cargando={cargando}>{modo === 'configurar' ? 'Configurar PIN' : 'Cambiar PIN'}</Boton>
        </div>
      </form>
    </Modal>
  );
}
