import { afterEach, describe, expect, it, vi } from 'vitest'
import { entryFilename, shareBlob, triggerDownload } from './share.ts'

describe('export helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('names the png from the headword', () => {
    expect(entryFilename('Chaos Gremlin')).toBe('dictpics-chaos-gremlin.png')
    expect(entryFilename('!!!')).toBe('dictpics-entry.png')
    expect(entryFilename('../../<img onerror=alert(1)>')).toBe('dictpics-img-onerror-alert-1.png')
  })

  it('shares a png file when the browser can', async () => {
    const share = vi.fn(async (_data: ShareData) => {})
    const nav = { share, canShare: () => true } as unknown as Navigator
    await expect(shareBlob(new Blob(['png']), 'dictpics-gremlin.png', 'gremlin', nav)).resolves.toBe('shared')
    const payload = share.mock.calls[0]?.[0]
    expect(payload?.files?.[0]?.name).toBe('dictpics-gremlin.png')
    expect(payload?.text).toBe('gremlin')
  })

  it('shares text when files are not allowed', async () => {
    const share = vi.fn(async (_data: ShareData) => {})
    const nav = { share, canShare: () => false } as unknown as Navigator
    await shareBlob(new Blob(['png']), 'dictpics-gremlin.png', 'gremlin', nav)
    expect(share.mock.calls[0]?.[0]?.files).toBeUndefined()
  })

  it('reports when Web Share is missing', async () => {
    await expect(shareBlob(new Blob(['png']), 'a.png', 'a', {} as Navigator)).resolves.toBe('unavailable')
  })

  it('clicks a download link', () => {
    const click = vi.fn()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dictpics')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click)
    triggerDownload(new Blob(['png']), 'dictpics-gremlin.png')
    expect(click).toHaveBeenCalledOnce()
  })
})
