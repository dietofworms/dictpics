export function publicAsset(file: string, baseUrl = import.meta.env.BASE_URL): string {
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${prefix}${file.replace(/^\/+/, '')}`
}
