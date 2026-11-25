const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const formatoMoneda = (v) => (v === null || v === undefined || v === '' ? '—' : moneda.format(Number(v)));

export function formatoFecha(iso, conHora = true, conSegundos = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', conHora
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...(conSegundos && { second: '2-digit' }) }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Fecha del pago: la que generamos y enviamos a GestoPago (fechaEnvio); si no existe, la de registro. */
export const fechaPago = (pago) => pago?.fechaEnvio || pago?.fechaCreacion;

export const ultimos4 = (n) => (n ? String(n).slice(-4) : '••••');

export const cuentaAgrupada = (n) => (n ? String(n).replace(/(.{4})(?=.)/g, '$1 ') : '');

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;
export const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
/** Cualquier dominio (hotmail, gmail, utng.edu...), pero con @ y terminación .com o .mx (igual que el backend). */
export const CORREO_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.(com|mx)$/i;
export const MENSAJE_CORREO = 'El correo debe tener @ y terminar en .com o .mx (por ejemplo, nombre@hotmail.com)';

export const nuevoUuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }));
