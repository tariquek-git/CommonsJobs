import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';

export default defineConfig({
  // Only serve Keystatic admin routes — ignore Vite SPA pages
  srcDir: './cms',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    markdoc(),
    ...(process.env.SKIP_KEYSTATIC ? [] : [keystatic()]),
  ],
});
