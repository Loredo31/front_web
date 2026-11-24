# Front web — FintechCore (React)

Implementación de la **Propuesta 1: Sidebar Ejecutivo** de `prueba/bocetos_frontend_fintech.html`,
conectada al backend `prueba` según `docs/API_FRONTEND.md`.

## Ejecutar

```bash
npm install
cp .env.example .env     # ya existe un .env con valores de desarrollo
npm run dev              # http://localhost:5173
```

El backend debe estar en `http://localhost:8080`. En desarrollo el navegador solo habla con Vite y Vite
reenvía `/auth`, `/clientes`, `/cuentas`, `/api` y `/ws` al backend (mismo origen → la cookie HttpOnly del
refresh token y el WebSocket funcionan sin configurar CORS).

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/api/http.js` | Cliente HTTP: errores normalizados (3 formatos), token en memoria, refresh único con bloqueo entre pestañas |
| `src/api/servicios.js` | Todos los endpoints (auth, clientes, cuentas, catálogo con caché, pagos) |
| `src/auth/AuthContext.jsx` | Estado de sesión, recuperación al recargar, WebSocket `/ws/sesion`, logout entre pestañas |
| `src/layout/` | Pantalla dividida de acceso y layout con sidebar fijo |
| `src/pages/` | Login + 2FA + sesión única, Recuperar, Registro KYC (3 pasos), Billetera, Pagos, Historial, Perfil |
| `src/components/` | UI base, modales de PIN y comprobante imprimible |

## Producción

- `VITE_API_URL=https://<servicio>.onrender.com` y `npm run build` (sale en `dist/`).
- En el backend: `CORS_ORIGENES=https://<dominio-del-front>`.
- Recomendado: servir el front y la API bajo el **mismo dominio** (rewrite/proxy en el hosting) para que la
  cookie del refresh token no sea "de terceros"; algunos navegadores las bloquean.
