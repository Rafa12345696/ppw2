// sitemap.xml: lista de paginas publicas para los buscadores.
// Se arma en cada visita con las categorias y productos del backend, asi siempre esta al dia.
// (El plugin @astrojs/sitemap no sirve aqui: solo ve paginas generadas al compilar)
import type { APIRoute } from 'astro';
import { graphqlFetchSSR } from '../api.js';

const QUERY = `
  query {
    categorias {
      id
      productos { id }
    }
  }
`;

const FIJAS = ['/', '/tienda', '/login', '/registro'];

export const GET: APIRoute = async ({ site, url }) => {
  const base = site ?? url;
  let rutas = [...FIJAS];

  try {
    const data = await graphqlFetchSSR(QUERY);
    for (const c of data?.categorias ?? []) {
      rutas.push(`/categoria/${c.id}`);
      for (const p of c.productos ?? []) rutas.push(`/producto/${p.id}`);
    }
  } catch {
    // si el backend no responde se entregan solo las paginas fijas
  }

  const urls = [...new Set(rutas)]
    .map((ruta) => `  <url><loc>${new URL(ruta, base).href}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
