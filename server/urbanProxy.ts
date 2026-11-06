import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { Connect } from 'vite'
import { sanitizeUrbanPayload, URBAN_API } from '../src/lib/urban.ts'

export const DEFAULT_PROXY_ORIGINS = [
  'https://dietofworms.github.io',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
] as const

export function parseAllowedOrigins(value: string | undefined): string[] {
  const raw = value?.trim()
  if (!raw) return [...DEFAULT_PROXY_ORIGINS]
  return raw.split(',').map((item) => item.trim()).filter(Boolean)
}

export function allowedOrigin(requestOrigin: string | undefined, allowed: readonly string[]): string | null {
  if (!requestOrigin) return null
  return allowed.includes(requestOrigin) ? requestOrigin : null
}

export function isUrbanLookupPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return normalized === '/api/urban' || /^\/[^/]+\/api\/urban$/.test(normalized)
}

export type UrbanProxyResult = { status: number; body: unknown } | 'next'

type MiniResponse = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

export async function handleUrbanRequest(
  url: string,
  method: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UrbanProxyResult> {
  let parsed: URL
  try {
    parsed = new URL(url, 'http://localhost')
  } catch {
    return 'next'
  }

  const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
  if (!isUrbanLookupPath(pathname)) return 'next'
  if (method.toUpperCase() !== 'GET') {
    return { status: 405, body: { error: 'GET only' } }
  }

  const term = parsed.searchParams.get('term')?.trim() ?? ''
  if (!term || term.length > 80) {
    return { status: 400, body: { error: 'missing term' } }
  }

  try {
    const upstream = new URL(URBAN_API)
    upstream.searchParams.set('term', term)
    const response = await fetchImpl(upstream, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'dictpics/2.0',
      },
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return { status: 502, body: { error: 'upstream failed' } }
    const payload: unknown = await response.json()
    return { status: 200, body: sanitizeUrbanPayload(payload) }
  } catch {
    return { status: 502, body: { error: 'upstream failed' } }
  }
}

function send(res: MiniResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function requestOrigin(req: IncomingMessage): string | undefined {
  const value = req.headers.origin
  return Array.isArray(value) ? value[0] : value
}

export function createCorsProxyServer(options?: {
  allowedOrigins?: readonly string[]
  fetchImpl?: typeof fetch
}): Server {
  const allowed = options?.allowedOrigins ?? DEFAULT_PROXY_ORIGINS
  const fetchImpl = options?.fetchImpl ?? fetch
  return createServer((req, res) => {
    const origin = allowedOrigin(requestOrigin(req), allowed)
    const writeCors = () => {
      if (!origin) return
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Accept')
    }
    if ((req.method ?? 'GET').toUpperCase() === 'OPTIONS') {
      writeCors()
      res.statusCode = origin ? 204 : 403
      res.end()
      return
    }
    void handleUrbanRequest(req.url ?? '/', req.method ?? 'GET', fetchImpl).then(
      (result) => {
        writeCors()
        if (result === 'next') {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('Not found')
          return
        }
        res.statusCode = result.status
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(result.body))
      },
      () => {
        writeCors()
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify({ error: 'upstream failed' }))
      },
    )
  })
}

export function createUrbanMiddleware(fetchImpl: typeof fetch = fetch): Connect.NextHandleFunction {
  return (req, res, next) => {
    return handleUrbanRequest(req.url ?? '/', req.method ?? 'GET', fetchImpl).then(
      (result) => {
        if (result === 'next') {
          next()
          return
        }
        send(res, result.status, result.body)
      },
      () => {
        send(res, 502, { error: 'upstream failed' })
      },
    )
  }
}
