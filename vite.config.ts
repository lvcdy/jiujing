import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('i18next')) {
            return 'i18n';
          }
          if (id.includes('xlsx')) {
            return 'xlsx';
          }
          if (id.includes('big.js')) {
            return 'big';
          }
        },
      },
    },
  },

})
