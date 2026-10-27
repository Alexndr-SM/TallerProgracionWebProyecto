// @ts-check
import { defineConfig } from 'astro/config';

// Sitio estático. Los idiomas (es/en/fr) se manejan con rutas /es/, /en/, /fr/
// (ver src/lib/i18n.ts y src/pages/[lang]/index.astro).
export default defineConfig({
  site: 'https://icaturismo.com',
});
