import { createCorsProxyServer, parseAllowedOrigins } from '../server/urbanProxy.ts'

const port = Number(process.env.PORT ?? 8787)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a TCP port')
}

// Loopback by default. Set HOST=0.0.0.0 to accept outside connections.
const host = process.env.HOST?.trim() || '127.0.0.1'

const server = createCorsProxyServer({
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
})

server.requestTimeout = 15_000
server.headersTimeout = 10_000

server.listen(port, host, () => {
  console.log(`dictpics lookup proxy listening on ${host}:${port}`)
})
