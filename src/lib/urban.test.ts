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
    expect(urbanPermalink('http://urbandictionary.com/define.php?term=gremlin')).toBe(
      'http://urbandictionary.com/define.php?term=gremlin',
    )
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
  })

  it('treats a static-host miss as unavailable instead of inventing a definition', async () => {
    const fetchImpl = vi.fn(async (_input: Parameters<typeof fetch>[0]) => new Response('<html>missing</html>', {
      status: 404,
      headers: { 'content-type': 'text/html' },
    }))
    await expect(lookupTerm('gremlin', undefined, fetchImpl as typeof fetch)).rejects.toBeInstanceOf(
      LookupUnavailableError,
    )
    expect(String(fetchImpl.mock.calls[0]?.[0])).toMatch(/\/api\/urban\?term=gremlin$/)
    expect(String(fetchImpl.mock.calls[0]?.[0])).not.toContain('urbandictionary.com')
  })

  it('turns bracketed words into linked text without dropping them', () => {
    expect(definitionParts('A [small] pest.')).toEqual([
      { type: 'text', value: 'A ' },
      { type: 'linked', value: 'small' },
      { type: 'text', value: ' pest.' },
    ])
  })
})
