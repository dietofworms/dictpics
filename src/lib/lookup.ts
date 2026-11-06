import {
  LookupUnavailableError,
  pickBestEntry,
  urbanLookupEndpoint,
  urbanLookupRequestUrl,
  type UrbanEntry,
} from './urban.ts'

type LookupEnv = { baseUrl: string; configured?: string }

let sameOriginReady: boolean | null = null

export function resetLookupProbe(): void {
  sameOriginReady = null
}

function contentTypeOf(response: Response): string {
  return response.headers?.get?.('content-type')?.toLowerCase() ?? ''
}

async function sameOriginLookupReady(
  endpoint: string,
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  if (sameOriginReady !== null) return sameOriginReady
  try {
    const response = await fetchImpl(`${endpoint}/health`, {
      signal,
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok || !contentTypeOf(response).includes('json')) {
      sameOriginReady = false
      return false
    }
    const body: unknown = await response.json()
    sameOriginReady = Boolean(body && typeof body === 'object' && (body as { ok?: unknown }).ok === true)
    return sameOriginReady
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    sameOriginReady = false
    return false
  }
}

export async function lookupTerm(
  term: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
  env?: LookupEnv,
): Promise<UrbanEntry | null> {
  const configured = import.meta.env.VITE_URBAN_LOOKUP_URL
  const resolved: LookupEnv = env ?? {
    baseUrl: import.meta.env.BASE_URL,
    configured: typeof configured === 'string' ? configured : undefined,
  }
  const endpoint = urbanLookupEndpoint(resolved)
  const usingConfiguredProxy = Boolean(resolved.configured?.trim())
  if (!usingConfiguredProxy) {
    const ready = await sameOriginLookupReady(endpoint, signal, fetchImpl)
    if (!ready) throw new LookupUnavailableError()
  }
  const response = await fetchImpl(urbanLookupRequestUrl(term, endpoint), {
    signal,
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok || (contentTypeOf(response) !== '' && !contentTypeOf(response).includes('json'))) {
    if (!usingConfiguredProxy) throw new LookupUnavailableError()
    throw new Error('lookup failed')
  }
  return pickBestEntry(await response.json())
}
