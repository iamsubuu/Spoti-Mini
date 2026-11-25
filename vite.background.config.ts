import path from 'path';
import { defineConfig } from 'vite';

const rootDir = import.meta.dirname;

export default defineConfig({
  publicDir: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, '.'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(rootDir, 'src/background/index.ts'),
      name: 'SpotifyMiniBackground',
      formats: ['es'],
      fileName: () => 'background.js',
    },
  },
});
