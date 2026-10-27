import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { createUrbanMiddleware } from './server/urbanProxy.ts'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
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
})
