import type { Connect } from 'vite'
import { sanitizeUrbanPayload, URBAN_API } from '../src/lib/urban.ts'

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

  const pathname = parsed.pathname.replace(/\/$/, '') || '/'
  if (pathname !== '/api/urban') return 'next'
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
