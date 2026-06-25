# Configuración de Despliegue en Netlify

## Variables de Entorno Requeridas

Para que la aplicación funcione correctamente en Netlify, debes configurar la siguiente variable de entorno:

### REACT_APP_BACKEND_URL

**Valor**: `https://ovosanti-delivery.emergent.host`

**¿Cómo configurarla en Netlify?**

1. Ve a tu sitio en Netlify Dashboard
2. Navega a: **Site settings** → **Build & deploy** → **Environment**
3. Click en **Edit variables**
4. Agrega una nueva variable:
   - **Key**: `REACT_APP_BACKEND_URL`
   - **Value**: `https://ovosanti-delivery.emergent.host`
5. Click **Save**
6. Redesplega el sitio (Deploy → Trigger deploy → Deploy site)

## Fallback Automático

La aplicación ahora incluye un fallback automático en `/frontend/src/config.js`:

- Si `REACT_APP_BACKEND_URL` está definida → usa esa URL
- Si no está definida y estás en localhost → usa `http://localhost:8001`
- Si no está definida y estás en producción → usa `https://ovosanti-delivery.emergent.host`

**Nota**: Aunque existe el fallback, es recomendable configurar la variable de entorno explícitamente en Netlify para tener control total sobre la URL del backend.

## Verificación

Después de redesplegar, verifica que todo funciona:

1. Abre la consola del navegador (F12)
2. Crea una nueva entrega
3. Verifica en la pestaña **Network** que las peticiones van a:
   - ✅ `https://ovosanti-delivery.emergent.host/api/deliveries`
   - ❌ NO a `undefined/api/deliveries`

## Backend en Producción

Asegúrate de que el backend también esté desplegado y funcionando en:
`https://ovosanti-delivery.emergent.host`

Endpoints que deben responder:
- `GET /api/` → {"message": "Ovosanti Delivery API"}
- `GET /api/deliveries` → Lista de entregas
- `GET /api/deliveries/stats` → Estadísticas
