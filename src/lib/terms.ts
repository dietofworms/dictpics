/**
 * Curated headwords only. Definitions are fetched live and must not be stored here.
 * `likelySlur` terms stay in the list while "Skip likely slurs" is off.
 */
export type SlangTerm = {
  word: string
  likelySlur: boolean
}

export const SKIP_SLURS_DEFAULT = false

export const OWN_WORDING = '__custom__'

export const SLANG_TERMS: readonly SlangTerm[] = [
  { word: 'agent of chaos', likelySlur: false },
  { word: 'asshole', likelySlur: false },
  { word: 'bastard', likelySlur: false },
  { word: 'bellend', likelySlur: false },
  { word: 'chaos gremlin', likelySlur: false },
  { word: 'clown', likelySlur: false },
  { word: 'creep', likelySlur: false },
  { word: 'cryptid', likelySlur: false },
  { word: 'delulu', likelySlur: false },
  { word: 'dickhead', likelySlur: false },
  { word: 'dirtbag', likelySlur: false },
  { word: 'douchebag', likelySlur: false },
  { word: 'down bad', likelySlur: false },
  { word: 'dumbass', likelySlur: false },
  { word: 'dumpster fire', likelySlur: false },
  { word: 'dyke', likelySlur: true },
  { word: 'faggot', likelySlur: true },
  { word: 'failson', likelySlur: false },
  { word: 'feral', likelySlur: false },
  { word: 'goblin', likelySlur: false },
  { word: 'gremlin', likelySlur: false },
  { word: 'himbo', likelySlur: false },
  { word: 'homo', likelySlur: true },
  { word: 'hot mess', likelySlur: false },
  { word: 'knobhead', likelySlur: false },
  { word: 'loose cannon', likelySlur: false },
  { word: 'manchild', likelySlur: false },
  { word: 'menace', likelySlur: false },
  { word: 'midget', likelySlur: true },
  { word: 'muppet', likelySlur: false },
  { word: 'neckbeard', likelySlur: false },
  { word: 'nepo baby', likelySlur: false },
  { word: 'numpty', likelySlur: false },
  { word: 'oxygen thief', likelySlur: false },
  { word: 'pikey', likelySlur: true },
  { word: 'pillock', likelySlur: false },
  { word: 'plonker', likelySlur: false },
  { word: 'professional hater', likelySlur: false },
  { word: 'retard', likelySlur: true },
  { word: 'scumbag', likelySlur: false },
  { word: 'shithead', likelySlur: false },
  { word: 'spaz', likelySlur: true },
  { word: 'tosser', likelySlur: false },
  { word: 'tranny', likelySlur: true },
  { word: 'trash panda', likelySlur: false },
  { word: 'unhinged', likelySlur: false },
  { word: 'walking red flag', likelySlur: false },
  { word: 'wanker', likelySlur: false },
]

export function termsForPicker(skipSlurs: boolean): SlangTerm[] {
  const pool = skipSlurs ? SLANG_TERMS.filter((term) => !term.likelySlur) : SLANG_TERMS
  return [...pool].sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }))
}

export function pickRandomTerm(
  skipSlurs: boolean,
  rng: () => number = Math.random,
  avoid?: string,
): SlangTerm {
  let pool = termsForPicker(skipSlurs)
  if (pool.length === 0) {
    throw new Error('No terms available')
  }
  if (avoid && pool.length > 1) {
    const withoutCurrent = pool.filter((term) => term.word !== avoid)
    if (withoutCurrent.length > 0) pool = withoutCurrent
  }
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length))
  const picked = pool[index]
  if (!picked) throw new Error('No terms available')
  return picked
}
