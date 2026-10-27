import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { createUrbanMiddleware, handleUrbanRequest } from './urbanProxy.ts'

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
