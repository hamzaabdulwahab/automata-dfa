import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        auth: resolve(import.meta.dirname, 'auth.html'),
        ssoCallback: resolve(import.meta.dirname, 'sso-callback.html'),
      },
    },
  },
});
