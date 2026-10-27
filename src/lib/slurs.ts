import { SLANG_TERMS } from './terms.ts'

/** Inflections and other likely slurs. Used only to skip wording, never as definitions. */
const EXTRA_LIKELY_SLURS = [
  'beaner',
  'beaners',
  'chink',
  'chinks',
  'dykes',
  'fags',
  'faggots',
  'gook',
  'gooks',
  'homos',
  'kike',
  'kikes',
  'midgets',
  'nigga',
  'niggas',
  'nigger',
  'niggers',
  'pikeys',
  'raghead',
  'ragheads',
  'retarded',
  'retards',
  'shemale',
  'shemales',
  'spastic',
  'spastics',
  'spazzy',
  'spic',
  'spics',
  'towelhead',
  'towelheads',
  'trannies',
  'trannys',
  'wetback',
  'wetbacks',
]

function tokensOf(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function likelySlurTokens(): Set<string> {
  const tokens = new Set<string>()
  const add = (value: string) => {
    const parts = tokensOf(value)
    for (const part of parts) tokens.add(part)
    if (parts.length > 1) tokens.add(parts.join(''))
  }
  for (const term of SLANG_TERMS) {
    if (term.likelySlur) add(term.word)
  }
  for (const extra of EXTRA_LIKELY_SLURS) add(extra)
  return tokens
}

const FLAGGED = likelySlurTokens()

export function isLikelySlur(value: string): boolean {
  const parts = tokensOf(value)
  if (parts.length === 0) return false
  if (FLAGGED.has(parts.join(''))) return true
  return parts.some((part) => FLAGGED.has(part))
}
