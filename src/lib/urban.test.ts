import { describe, expect, it, vi } from 'vitest'
import { publicAsset } from './assets.ts'
import { definitionParts, pickBestEntry, urbanLookupUrl, urbanPermalink } from './urban.ts'
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

  it('builds the Urban Dictionary lookup URL with the term encoded', () => {
    expect(urbanLookupUrl('chaos gremlin')).toBe('https://api.urbandictionary.com/v0/define?term=chaos+gremlin')
    expect(urbanLookupUrl('a&b=c#d')).toBe('https://api.urbandictionary.com/v0/define?term=a%26b%3Dc%23d')
    expect(publicAsset('logo.webp', '/dictpics/')).toBe('/dictpics/logo.webp')
  })

  it('asks Urban Dictionary directly, without cookies or a referrer', async () => {
    const fetchImpl = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) =>
      Response.json({
        list: [{
          word: 'gremlin',
          definition: 'FIXTURE_FROM_UPSTREAM',
          example: '',
          author: 'fixture',
          permalink,
          thumbs_up: 1,
          thumbs_down: 0,
          defid: 1,
        }],
      }),
    )
    const entry = await lookupTerm('gremlin', undefined, fetchImpl as typeof fetch)
    expect(entry?.definition).toBe('FIXTURE_FROM_UPSTREAM')
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('https://api.urbandictionary.com/v0/define?term=gremlin')
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
  })

  it('reports a failed lookup instead of inventing a definition', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 503 }))
    await expect(lookupTerm('gremlin', undefined, fetchImpl as typeof fetch)).rejects.toThrow('lookup failed')
  })

  it('turns bracketed words into linked text without dropping them', () => {
    expect(definitionParts('A [small] pest.')).toEqual([
      { type: 'text', value: 'A ' },
      { type: 'linked', value: 'small' },
      { type: 'text', value: ' pest.' },
    ])
  })
})
