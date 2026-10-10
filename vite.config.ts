import { defineConfig } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'version-service-worker',
    apply: 'build',
    closeBundle() {
      writeFileSync('dist/sw.js', readFileSync('public/sw.js', 'utf8').replace('__BUILD_ID__', randomUUID()));
    },
  }],
})
