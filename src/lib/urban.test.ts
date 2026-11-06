import { describe, expect, it, vi } from 'vitest'
import { publicAsset } from './assets.ts'
import {
  definitionParts,
  LookupUnavailableError,
  pickBestEntry,
  urbanLookupEndpoint,
  urbanLookupRequestUrl,
  urbanPermalink,
} from './urban.ts'
import { lookupTerm } from './lookup.ts'

const permalink = 'https://www.urbandictionary.com/define.php?term=gremlin&defid=2'

describe('urban payloads', () => {
  it('keeps the highest-voted real entry and drops other fields', () => {
    const entry = pickBestEntry({
      list: [
        {
          word: 'gremlin',
          definition: '  FIXTURE_LOW  ',
          example: 'low',
          author: 'low-author',
          permalink,
          thumbs_up: 2,
          thumbs_down: 0,
          defid: 1,
          play_sound_url: 'https://example.invalid/sound.mp3',
        },
        {
          word: 'gremlin',
          definition: 'FIXTURE_HIGH',
          example: '  high example  ',
          author: ' high-author ',
          permalink,
          thumbs_up: 9,
          thumbs_down: 1,
          defid: 2,
        },
      ],
    })
    expect(entry).toEqual({
      word: 'gremlin',
      definition: 'FIXTURE_HIGH',
      example: 'high example',
      author: 'high-author',
      permalink,
      thumbsUp: 9,
    })
  })

  it('breaks ties toward fewer downvotes', () => {
    const entry = pickBestEntry({
      list: [
        {
          word: 'gremlin',
          definition: 'FIXTURE_DOWN',
          example: '',
          author: 'a',
          permalink,
          thumbs_up: 4,
          thumbs_down: 3,
          defid: 2,
        },
        {
          word: 'gremlin',
          definition: 'FIXTURE_UP',
          example: '',
          author: 'b',
          permalink,
          thumbs_up: 4,
          thumbs_down: 0,
          defid: 8,
        },
      ],
    })
    expect(entry?.definition).toBe('FIXTURE_UP')
  })

  it('returns null when nothing defines the word', () => {
    expect(pickBestEntry({ list: [] })).toBeNull()
    expect(pickBestEntry({ list: [{ definition: '   ', thumbs_up: 3 }] })).toBeNull()
    expect(pickBestEntry(null)).toBeNull()
  })

  it('only links back to Urban Dictionary', () => {
    expect(urbanPermalink(permalink)).toBe(permalink)
    expect(urbanPermalink('http://urbandictionary.com/define.php?term=gremlin')).toBeNull()
    expect(urbanPermalink('https://user@www.urbandictionary.com/define.php?term=gremlin')).toBeNull()
    expect(urbanPermalink('https://evil.example/define')).toBeNull()
    expect(urbanPermalink('javascript:alert(1)')).toBeNull()
    expect(urbanPermalink('not a url')).toBeNull()
  })

  it('keeps Pages lookups on your proxy instead of calling Urban Dictionary from the browser', () => {
    expect(urbanLookupEndpoint({ baseUrl: '/' })).toBe('/api/urban')
    expect(urbanLookupEndpoint({ baseUrl: '/dictpics/' })).toBe('/dictpics/api/urban')
    expect(urbanLookupRequestUrl('chaos gremlin', '/dictpics/api/urban')).toBe(
      '/dictpics/api/urban?term=chaos+gremlin',
    )
    expect(
      urbanLookupRequestUrl('gremlin', urbanLookupEndpoint({
        baseUrl: '/dictpics/',
        configured: 'https://proxy.example/api/urban',
      })),
    ).toBe('https://proxy.example/api/urban?term=gremlin')
    expect(publicAsset('logo.webp', '/dictpics/')).toBe('/dictpics/logo.webp')
    expect(() =>
      urbanLookupEndpoint({ baseUrl: '/', configured: 'https://api.urbandictionary.com/v0/define' }),
    ).toThrow(LookupUnavailableError)
    expect(() => urbanLookupEndpoint({ baseUrl: '/', configured: 'javascript:alert(1)' })).toThrow(
      LookupUnavailableError,
    )
    expect(() =>
      urbanLookupEndpoint({ baseUrl: '/', configured: 'https://user:secret@proxy.example/api/urban' }),
    ).toThrow(LookupUnavailableError)
    expect(() =>
      urbanLookupEndpoint({ baseUrl: '/', configured: 'https://proxy.example/api/urban?token=secret' }),
    ).toThrow(LookupUnavailableError)
    expect(() => urbanLookupEndpoint({ baseUrl: '/', configured: 'http://proxy.example/api/urban' })).toThrow(
      LookupUnavailableError,
    )
    expect(urbanLookupEndpoint({ baseUrl: '/', configured: 'http://127.0.0.1:8787/api/urban' })).toBe(
      'http://127.0.0.1:8787/api/urban',
    )
  })

  it('does not send the headword when no local proxy answers', async () => {
    const fetchImpl = vi.fn(async (_input: Parameters<typeof fetch>[0]) => new Response('<html>missing</html>', {
      status: 404,
      headers: { 'content-type': 'text/html' },
    }))
    await expect(lookupTerm('gremlin', undefined, fetchImpl as typeof fetch, { baseUrl: '/dictpics/' })).rejects.toBeInstanceOf(
      LookupUnavailableError,
    )
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('/dictpics/api/urban/health')
    expect(String(fetchImpl.mock.calls[0]?.[0])).not.toContain('term=')
  })

  it('sends the headword only after the local proxy identifies itself', async () => {
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input)
      if (url.endsWith('/api/urban/health')) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      expect(url).not.toContain('urbandictionary.com')
      return Response.json({
        list: [{
          word: 'gremlin',
          definition: 'FIXTURE_FROM_PROXY',
          example: '',
          author: 'fixture',
          permalink: 'https://www.urbandictionary.com/define.php?term=gremlin&defid=1',
          thumbs_up: 1,
          thumbs_down: 0,
          defid: 1,
        }],
      })
    })
    const entry = await lookupTerm('gremlin', undefined, fetchImpl as typeof fetch, { baseUrl: '/' })
    expect(entry?.definition).toBe('FIXTURE_FROM_PROXY')
    expect(fetchImpl.mock.calls.map((call) => String(call[0]))).toEqual([
      '/api/urban/health',
      '/api/urban?term=gremlin',
    ])
  })

  it('uses a configured https proxy without probing', async () => {
    const fetchImpl = vi.fn(async (_input: Parameters<typeof fetch>[0]) => Response.json({ list: [] }))
    await lookupTerm('gremlin', undefined, fetchImpl as typeof fetch, {
      baseUrl: '/dictpics/',
      configured: 'https://proxy.example/api/urban',
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('https://proxy.example/api/urban?term=gremlin')
  })

  it('turns bracketed words into linked text without dropping them', () => {
    expect(definitionParts('A [small] pest.')).toEqual([
      { type: 'text', value: 'A ' },
      { type: 'linked', value: 'small' },
      { type: 'text', value: ' pest.' },
    ])
  })
})
