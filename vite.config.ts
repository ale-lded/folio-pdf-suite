import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // qpdf-wasm è CommonJS ed è importato solo dal worker: includerlo qui evita
  // che in dev Vite lo scopra tardi e ricarichi la pagina al primo utilizzo.
  optimizeDeps: {
    include: ['@neslinesli93/qpdf-wasm'],
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
