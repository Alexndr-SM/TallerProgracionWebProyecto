import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/island.jsx', import.meta.url)),
      formats: ['es'],
      fileName: () => 'admin-dashboard.js',
      cssFileName: 'admin-dashboard',
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
