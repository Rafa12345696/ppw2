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
