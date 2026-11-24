import { api, num } from './http';
import { config } from '../config';

function nombreDispositivo() {
  const ua = navigator.userAgent;
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const so = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `Web - ${nav}${so ? ` en ${so}` : ''}`;
}

// ---------------- Autenticación ----------------
export const authApi = {
  login: (correo, password) => api('/auth/login', {
    auth: false,
    body: { correo, password, plataforma: config.plataforma, dispositivo: nombreDispositivo() },
  }),
  /** 200 = tokens; 409 (40908) = otra sesión activa → data con solicitudId/secreto. */
  verificar: (ticket, codigo) => api('/auth/2fa/verificar', { auth: false, body: { ticket, codigo }, aceptar: [409] }),
  reenviar: (ticket) => api('/auth/codigo/reenviar', { auth: false, body: { ticket } }),
  estadoSolicitud: (solicitudId, secreto) =>
    api('/auth/sesion/solicitud/estado', { auth: false, body: { solicitudId, secreto }, timeoutMs: 15000 }),
  responderSolicitud: (solicitudId, aprobar) => api('/auth/sesion/solicitud/responder', { body: { solicitudId, aprobar } }),
  cierrePorCorreo: (solicitudId, secreto) => api('/auth/sesion/solicitud/correo', { auth: false, body: { solicitudId, secreto } }),
  confirmarCierreCorreo: (solicitudId, secreto, ticket, codigo) =>
    api('/auth/sesion/solicitud/correo/confirmar', { auth: false, body: { solicitudId, secreto, ticket, codigo } }),
  solicitarRecuperacion: (correo) => api('/auth/recuperacion/solicitar', { auth: false, body: { correo } }),
  confirmarRecuperacion: (ticket, codigo, nuevaPassword) =>
    api('/auth/recuperacion/confirmar', { auth: false, body: { ticket, codigo, nuevaPassword } }),
  logout: () => api('/auth/logout', { reintentar: false }),
  /** Avisa al servidor que el usuario sigue activo (cierre por inactividad a los 2 minutos). */
  actividad: () => api('/auth/actividad', { timeoutMs: 15000 }),
};

// ---------------- Clientes ----------------
export const clientesApi = {
  registrar: (datos) => api('/clientes/onboarding', { auth: false, body: datos }),
  detalle: (id) => api('/clientes/detalle', { body: { id } }),
  actualizarParcial: (cambios, pin) => api('/clientes', { method: 'PATCH', body: cambios, pin }),
  baja: (id, pin) => api('/clientes/baja', { method: 'PUT', body: { id }, pin }),
};

// ---------------- Cuentas ----------------
export const cuentasApi = {
  consulta: (estatus) => api('/cuentas/consulta', { body: estatus ? { estatus } : {} }),
  saldo: (numeroCuenta) => api('/cuentas/saldo', { body: { numeroCuenta: num(numeroCuenta) } }),
  /** Sin pinActual = configurar por primera vez. */
  pin: (numeroCuenta, pinNuevo, pinActual) =>
    api('/cuentas/pin', { method: 'PUT', body: { numeroCuenta: num(numeroCuenta), pinNuevo }, pin: pinActual || undefined }),
};

// ---------------- Catálogo (con caché en memoria durante la sesión) ----------------
const cacheCatalogo = new Map();

async function conCache(clave, fn) {
  if (cacheCatalogo.has(clave)) return cacheCatalogo.get(clave);
  const p = fn().catch((e) => { cacheCatalogo.delete(clave); throw e; });
  cacheCatalogo.set(clave, p);
  return p;
}

export const catalogoApi = {
  productos: ({ pagina = 0, tamano = 12, categoria, busqueda } = {}) => {
    const q = new URLSearchParams({ pagina, tamano });
    if (categoria) q.set('categoria', categoria);
    if (busqueda) q.set('busqueda', busqueda);
    return conCache(`p?${q}`, () => api(`/api/catalog/products?${q}`, { method: 'GET' }).then((r) => r.data));
  },
  categorias: () => conCache('categorias', () => api('/api/catalog/categorias', { method: 'GET' }).then((r) => r.data)),
  limpiarCache: () => cacheCatalogo.clear(),
};

// ---------------- Pagos ----------------
// 200 EXITOSA, 202 PROCESANDO, 422 (42203) RECHAZADA traen `data` con el pago: se aceptan como respuesta.
const aceptarPago = [202, 422];

function resultadoPago(r) {
  if (r.status === 422 && r.code !== '42203') {
    const e = new Error(r.message); e.status = 422; e.code = r.code; throw e;
  }
  return r;
}

export const pagosApi = {
  pagar: ({ numCuenta, producto, monto, referencia, idempotencyKey }, pin) => api('/api/pagos', {
    pin,
    aceptar: aceptarPago,
    timeoutMs: 90000,
    body: {
      numCuenta: num(numCuenta),
      idServicio: producto.idServicio,
      idProducto: Number(producto.id),
      montoPago: Number(monto),
      idDistribuidor: config.idDistribuidor,
      referencia,
      bandera: producto.tipoFront === 2,
      idempotencyKey,
    },
  }).then(resultadoPago),
  detalle: (folio) => api('/api/pagos/detalle', { body: { folio }, aceptar: aceptarPago }).then(resultadoPago),
  historial: (pagina = 0, tamano = 10) => api('/api/pagos/historial', { body: { pagina, tamano } }),
  pendientes: (pagina = 0, tamano = 10) => api('/api/pagos/pendientes', { body: { pagina, tamano } }),
  rechazadas: (pagina = 0, tamano = 10) => api('/api/pagos/rechazadas', { body: { pagina, tamano } }),
  verificar: (folio) => api('/api/pagos/verificar', { body: { folio }, aceptar: aceptarPago }).then(resultadoPago),
};
