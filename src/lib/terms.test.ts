import { describe, expect, it } from 'vitest'
import { pickRandomTerm, SLANG_TERMS } from './terms.ts'

describe('suggested terms', () => {
  it('keeps 40 unique headwords', () => {
    expect(SLANG_TERMS).toHaveLength(40)
    expect(new Set(SLANG_TERMS).size).toBe(40)
  })

  it('can draw every suggested term', () => {
    const seen = new Set<string>()
    SLANG_TERMS.forEach((_, index) => {
      seen.add(pickRandomTerm(() => (index + 0.25) / SLANG_TERMS.length))
    })
    expect(seen.size).toBe(SLANG_TERMS.length)
  })

  it('avoids repeating the current headword', () => {
    const first = SLANG_TERMS[0]
    expect(pickRandomTerm(() => 0.001, first)).not.toBe(first)
  })
})
