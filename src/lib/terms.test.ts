import { describe, expect, it } from 'vitest'
import { isLikelySlur } from './slurs.ts'
import {
  OWN_WORDING,
  pickRandomTerm,
  SKIP_SLURS_DEFAULT,
  SLANG_TERMS,
  termsForPicker,
} from './terms.ts'

describe('curated terms', () => {
  it('keeps 48 headwords and leaves the slur filter off', () => {
    expect(SLANG_TERMS).toHaveLength(48)
    expect(new Set(SLANG_TERMS.map((term) => term.word)).size).toBe(48)
    expect(SKIP_SLURS_DEFAULT).toBe(false)
    expect(OWN_WORDING).toBe('__custom__')
    expect(SLANG_TERMS.filter((term) => term.likelySlur)).toHaveLength(8)
    expect(termsForPicker(false)).toHaveLength(48)
    expect(termsForPicker(true)).toHaveLength(40)
    expect(termsForPicker(true).every((term) => !term.likelySlur)).toBe(true)
  })

  it('can still draw a flagged term when the filter is off', () => {
    const flagged = new Set(SLANG_TERMS.filter((term) => term.likelySlur).map((term) => term.word))
    const pool = termsForPicker(false)
    let index = 0
    const seen = new Set<string>()
    const rng = () => {
      const value = (index + 0.25) / pool.length
      index += 1
      return value
    }
    for (let step = 0; step < pool.length; step += 1) {
      seen.add(pickRandomTerm(false, rng).word)
    }
    expect(seen.size).toBe(48)
    expect([...seen].some((word) => flagged.has(word))).toBe(true)
  })

  it('skips flagged terms when the filter is on', () => {
    const flagged = new Set(SLANG_TERMS.filter((term) => term.likelySlur).map((term) => term.word))
    const pool = termsForPicker(true)
    let index = 0
    const rng = () => {
      const value = (index + 0.25) / pool.length
      index = (index + 1) % pool.length
      return value
    }
    for (let step = 0; step < 200; step += 1) {
      expect(flagged.has(pickRandomTerm(true, rng).word)).toBe(false)
    }
  })

  it('avoids repeating the current headword', () => {
    const first = termsForPicker(false)[0]
    expect(first).toBeDefined()
    const picked = pickRandomTerm(false, () => 0.001, first?.word)
    expect(picked.word).not.toBe(first?.word)
  })

  it('matches flagged headwords and common inflections, not ordinary words', () => {
    for (const term of SLANG_TERMS) {
      expect(isLikelySlur(term.word)).toBe(term.likelySlur)
    }
    expect(isLikelySlur('Retarded!')).toBe(true)
    expect(isLikelySlur('gremlin')).toBe(false)
    expect(isLikelySlur('assignment')).toBe(false)
    expect(isLikelySlur('spice')).toBe(false)
    expect(isLikelySlur('chaos gremlin')).toBe(false)
  })
})
