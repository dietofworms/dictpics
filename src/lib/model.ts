import type { UrbanEntry } from './urban.ts'

export type LookupStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error'
export type EntryMode = 'lookup' | 'custom'

type Plate = { term: string; name: string; photo: string | null }

export type PageModel =
  | { kind: 'empty' }
  | ({ kind: 'loading' } & Plate)
  | ({ kind: 'missing' } & Plate)
  | ({ kind: 'error' } & Plate)
  | ({ kind: 'custom'; definition: string } & Plate)
  | ({ kind: 'urban'; entry: UrbanEntry } & Plate)

export function deriveModel(input: {
  mode: EntryMode
  term: string
  customTerm: string
  customDefinition: string
  name: string
  photo: string | null
  status: LookupStatus
  entry: UrbanEntry | null
}): PageModel {
  const name = input.name.trim()
  const photo = input.photo

  if (input.mode === 'custom') {
    const term = input.customTerm.trim()
    const definition = input.customDefinition.trim()
    if (!term) return { kind: 'empty' }
    return { kind: 'custom', term, name, photo, definition }
  }

  const term = input.term.trim()
  if (!term) return { kind: 'empty' }
  if (input.status === 'ready' && input.entry) {
    return { kind: 'urban', term, name, photo, entry: input.entry }
  }
  if (input.status === 'error') return { kind: 'error', term, name, photo }
  if (input.status === 'missing') return { kind: 'missing', term, name, photo }
  return { kind: 'loading', term, name, photo }
}
