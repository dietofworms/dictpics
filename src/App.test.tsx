import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { pageNumberFor } from './lib/dictionary.ts'
import { OWN_WORDING, SLANG_TERMS } from './lib/terms.ts'
import { STATIC_HOST_LOOKUP_MESSAGE } from './lib/urban.ts'

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

  it('starts with the slur filter off and does not look anything up', () => {
    render(<App />)
    expect(screen.getByRole('switch', { name: /skip likely slurs/i })).not.toBeChecked()
    expect(screen.getByText(/off\. the list includes every curated term/i)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^retard$/ })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(SLANG_TERMS.length + 2)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('loads a live definition through the local proxy', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      expect(url.startsWith('/api/urban?term=')).toBe(true)
      expect(url).not.toContain('urbandictionary.com')
      return {
        ok: true,
        json: async () => ({ list: [low, high] }),
      } as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await user.type(screen.getByLabelText(/name/i), 'Steve')
    await user.selectOptions(screen.getByLabelText(/^term$/i), 'gremlin')
    expect(await screen.findByText('small')).toBeInTheDocument()
    expect(screen.getByText('small').tagName).toBe('EM')
    expect(screen.getByText(/FIXTURE_HIGH/)).toBeInTheDocument()
    expect(screen.queryByText(/FIXTURE_LOW/)).not.toBeInTheDocument()
    expect(screen.getByText(/Definition: Urban Dictionary/)).toBeInTheDocument()
    expect(screen.getByText(/fixture-author/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view on urban dictionary/i })).toHaveAttribute('href', high.permalink)
    expect(screen.getByText('GREMLIN')).toBeInTheDocument()
    expect(screen.getByText('STEVE')).toBeInTheDocument()
    expect(screen.getByText(String(pageNumberFor('gremlin', 'Steve')))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /web share/i })).toBeEnabled()
  })

  it('does not invent a definition when the static host has no proxy', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>missing</html>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      })),
    )
    render(<App />)
    await user.selectOptions(screen.getByLabelText(/^term$/i), 'gremlin')
    expect((await screen.findAllByText(STATIC_HOST_LOOKUP_MESSAGE)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Definition: Urban Dictionary/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use my own wording/i })).toBeInTheDocument()
  })

  it('offers your own wording when Urban Dictionary has no entry', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ list: [] }) }) as Response),
    )
    render(<App />)
    await user.selectOptions(screen.getByLabelText(/^term$/i), 'gremlin')
    expect((await screen.findAllByText(/no entry for this word/i)).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /use my own wording/i }))
    expect(screen.getByLabelText(/^your word$/i)).toHaveValue('gremlin')
    await user.clear(screen.getByLabelText(/^your word$/i))
    await user.type(screen.getByLabelText(/^your word$/i), 'snack goblin')
    await user.type(screen.getByLabelText(/^your definition$/i), 'A person who raids the pantry.')
    expect(screen.getByRole('heading', { level: 1, name: 'snack goblin' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: /dictionary page/i })).toHaveTextContent(
      'A person who raids the pantry.',
    )
    expect(screen.getByText(/wording: your own/i)).toBeInTheDocument()
    expect(screen.queryByText(/Definition: Urban Dictionary/)).not.toBeInTheDocument()
  })

  it('removes likely slurs from the list when the filter is turned on', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ list: [high] }),
    } as Response))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await user.click(screen.getByRole('switch', { name: /skip likely slurs/i }))
    expect(screen.getByRole('switch', { name: /skip likely slurs/i })).toBeChecked()
    expect(screen.queryByRole('option', { name: /^retard$/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(42)
    await user.selectOptions(screen.getByLabelText(/^term$/i), 'gremlin')
    expect(await screen.findByText(/FIXTURE_HIGH/)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/^term$/i), OWN_WORDING)
    const word = screen.getByLabelText(/^your word$/i)
    await user.clear(word)
    await user.type(word, 'retard')
    expect(await screen.findByText(/filter is on/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'retard' })).not.toBeInTheDocument()
  })

  it('draws a random listed term through the proxy', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input).startsWith('/api/urban?term=')).toBe(true)
      return {
        ok: true,
        json: async () => ({ list: [high] }),
      } as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await user.click(screen.getByRole('button', { name: /random/i }))
    const heading = await screen.findByRole('heading', { level: 1 })
    const words = SLANG_TERMS.map((term) => term.word)
    expect(words).toContain(heading.textContent)
    expect(screen.getByText(/Definition: Urban Dictionary/)).toBeInTheDocument()
  })
})
