import { createServer, type IncomingMessage, type Server } from 'node:http'
import { isIPv6 } from 'node:net'
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

export function isUrbanHealthPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return normalized === '/api/urban/health' || /^\/[^/]+\/api\/urban\/health$/.test(normalized)
}

export type UrbanProxyResult = { status: number; body: unknown } | 'next'

/** Largest upstream body the proxy will read. Urban Dictionary pages are well under this. */
export const MAX_UPSTREAM_BYTES = 1024 * 1024

async function readJsonCapped(response: Response, limit = MAX_UPSTREAM_BYTES): Promise<unknown> {
  const declared = Number(response.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > limit) throw new Error('upstream too large')
  if (!response.body) return JSON.parse(await response.text())
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel()
      throw new Error('upstream too large')
    }
    chunks.push(value)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * Rate-limit key for a client address. One IPv6 subscriber usually holds a
 * whole /64, so IPv6 clients share a key per /64 rather than per address.
 */
export function clientKey(address: string | undefined): string {
  if (!address) return 'unknown'
  const mapped = address.toLowerCase().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '')
  if (!isIPv6(mapped)) return mapped
  const bare = mapped.split('%')[0] ?? mapped
  const [head = '', tail = ''] = bare.split('::')
  const left = head ? head.split(':') : []
  const right = bare.includes('::') && tail ? tail.split(':') : []
  const groups = bare.includes('::')
    ? [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right]
    : left
  return `${groups.slice(0, 4).map((g) => Number.parseInt(g || '0', 16).toString(16)).join(':')}::/64`
}

/** Fixed-window request counter keyed by client. Tracks at most `maxKeys` clients. */
export function createRateLimiter(
  limit: number,
  windowMs: number,
  now: () => number = Date.now,
  maxKeys = 10000,
) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return (key: string): boolean => {
    const time = now()
    if (hits.size >= maxKeys && !hits.has(key)) {
      for (const [k, v] of hits) if (v.resetAt <= time) hits.delete(k)
      // Still full: refuse new clients until a window ends rather than grow without bound.
      if (hits.size >= maxKeys) return false
    }
    const current = hits.get(key)
    if (!current || current.resetAt <= time) {
      hits.set(key, { count: 1, resetAt: time + windowMs })
      return true
    }
    current.count += 1
    return current.count <= limit
  }
}

/** Small time-bounded cache so repeated terms do not each hit Urban Dictionary. */
export function createResponseCache(maxEntries: number, ttlMs: number, now: () => number = Date.now) {
  const entries = new Map<string, { body: unknown; expiresAt: number }>()
  return {
    get(key: string): unknown {
      const hit = entries.get(key)
      if (!hit) return undefined
      if (hit.expiresAt <= now()) {
        entries.delete(key)
        return undefined
      }
      return hit.body
    },
    set(key: string, body: unknown): void {
      entries.delete(key)
      entries.set(key, { body, expiresAt: now() + ttlMs })
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value
        if (oldest === undefined) break
        entries.delete(oldest)
      }
    },
  }
}

type MiniResponse = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

export async function handleUrbanRequest(
  url: string,
  method: string,
  fetchImpl: typeof fetch = fetch,
  cache?: ReturnType<typeof createResponseCache>,
  upstreamAllowed: () => boolean = () => true,
): Promise<UrbanProxyResult> {
  let parsed: URL
  try {
    parsed = new URL(url, 'http://localhost')
  } catch {
    return 'next'
  }

  const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
  if (isUrbanHealthPath(pathname)) {
    if (method.toUpperCase() !== 'GET') return { status: 405, body: { error: 'GET only' } }
    return { status: 200, body: { ok: true } }
  }
  if (!isUrbanLookupPath(pathname)) return 'next'
  if (method.toUpperCase() !== 'GET') {
    return { status: 405, body: { error: 'GET only' } }
  }

  const term = parsed.searchParams.get('term')?.trim() ?? ''
  if (!term || term.length > 80) {
    return { status: 400, body: { error: 'missing term' } }
  }

  const cacheKey = term.toLowerCase()
  const cached = cache?.get(cacheKey)
  if (cached !== undefined) return { status: 200, body: cached }
  if (!upstreamAllowed()) return { status: 503, body: { error: 'busy, try again shortly' } }

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
    const body = sanitizeUrbanPayload(await readJsonCapped(response))
    cache?.set(cacheKey, body)
    return { status: 200, body }
  } catch {
    return { status: 502, body: { error: 'upstream failed' } }
  }
}

function send(res: MiniResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(body))
}

function requestOrigin(req: IncomingMessage): string | undefined {
  const value = req.headers.origin
  return Array.isArray(value) ? value[0] : value
}

export function createCorsProxyServer(options?: {
  allowedOrigins?: readonly string[]
  fetchImpl?: typeof fetch
  /** Lookups allowed per client (IPv4 address or IPv6 /64) per minute. */
  ratePerMinute?: number
  /** Calls to Urban Dictionary per minute across all clients. Cache hits do not count. */
  upstreamPerMinute?: number
}): Server {
  const allowed = options?.allowedOrigins ?? DEFAULT_PROXY_ORIGINS
  const fetchImpl = options?.fetchImpl ?? fetch
  const allow = createRateLimiter(options?.ratePerMinute ?? 30, 60_000)
  const upstream = createRateLimiter(options?.upstreamPerMinute ?? 300, 60_000)
  const upstreamAllowed = () => upstream('upstream')
  const cache = createResponseCache(500, 10 * 60_000)
  return createServer((req, res) => {
    const origin = allowedOrigin(requestOrigin(req), allowed)
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Accept')
    }
    res.setHeader('Vary', 'Origin')

    if ((req.method ?? 'GET').toUpperCase() === 'OPTIONS') {
      res.statusCode = origin ? 204 : 403
      res.end()
      return
    }

    let pathname = '/'
    try {
      pathname = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\/+$/, '') || '/'
    } catch {
      // handleUrbanRequest answers malformed URLs with a 404.
    }
    if (isUrbanLookupPath(pathname)) {
      // Browsers always send Origin on a cross-origin fetch. A lookup without an
      // allowed Origin is not from the dictpics page, so it never reaches upstream.
      if (!origin) {
        send(res, 403, { error: 'origin not allowed' })
        return
      }
      if (!allow(clientKey(req.socket.remoteAddress))) {
        res.setHeader('Retry-After', '60')
        send(res, 429, { error: 'too many requests' })
        return
      }
    }

    void handleUrbanRequest(req.url ?? '/', req.method ?? 'GET', fetchImpl, cache, upstreamAllowed).then(
      (result) => {
        if (result === 'next') {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.end('Not found')
          return
        }
        send(res, result.status, result.body)
      },
      () => send(res, 502, { error: 'upstream failed' }),
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
