export function entryFilename(term: string): string {
  const slug = term
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `dictpics-${slug || 'entry'}.png`
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function shareBlob(
  blob: Blob,
  filename: string,
  text: string,
  nav: Navigator = navigator,
): Promise<'shared' | 'unavailable'> {
  if (!nav.share) return 'unavailable'
  const file = new File([blob], filename, { type: 'image/png' })
  const payload: ShareData = { title: 'dictpics', text }
  if (nav.canShare?.({ files: [file] })) payload.files = [file]
  await nav.share(payload)
  return 'shared'
}
