import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { pageNumberFor } from './lib/dictionary.ts'
import { SLANG_TERMS } from './lib/terms.ts'

const high = {
  word: 'gremlin',
  definition: 'A [small] FIXTURE_HIGH pest.',
  example: 'FIXTURE_EXAMPLE',
  author: 'fixture-author',
  permalink: 'https://www.urbandictionary.com/define.php?term=gremlin&defid=9',
  thumbs_up: 8,
  thumbs_down: 0,
  defid: 9,
}

const low = {
  word: 'gremlin',
  definition: 'FIXTURE_LOW should not win.',
  example: '',
  author: 'other',
  permalink: 'https://www.urbandictionary.com/define.php?term=gremlin&defid=1',
  thumbs_up: 1,
  thumbs_down: 0,
  defid: 1,
}

const URBAN = 'https://api.urbandictionary.com/v0/define?term='

function urbanFetch(onTerm: (url: string) => Response | Promise<Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    expect(url.startsWith(URBAN)).toBe(true)
    return onTerm(url)
  })
}

describe('dictpics', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('unexpected fetch'))),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts empty, offers suggestions, and does not look anything up', () => {
    const { container } = render(<App />)
    expect(screen.getByLabelText(/^term$/i)).toHaveValue('')
    expect(container.querySelectorAll('#term-suggestions option')).toHaveLength(SLANG_TERMS.length)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('looks up any word you type on Urban Dictionary', async () => {
    const user = userEvent.setup()
    const fetchMock = urbanFetch((url) => {
      expect(url).toBe(`${URBAN}chaos+muppet`)
      return { ok: true, json: async () => ({ list: [low, high] }) } as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await user.type(screen.getByLabelText(/name/i), 'Steve')
    await user.type(screen.getByLabelText(/^term$/i), 'chaos muppet')
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /look up/i }))
    expect(await screen.findByText('small')).toBeInTheDocument()
    expect(screen.getByText('small').tagName).toBe('EM')
    expect(screen.getByText(/FIXTURE_HIGH/)).toBeInTheDocument()
    expect(screen.queryByText(/FIXTURE_LOW/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'chaos muppet' })).toBeInTheDocument()
    expect(screen.getByText(/Definition: Urban Dictionary/)).toBeInTheDocument()
    expect(screen.getByText(/fixture-author/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view on urban dictionary/i })).toHaveAttribute('href', high.permalink)
    expect(screen.getByText('STEVE')).toBeInTheDocument()
    expect(screen.getByText(String(pageNumberFor('chaos muppet', 'Steve')))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /web share/i })).toBeEnabled()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('looks a suggestion up as soon as it is picked', async () => {
    const user = userEvent.setup()
    const fetchMock = urbanFetch((url) => {
      expect(url).toBe(`${URBAN}gremlin`)
      return { ok: true, json: async () => ({ list: [high] }) } as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    // Typing a suggestion's letters does not look it up by itself.
    await user.type(screen.getByLabelText(/^term$/i), 'clown')
    expect(fetchMock).not.toHaveBeenCalled()
    // Picking it from the list (no "insertText") does.
    await user.clear(screen.getByLabelText(/^term$/i))
    fireEvent.change(screen.getByLabelText(/^term$/i), { target: { value: 'gremlin' } })
    expect(await screen.findByText(/FIXTURE_HIGH/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('offers a retry and does not invent a definition when the lookup fails', async () => {
    const user = userEvent.setup()
    let fail = true
    const fetchMock = urbanFetch(async () => {
      if (fail) throw new TypeError('Failed to fetch')
      return { ok: true, json: async () => ({ list: [high] }) } as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await user.type(screen.getByLabelText(/^term$/i), 'gremlin{Enter}')
    expect((await screen.findAllByText(/lookup didn't go through/i)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Definition: Urban Dictionary/)).not.toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText(/FIXTURE_HIGH/)).toBeInTheDocument()
  })

  it('offers your own wording when Urban Dictionary has no entry', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      urbanFetch(async () => ({ ok: true, json: async () => ({ list: [] }) }) as Response),
    )
    render(<App />)
    await user.type(screen.getByLabelText(/^term$/i), 'snack goblin{Enter}')
    expect((await screen.findAllByText(/no entry for this word/i)).length).toBeGreaterThan(0)
    await user.click(screen.getAllByRole('button', { name: /use my own wording/i })[0]!)
    expect(screen.getByLabelText(/^your word$/i)).toHaveValue('snack goblin')
    await user.type(screen.getByLabelText(/^your definition$/i), 'A person who raids the pantry.')
    expect(screen.getByRole('heading', { level: 1, name: 'snack goblin' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: /dictionary page/i })).toHaveTextContent(
      'A person who raids the pantry.',
    )
    expect(screen.getByText(/wording: your own/i)).toBeInTheDocument()
    expect(screen.queryByText(/Definition: Urban Dictionary/)).not.toBeInTheDocument()
  })

  it('draws a random suggestion and looks it up', async () => {
    const user = userEvent.setup()
    const fetchMock = urbanFetch(() => ({ ok: true, json: async () => ({ list: [high] }) }) as Response)
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await user.click(screen.getByRole('button', { name: /random/i }))
    const heading = await screen.findByRole('heading', { level: 1 })
    expect(SLANG_TERMS).toContain(heading.textContent)
    expect(screen.getByLabelText(/^term$/i)).toHaveValue(heading.textContent)
    expect(await screen.findByText(/Definition: Urban Dictionary/)).toBeInTheDocument()
  })
})
