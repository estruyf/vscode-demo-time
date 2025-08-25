import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import autoprefixer from 'autoprefixer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    postcss: {
      plugins: [
        autoprefixer({
          overrideBrowserslist: ['> 1%', 'last 2 versions', 'IE 11', 'Edge 18'],
        }),
      ],
    },
  },
  build: {
    target: 'es2015', // Target older browsers
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Prevent code splitting for better compatibility
        manualChunks: undefined,
      },
    },
  },
});
