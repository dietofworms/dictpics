import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { createCorsProxyServer, createUrbanMiddleware, handleUrbanRequest } from './urbanProxy.ts'

const upstreamList = {
  list: [
    {
      word: 'gremlin',
      definition: 'FIXTURE_FROM_UPSTREAM',
      example: 'fixture example',
      author: 'fixture-author',
      permalink: 'https://www.urbandictionary.com/define.php?term=gremlin&defid=4',
      thumbs_up: 5,
      thumbs_down: 1,
      defid: 4,
      play_sound_url: 'https://example.invalid/nope.mp3',
      current_vote: '',
    },
  ],
}

describe('urban proxy', () => {
  it('asks the live Urban Dictionary API and returns only entry fields', async () => {
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(String(input))
      expect(`${url.origin}${url.pathname}`).toBe('https://api.urbandictionary.com/v0/define')
      expect(url.searchParams.get('term')).toBe('chaos gremlin')
      return Response.json(upstreamList)
    })
    const result = await handleUrbanRequest('/api/urban?term=chaos%20gremlin', 'GET', fetchImpl)
    expect(result).toEqual({
      status: 200,
      body: {
        list: [
          {
            word: 'gremlin',
            definition: 'FIXTURE_FROM_UPSTREAM',
            example: 'fixture example',
            author: 'fixture-author',
            permalink: 'https://www.urbandictionary.com/define.php?term=gremlin&defid=4',
            thumbs_up: 5,
            thumbs_down: 1,
            defid: 4,
          },
        ],
      },
    })
  })

  it('rejects a missing term and a failed upstream', async () => {
    const fetchImpl = vi.fn()
    expect(await handleUrbanRequest('/api/urban', 'GET', fetchImpl)).toEqual({
      status: 400,
      body: { error: 'missing term' },
    })
    expect(await handleUrbanRequest('/api/urban?term=%20%20', 'GET', fetchImpl)).toMatchObject({ status: 400 })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(await handleUrbanRequest('/api/urban?term=gremlin', 'POST', fetchImpl)).toMatchObject({ status: 405 })
    const failing = vi.fn(async () => new Response('nope', { status: 503 }))
    expect(await handleUrbanRequest('/api/urban?term=gremlin', 'GET', failing)).toEqual({
      status: 502,
      body: { error: 'upstream failed' },
    })
    const throwing = vi.fn(async () => {
      throw new Error('offline')
    })
    expect(await handleUrbanRequest('/api/urban?term=gremlin', 'GET', throwing)).toMatchObject({ status: 502 })
  })

  it('accepts the Pages base path and still calls only Urban Dictionary', async () => {
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(String(input))
      expect(`${url.origin}${url.pathname}`).toBe('https://api.urbandictionary.com/v0/define')
      expect(url.searchParams.get('term')).toBe('gremlin')
      expect(url.searchParams.get('url')).toBeNull()
      return Response.json(upstreamList)
    })
    const result = await handleUrbanRequest(
      '/dictpics/api/urban?term=gremlin&url=https://evil.example',
      'GET',
      fetchImpl,
    )
    expect(result).toMatchObject({ status: 200 })
  })

  it('allows the Pages origin and does not open the proxy to other sites', async () => {
    const fetchImpl = vi.fn(async () => Response.json(upstreamList)) as typeof fetch
    const server = createCorsProxyServer({
      allowedOrigins: ['https://dietofworms.github.io'],
      fetchImpl,
    })
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const base = `http://127.0.0.1:${address.port}`
    try {
      const ok = await fetch(`${base}/api/urban?term=gremlin`, {
        headers: { Origin: 'https://dietofworms.github.io', Accept: 'application/json' },
      })
      expect(ok.status).toBe(200)
      expect(ok.headers.get('access-control-allow-origin')).toBe('https://dietofworms.github.io')
      expect(ok.headers.get('access-control-allow-credentials')).toBeNull()
      const body = (await ok.json()) as { list: Array<{ definition: string }> }
      expect(body.list[0]?.definition).toBe('FIXTURE_FROM_UPSTREAM')

      const blocked = await fetch(`${base}/api/urban?term=gremlin`, {
        headers: { Origin: 'https://evil.example' },
      })
      expect(blocked.headers.get('access-control-allow-origin')).toBeNull()

      const preflight = await fetch(`${base}/api/urban?term=gremlin`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://dietofworms.github.io' },
      })
      expect(preflight.status).toBe(204)
      expect(preflight.headers.get('access-control-allow-origin')).toBe('https://dietofworms.github.io')

      const evilPreflight = await fetch(`${base}/api/urban`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example' },
      })
      expect(evilPreflight.status).toBe(403)
      expect(evilPreflight.headers.get('access-control-allow-origin')).toBeNull()
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    }
  })

  it('answers a health check without calling Urban Dictionary', async () => {
    const fetchImpl = vi.fn()
    expect(await handleUrbanRequest('/dictpics/api/urban/health', 'GET', fetchImpl)).toEqual({
      status: 200,
      body: { ok: true },
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('ignores every other path', async () => {
    const fetchImpl = vi.fn()
    expect(await handleUrbanRequest('/logo.webp', 'GET', fetchImpl)).toBe('next')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('writes a no-store JSON response from the middleware', async () => {
    const fetchImpl = vi.fn(async () => Response.json(upstreamList))
    const middleware = createUrbanMiddleware(fetchImpl)
    const headers: Record<string, string> = {}
    const res = {
      statusCode: 0,
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value
      },
      end(body?: string) {
        this.body = body ?? ''
      },
      body: '',
    }
    await middleware(
      { url: '/api/urban?term=gremlin', method: 'GET' } as IncomingMessage,
      res as unknown as ServerResponse,
      () => {
        throw new Error('should handle the api path')
      },
    )
    expect(res.statusCode).toBe(200)
    expect(headers['cache-control']).toBe('no-store')
    expect(headers['content-type']).toContain('application/json')
    expect(JSON.parse(res.body).list[0].definition).toBe('FIXTURE_FROM_UPSTREAM')
  })
})
