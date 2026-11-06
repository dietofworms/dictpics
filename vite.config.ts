import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { createUrbanMiddleware } from './server/urbanProxy.ts'

const root = fileURLToPath(new URL('.', import.meta.url))

/** Project Pages URL is https://dietofworms.github.io/dictpics/ */
export const PAGES_BASE_PATH = '/dictpics/'

function productionBase(): string {
  const configured = process.env.DICTPICS_BASE_PATH?.trim()
  const value = configured && configured.length > 0 ? configured : PAGES_BASE_PATH
  return value.endsWith('/') ? value : `${value}/`
}

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? productionBase() : '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'dictpics-urban-proxy',
      configureServer(server) {
        server.middlewares.use(createUrbanMiddleware())
      },
      configurePreviewServer(server) {
        server.middlewares.use(createUrbanMiddleware())
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
}))
