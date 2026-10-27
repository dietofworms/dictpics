import { describe, expect, it } from 'vitest'
import { guideWords, pageNumberFor } from './dictionary.ts'

describe('dictionary page furniture', () => {
  it('uses the headword for both guide words when there is no name', () => {
    expect(guideWords('gremlin', '')).toEqual({ left: 'GREMLIN', right: 'GREMLIN' })
    expect(guideWords('walking red flag', '')).toEqual({ left: 'FLAG', right: 'WALKING' })
  })

  it('sorts the name and the headword into guide words', () => {
    expect(guideWords('gremlin', 'Steve')).toEqual({ left: 'GREMLIN', right: 'STEVE' })
  })

  it('leaves the guides blank when there is nothing to set', () => {
    expect(guideWords('   ', '  ')).toEqual({ left: '—', right: '—' })
  })

  it('picks a stable page number in dictionary range', () => {
    const page = pageNumberFor('gremlin', 'Steve')
    expect(pageNumberFor('gremlin', 'Steve')).toBe(page)
    expect(page).toBeGreaterThanOrEqual(40)
    expect(page).toBeLessThanOrEqual(899)
    expect(pageNumberFor('gremlin', '')).not.toBe(pageNumberFor('menace', ''))
    expect(pageNumberFor('gremlin', 'Steve')).not.toBe(pageNumberFor('gremlin', ''))
  })
})
