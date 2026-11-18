// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import { AstroPWAIntegration } from '@vite-pwa/astro';

// Colores de la app instalada: salen de los tokens de src/index.css
const COLOR_MARCA = '#6b1d2a'; // --c-marca  -> theme_color (barra del sistema / ventana)
const COLOR_FONDO = '#ffffff'; // --c-fondo  -> background_color (pantalla de carga)

export default defineConfig({
  // URL publica: se usa para canonical, Open Graph y sitemap.xml
  site: 'https://proyectow2.netlify.app',
  integrations: [
    react(),
    // PWA: genera manifest.webmanifest, lo enlaza en el <head> y registra el Service Worker
    AstroPWAIntegration({
      registerType: 'autoUpdate',
      injectRegister: false, // el registro se hace en src/layouts/Base.astro
      manifest: {
        id: '/',
        name: 'Elixir · Tienda de licores',
        short_name: 'Elixir',
        description: 'Tienda en linea de licores con pago seguro y seguimiento de pedidos.',
        lang: 'es-MX',
        dir: 'ltr',
        start_url: '/tienda',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: COLOR_MARCA,
        background_color: COLOR_FONDO,
        categories: ['shopping', 'food'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      generateSW: {
        // Por ahora solo se guardan los estilos y los iconos de la app.
        // Las paginas NO se guardan: muestran stock y precios en vivo. El modo sin red es la practica P3-3.
        globPatterns: ['_astro/*.css', 'icons/*.png', 'favicon.svg'],
        navigateFallback: null,
      },
    }),
  ],
  output: 'server',
  adapter: netlify(),
});
