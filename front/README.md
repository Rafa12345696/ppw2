# Elixir - frontend

Sitio de Elixir en Astro 7 con islas de React. La documentacion completa esta en el [README principal](../README.md).

```powershell
copy .env.example .env
$env:NETLIFY_DEV = "1"
npm install
npm run dev       # http://localhost:4321
npm run build
```

Regla de prerender: `tienda`, `categoria/[id]`, `producto/[id]` y `admin/editar/[id]` NO llevan `export const prerender = true` porque piden datos en cada visita. Las demas paginas si.

## Auditoria de calidad (Practica P3-1)

Lighthouse en Chrome (incognito) > F12 > Lighthouse > Mode: Navigation, Device: Mobile.

Paginas auditadas:

- Inicio: `/tienda`
- Categoria: `/categoria/<id>` (cualquier categoria con productos)
- Producto: `/producto/<id>`

Antes de auditar el sitio publicado abre la tienda una vez: el backend en Render tarda en despertar y eso baja Performance.

SEO: `canonical` y Open Graph en `src/layouts/Base.astro`, JSON-LD `Product` en `src/pages/producto/[id].astro`, `sitemap.xml` en `src/pages/sitemap.xml.ts` y `public/robots.txt`.

## PWA instalable (Practica P3-2)

- Integracion: `@vite-pwa/astro` en `astro.config.mjs` (genera `manifest.webmanifest`, `sw.js` y los enlaza).
- Manifiesto: `name`, `short_name`, `start_url` (`/tienda`), `scope`, `display: standalone`, `theme_color` (`--c-marca` #6b1d2a) y `background_color` (`--c-fondo` #ffffff).
- Iconos en `public/icons/`: 192, 512 y maskable 512 (letra dentro del 80 % central).
- Boton propio "Instalar app" con `beforeinstallprompt`: `src/components/islands/BotonInstalar.jsx`.
- El Service Worker solo guarda estilos e iconos; el modo sin red es la practica P3-3.

Probar en local sin levantar el backend:

```powershell
npm install
# en .env: PUBLIC_API_URL=https://ppw2.onrender.com/graphql
npm run build
npm run preview
```

Verificar: DevTools > Application > Manifest (seccion Installability sin errores) y el icono de instalar en la barra de direcciones.
