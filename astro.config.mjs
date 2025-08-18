// @ts-check
import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import bun from "@nurodev/astro-bun";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [solidJs()],
  adapter: bun({host:"0.0.0.0", port: 4321}),
  vite: {
    plugins: [tailwindcss()],
  },
});