// Configuración por entorno (nunca escribir URLs fijas en las pantallas).
const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function wsUrl() {
  const base = apiUrl || window.location.origin;
  return base.replace(/^http/, 'ws') + '/ws/sesion';
}

export const config = {
  apiUrl,
  wsUrl,
  idDistribuidor: Number(import.meta.env.VITE_ID_DISTRIBUIDOR || 83),
  plataforma: 'WEB',
  timeoutMs: 60000, // Render puede tardar en "despertar"
};
