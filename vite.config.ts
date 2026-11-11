import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Il commit da cui è costruito il sito: il link "Source code" punta proprio a
// quella versione, come chiede l'AGPL. Su Cloudflare Pages lo fornisce
// CF_PAGES_COMMIT_SHA; in locale lo chiediamo a git; se non c'è nessuno dei
// due usiamo il ramo main.
function currentCommit() {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA

  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'main'
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_COMMIT__: JSON.stringify(currentCommit()),
  },
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
