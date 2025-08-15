import { defineConfig } from 'vite';

export default defineConfig({
  // sustituye 'currency-converter' por el nombre exacto de tu repo
  base: '/currency-converter/',
  test: { environment: 'jsdom', globals: true },
});
