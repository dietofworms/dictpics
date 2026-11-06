import { pickBestEntry, urbanLookupUrl, type UrbanEntry } from './urban.ts'

/**
 * Looks a term up on Urban Dictionary straight from the browser. The API sends
 * `Access-Control-Allow-Origin: *`, so no proxy is needed. The request carries
 * no cookies and no referrer, only the term.
 */
export async function lookupTerm(
  term: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<UrbanEntry | null> {
  const response = await fetchImpl(urbanLookupUrl(term), {
    signal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('lookup failed')
  return pickBestEntry(await response.json())
}
