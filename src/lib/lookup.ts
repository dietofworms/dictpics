import {
  LookupUnavailableError,
  pickBestEntry,
  urbanLookupEndpoint,
  urbanLookupRequestUrl,
  type UrbanEntry,
} from './urban.ts'

export async function lookupTerm(
  term: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<UrbanEntry | null> {
  const configured = import.meta.env.VITE_URBAN_LOOKUP_URL
  const configuredUrl = typeof configured === 'string' ? configured : undefined
  const endpoint = urbanLookupEndpoint({
    baseUrl: import.meta.env.BASE_URL,
    configured: configuredUrl,
  })
  const response = await fetchImpl(urbanLookupRequestUrl(term, endpoint), {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const contentType = response.headers?.get?.('content-type') ?? ''
  const usingConfiguredProxy = Boolean(configuredUrl?.trim())
  if (!response.ok || (contentType !== '' && !contentType.toLowerCase().includes('json'))) {
    if (!usingConfiguredProxy) throw new LookupUnavailableError()
    throw new Error('lookup failed')
  }
  return pickBestEntry(await response.json())
}
