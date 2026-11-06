function tokens(value: string): string[] {
  return value
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.toLocaleUpperCase('en-US'))
    .filter(Boolean)
}

export function guideWords(term: string, name: string): { left: string; right: string } {
  const words = [...tokens(name), ...tokens(term)]
  if (words.length === 0) return { left: '—', right: '—' }
  const sorted = [...words].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  return { left: sorted[0] ?? '—', right: sorted[sorted.length - 1] ?? '—' }
}

export function pageNumberFor(term: string, name: string): number {
  const seed = `${term}\n${name}`
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 860 + 40
}
