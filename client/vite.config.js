import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import postcssPxToViewport from 'postcss-px-to-viewport-8-plugin';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        postcssPxToViewport({
          viewportWidth: 375,
          unitPrecision: 5,
          viewportUnit: 'vw',
          selectorBlackList: ['.ignore-vw'],
          minPixelValue: 1,
          mediaQuery: false,
        }),
      ],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
});
