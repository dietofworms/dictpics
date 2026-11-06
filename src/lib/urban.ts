export const URBAN_API = 'https://api.urbandictionary.com/v0/define'

/** Shown when a static host cannot reach Urban Dictionary. Never a stand-in definition. */
export const STATIC_HOST_LOOKUP_MESSAGE =
  'Live lookup is not available on this static host. GitHub Pages cannot run the proxy, and Urban Dictionary does not allow browser calls. No definition was invented.'

export class LookupUnavailableError extends Error {
  constructor() {
    super('lookup unavailable')
    this.name = 'LookupUnavailableError'
  }
}

export type UrbanListItem = {
  word: string
  definition: string
  example: string
  author: string
  permalink: string
  thumbs_up: number
  thumbs_down: number
  defid: number
}

export type UrbanEntry = {
  word: string
  definition: string
  example: string
  author: string
  permalink: string | null
  thumbsUp: number
}

export type TextPart = { type: 'text' | 'linked'; value: string }

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function sanitizeUrbanPayload(data: unknown): { list: UrbanListItem[] } {
  const list =
    data && typeof data === 'object' && Array.isArray((data as { list?: unknown }).list)
      ? (data as { list: unknown[] }).list
      : []
  return {
    list: list.map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      return {
        word: asString(record.word),
        definition: asString(record.definition),
        example: asString(record.example),
        author: asString(record.author),
        permalink: asString(record.permalink),
        thumbs_up: asNumber(record.thumbs_up),
        thumbs_down: asNumber(record.thumbs_down),
        defid: asNumber(record.defid),
      }
    }),
  }
}

export function urbanPermalink(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    if (host !== 'urbandictionary.com' && host !== 'www.urbandictionary.com') return null
    return url.toString()
  } catch {
    return null
  }
}

export function pickBestEntry(data: unknown): UrbanEntry | null {
  const ranked = sanitizeUrbanPayload(data)
    .list.filter((item) => item.definition.trim().length > 0)
    .sort((a, b) => {
      if (b.thumbs_up !== a.thumbs_up) return b.thumbs_up - a.thumbs_up
      if (a.thumbs_down !== b.thumbs_down) return a.thumbs_down - b.thumbs_down
      return a.defid - b.defid
    })
  const best = ranked[0]
  if (!best) return null
  return {
    word: best.word,
    definition: best.definition.trim(),
    example: best.example.trim(),
    author: best.author.trim(),
    permalink: urbanPermalink(best.permalink),
    thumbsUp: best.thumbs_up,
  }
}

export function definitionParts(text: string): TextPart[] {
  const parts: TextPart[] = []
  const pattern = /\[([^\]\n]{1,80})\]/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) parts.push({ type: 'text', value: text.slice(last, index) })
    parts.push({ type: 'linked', value: match[1] ?? '' })
    last = index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  if (parts.length === 0) parts.push({ type: 'text', value: text })
  return parts
}

export function urbanLookupEndpoint(env: { baseUrl: string; configured?: string }): string {
  const configured = env.configured?.trim()
  if (configured) {
    let url: URL
    try {
      url = new URL(configured)
    } catch {
      throw new LookupUnavailableError()
    }
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new LookupUnavailableError()
    if (url.username || url.password || url.search || url.hash) throw new LookupUnavailableError()
    if (url.hostname.toLowerCase() === 'api.urbandictionary.com') throw new LookupUnavailableError()
    return url.toString()
  }
  const base = env.baseUrl.endsWith('/') ? env.baseUrl : `${env.baseUrl}/`
  return `${base}api/urban`
}

export function assertPublishableLookupUrl(value: string | undefined): void {
  const trimmed = value?.trim()
  if (!trimmed) return
  const reject = () => {
    throw new Error(
      'VITE_URBAN_LOOKUP_URL must be an https URL with no username, password, query, or hash, and must not be the Urban Dictionary API',
    )
  }
  try {
    urbanLookupEndpoint({ baseUrl: '/', configured: trimmed })
  } catch {
    reject()
  }
  if (new URL(trimmed).protocol !== 'https:') reject()
}

export function urbanLookupRequestUrl(term: string, endpoint: string): string {
  const absolute = /^https?:\/\//i.test(endpoint)
  const url = absolute ? new URL(endpoint) : new URL(endpoint, 'http://dictpics.local')
  url.searchParams.set('term', term)
  if (!absolute) return `${url.pathname}${url.search}`
  return url.toString()
}

