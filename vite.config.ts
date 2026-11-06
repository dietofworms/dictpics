import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { createUrbanMiddleware } from './server/urbanProxy.ts'
import { assertPublishableLookupUrl } from './src/lib/urban.ts'

const root = fileURLToPath(new URL('.', import.meta.url))

/** Project Pages URL is https://dietofworms.github.io/dictpics/ */
export const PAGES_BASE_PATH = '/dictpics/'

function productionBase(): string {
  const configured = process.env.DICTPICS_BASE_PATH?.trim()
  const value = configured && configured.length > 0 ? configured : PAGES_BASE_PATH
  return value.endsWith('/') ? value : `${value}/`
}

/** Origins the page may fetch from: itself, plus the configured lookup proxy. */
export function connectSources(lookupUrl: string | undefined): string {
  const sources = ["'self'"]
  const trimmed = lookupUrl?.trim()
  if (trimmed) sources.push(new URL(trimmed).origin)
  return sources.join(' ')
}

function productionDocumentPolicy(lookupUrl: string | undefined): Plugin {
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'none'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSources(lookupUrl)}`,
    "worker-src 'self' blob:",
  ].join('; ')
  return {
    name: 'dictpics-document-policy',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.server) return html
        const tags = [
          `<meta http-equiv="Content-Security-Policy" content="${policy}">`,
          `<meta name="referrer" content="no-referrer">`,
          `<meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()">`,
        ].join('\n    ')
        return html.replace('<head>', `<head>\n    ${tags}`)
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const lookupUrl = loadEnv(mode, root, 'VITE_').VITE_URBAN_LOOKUP_URL
  if (mode === 'production') assertPublishableLookupUrl(lookupUrl)
  return {
  base: mode === 'production' ? productionBase() : '/',
  plugins: [
    react(),
    tailwindcss(),
    productionDocumentPolicy(lookupUrl),
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
  }
})
