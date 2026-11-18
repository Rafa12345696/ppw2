// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

export default defineConfig({
  // URL publica: se usa para canonical, Open Graph y sitemap.xml
  site: 'https://proyectow2.netlify.app',
  integrations: [react()],
  output: 'server',
  adapter: netlify(),
});