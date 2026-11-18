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

- Home: `/`
- Categoria: `/categoria/<id>` (cualquier categoria con productos)
- Producto: `/producto/<id>`

Antes de auditar el sitio publicado abre la tienda una vez: el backend en Render tarda en despertar y eso baja Performance.

SEO: `canonical` y Open Graph en `src/layouts/Base.astro`, JSON-LD `Product` en `src/pages/producto/[id].astro`, `sitemap.xml` en `src/pages/sitemap.xml.ts` y `public/robots.txt`.
