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
  mode: 'lookup' as const,
  term: '',
  customTerm: '',
  customDefinition: '',
  name: '',
  photo: null,
  status: 'idle' as const,
  entry: null,
}

describe('deriveModel', () => {
  it('shows a live entry once it has loaded', () => {
    expect(deriveModel({ ...base, term: 'gremlin', status: 'ready', entry })).toMatchObject({
      kind: 'urban',
      term: 'gremlin',
    })
    expect(deriveModel({ ...base, term: 'gremlin', status: 'loading' }).kind).toBe('loading')
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

})
