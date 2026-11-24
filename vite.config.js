import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// En desarrollo el navegador habla solo con Vite (mismo origen) y Vite reenvía al backend.
// Así la cookie HttpOnly del refresh token y el WebSocket funcionan sin problemas de CORS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_BACKEND_PROXY || 'http://localhost:8080';
  const rutas = ['/auth', '/clientes', '/cuentas', '/api'];
  const proxy = Object.fromEntries(rutas.map((r) => [r, { target: backend, changeOrigin: true }]));
  proxy['/ws'] = { target: backend, ws: true, changeOrigin: true };

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
  };
});
