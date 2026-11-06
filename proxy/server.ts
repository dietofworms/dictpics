import { createCorsProxyServer, parseAllowedOrigins } from '../server/urbanProxy.ts'

const port = Number(process.env.PORT ?? 8787)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a TCP port')
}

const server = createCorsProxyServer({
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
})

server.listen(port, () => {
  console.log(`dictpics lookup proxy listening on ${port}`)
})
