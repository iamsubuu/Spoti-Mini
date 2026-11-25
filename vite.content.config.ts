import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const rootDir = import.meta.dirname;

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(rootDir, 'src/content/index.ts'),
      name: 'SpotifyMiniContent',
      formats: ['iife'],
      fileName: () => 'content.js',
      cssFileName: 'pip',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
