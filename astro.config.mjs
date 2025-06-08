// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import { loadEnv } from "vite";
import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

const { SERVER_ALLOWED_HOSTS } = loadEnv(String(import.meta.env.NODE_ENV), process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  output: 'server',
  
  server: {
    port: 3000
  },

  vite: {
    server: {
      allowedHosts: SERVER_ALLOWED_HOSTS?.split(',')
    },

    plugins: [tailwindcss()],
  },

  // Enable Preact to support Preact JSX components.
  integrations: [preact()],

  adapter: node({
    mode: 'standalone',
  }),
});