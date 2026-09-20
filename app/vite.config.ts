import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@keycloaked/ui': path.resolve(import.meta.dirname, '../packages/ui/src'),
    },
  },
})
