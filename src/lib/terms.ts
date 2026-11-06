/**
 * Suggested headwords. People can also look up any word they type.
 * Definitions are fetched live and must not be stored here.
 */
export const SLANG_TERMS: readonly string[] = [
  'agent of chaos',
  'asshole',
  'bastard',
  'bellend',
  'chaos gremlin',
  'clown',
  'creep',
  'cryptid',
  'delulu',
  'dickhead',
  'dirtbag',
  'douchebag',
  'down bad',
  'dumbass',
  'dumpster fire',
  'failson',
  'feral',
  'goblin',
  'gremlin',
  'himbo',
  'hot mess',
  'knobhead',
  'loose cannon',
  'manchild',
  'menace',
  'muppet',
  'neckbeard',
  'nepo baby',
  'numpty',
  'oxygen thief',
  'pillock',
  'plonker',
  'professional hater',
  'scumbag',
  'shithead',
  'tosser',
  'trash panda',
  'unhinged',
  'walking red flag',
  'wanker',
]

/** Longest term the app will look up. */
export const MAX_TERM_LENGTH = 80

export function pickRandomTerm(rng: () => number = Math.random, avoid?: string): string {
  const pool = SLANG_TERMS.length > 1 && avoid ? SLANG_TERMS.filter((term) => term !== avoid) : SLANG_TERMS
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length))
  const picked = pool[index]
  if (!picked) throw new Error('No terms available')
  return picked
}
