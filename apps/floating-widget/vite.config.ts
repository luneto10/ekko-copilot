import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset paths relative so Electron can load the build via file://.
export default defineConfig({
  plugins: [react()],
  base: './',
  // `@` -> src, so features import each other with stable, locatable paths.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Bind IPv4 explicitly so wait-on (tcp:127.0.0.1) and Electron resolve it on Windows,
    // where 'localhost' can otherwise bind only to IPv6 (::1).
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
