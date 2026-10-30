import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@edition': fileURLToPath(new URL('./src/app/offlineEdition.ts', import.meta.url)),
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/pwa/registerStub.ts', import.meta.url),
      ),
    },
  },
  build: {
    outDir: 'dist-standalone',
  },
});
