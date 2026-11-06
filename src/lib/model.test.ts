import { describe, expect, it } from 'vitest'
import { deriveModel } from './model.ts'
import type { UrbanEntry } from './urban.ts'

const entry: UrbanEntry = {
  word: 'gremlin',
  definition: 'FIXTURE_DEFINITION',
  example: '',
  author: 'fixture-author',
  permalink: 'https://www.urbandictionary.com/define.php?term=gremlin&defid=1',
  thumbsUp: 3,
}

const base = {
  mode: 'curated' as const,
  term: '',
  customTerm: '',
  customDefinition: '',
  name: '',
  photo: null,
  skipSlurs: false,
  status: 'idle' as const,
  entry: null,
}

describe('deriveModel', () => {
  it('shows a live entry only when the filter is off or the word is not flagged', () => {
    expect(deriveModel({ ...base, term: 'retard', status: 'ready', entry })).toMatchObject({
      kind: 'urban',
      term: 'retard',
    })
    expect(deriveModel({ ...base, term: 'retard', skipSlurs: true, status: 'ready', entry }).kind).toBe(
      'skipped',
    )
  })

  it('uses your wording without pretending it came from Urban Dictionary', () => {
    expect(
      deriveModel({
        ...base,
        mode: 'custom',
        customTerm: 'snack goblin',
        customDefinition: 'A person who raids the pantry.',
      }),
    ).toMatchObject({
      kind: 'custom',
      term: 'snack goblin',
      definition: 'A person who raids the pantry.',
    })
  })

  it('does not invent a definition when the static host cannot look one up', () => {
    expect(deriveModel({ ...base, term: 'gremlin', status: 'unavailable' })).toMatchObject({
      kind: 'unavailable',
      term: 'gremlin',
    })
  })

  it('skips your wording when the filter is on', () => {
    expect(
      deriveModel({
        ...base,
        mode: 'custom',
        customTerm: 'retard',
        customDefinition: 'nope',
        skipSlurs: true,
      }).kind,
    ).toBe('skipped')
  })
})
