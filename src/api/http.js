import { config } from '../config';

/**
 * Cliente HTTP único para toda la app.
 * - Normaliza los tres formatos de error del backend (ApiResponse, GenericResponse, ProblemDetail).
 * - Guarda el access token SOLO en memoria (el refresh token es una cookie HttpOnly).
 * - Ante 40103 hace UN solo refresh (compartido entre peticiones y entre pestañas) y repite la petición.
 */

let accessToken = null;
let ultimaPeticion = 0; // última petición autenticada (el servidor la cuenta como actividad)

/** Milisegundos desde la última petición autenticada que llegó al servidor. */
export const msDesdeUltimaPeticion = () => Date.now() - ultimaPeticion;
let alTerminarSesion = () => {};
let alRenovarTokens = () => {};

export const tokens = {
  get: () => accessToken,
  set: (t) => { accessToken = t; },
  clear: () => { accessToken = null; },
};

/** La AuthContext registra qué hacer cuando la sesión termina o se renuevan los tokens. */
export function configurarSesion({ onSesionTerminada, onTokensRenovados }) {
  alTerminarSesion = onSesionTerminada || (() => {});
  alRenovarTokens = onTokensRenovados || (() => {});
}

export class ApiError extends Error {
  constructor({ status, code, message, campos, data, body }) {
    super(message || 'Ocurrió un error inesperado');
    this.status = status;
    this.code = code;
    this.campos = campos;
    this.data = data;
    this.body = body;
  }
}

/** Número de cuenta enviado como número JSON sin perder precisión (16 dígitos). */
export class NumeroCrudo {
  constructor(valor) { this.valor = String(valor).replace(/\D/g, ''); }
}
export const num = (v) => new NumeroCrudo(v);

function serializar(body) {
  const json = JSON.stringify(body, (_k, v) => (v instanceof NumeroCrudo ? `__NUM__${v.valor}__` : v));
  return json.replace(/"__NUM__(\d+)__"/g, '$1');
}

function normalizarError(status, body) {
  if (!body || typeof body !== 'object') {
    return new ApiError({ status, message: textoPorEstado(status) });
  }
  const message = body.message || body.mensaje || body.detail || textoPorEstado(status);
  const campos = body.errores || (body.codigo === 1 ? body.datos : undefined);
  return new ApiError({ status, code: body.code, message, campos, data: body.data, body });
}

function textoPorEstado(status) {
  if (status === 0) return 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.';
  if (status === 401) return 'Tu sesión no es válida. Inicia sesión de nuevo.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'No se encontró la información solicitada.';
  if (status >= 500) return 'El servidor no está disponible en este momento.';
  return 'Ocurrió un error inesperado';
}

async function ejecutar(path, { method = 'POST', body, headers = {}, timeoutMs = config.timeoutMs, auth = true }) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (auth && accessToken) h.Authorization = `Bearer ${accessToken}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let resp;
  try {
    resp = await fetch(config.apiUrl + path, {
      method,
      headers: h,
      body: body !== undefined ? serializar(body) : undefined,
      credentials: 'include', // necesario para la cookie del refresh token
      signal: ctrl.signal,
    });
  } catch (e) {
    const err = new ApiError({
      status: 0,
      message: e.name === 'AbortError'
        ? 'El servidor tardó demasiado en responder.'
        : textoPorEstado(0),
    });
    err.red = true; // error de red / timeout: la operación pudo o no ejecutarse
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const texto = await resp.text();
  let json = null;
  if (texto) {
    try { json = JSON.parse(texto); } catch { json = null; }
  }
  return { resp, json };
}

// ---------- Refresh único (entre peticiones y entre pestañas) ----------
let refreshEnCurso = null;

function conBloqueo(fn) {
  // Web Locks evita que dos pestañas usen el mismo refresh token (el servidor lo tomaría como robo).
  if (navigator.locks?.request) return navigator.locks.request('hasani-refresh', fn);
  return fn();
}

export function refrescarSesion() {
  if (!refreshEnCurso) {
    refreshEnCurso = conBloqueo(async () => {
      const { resp, json } = await ejecutar('/auth/refresh', { auth: false });
      if (!resp.ok) throw normalizarError(resp.status, json);
      const login = json?.data;
      accessToken = login?.accessToken || null;
      alRenovarTokens(login);
      return login;
    }).finally(() => { refreshEnCurso = null; });
  }
  return refreshEnCurso;
}

/**
 * Petición al backend. Devuelve `{ status, code, message, data }`.
 * Opciones: method, body, pin (X-Auth-Pin), auth (default true), aceptar (estados extra que no son error).
 */
export async function api(path, opciones = {}) {
  const { pin, aceptar = [], reintentar = true, ...resto } = opciones;
  const headers = { ...(resto.headers || {}) };
  if (pin) headers['X-Auth-Pin'] = pin;

  const { resp, json } = await ejecutar(path, { ...resto, headers });

  if (resto.auth !== false && resp.status !== 401) ultimaPeticion = Date.now();
  if (resp.ok || aceptar.includes(resp.status)) {
    return { status: resp.status, code: json?.code, message: json?.message, data: json?.data ?? json };
  }

  const auth = resto.auth !== false;
  if (resp.status === 401 && auth) {
    const code = json?.code;
    if (code === '40103' && reintentar) {
      try {
        await refrescarSesion();
      } catch {
        accessToken = null;
        alTerminarSesion('Tu sesión expiró. Inicia sesión de nuevo.');
        throw normalizarError(resp.status, json);
      }
      return api(path, { ...opciones, reintentar: false });
    }
    if (code === '40104' || code === '40105' || code === '40103') {
      accessToken = null;
      alTerminarSesion(code === '40104' ? 'Tu sesión se cerró.' : 'Tu sesión expiró. Inicia sesión de nuevo.');
    }
  }
  throw normalizarError(resp.status, json);
}
