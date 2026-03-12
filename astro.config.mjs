// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.dev/en/guides/integrations-guide/vercel/
export default defineConfig({
  // static (default): pages pre-built, API routes with prerender=false run server-side
  // In Astro 5, 'static' absorbed 'hybrid' — same behaviour, one less option
  output: 'static',
  adapter: vercel(),
});
