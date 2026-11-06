export const URBAN_API = 'https://api.urbandictionary.com/v0/define'

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

export function urbanLookupUrl(term: string): string {
  const url = new URL(URBAN_API)
  url.searchParams.set('term', term)
  return url.toString()
}
