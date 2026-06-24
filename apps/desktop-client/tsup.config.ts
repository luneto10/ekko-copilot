import { defineConfig } from 'tsup';

// Bundles the Electron main process + preload to CommonJS.
// @workiq/types resolves to TypeScript source, so it must be inlined (noExternal).
// electron + native node deps stay external (resolved from node_modules at runtime).
export default defineConfig({
  entry: {
    main: 'src/main.ts',
    preload: 'src/preload.ts',
  },
  outDir: 'dist',
  format: ['cjs'],
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  noExternal: ['@workiq/types'],
  clean: true,
  sourcemap: true,
  shims: false,
});
