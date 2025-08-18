// @ts-check
import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import bun from "@hedystia/astro-bun";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [solidJs()],
  adapter: bun(),
  vite: {
    plugins: [tailwindcss()],
  },
});