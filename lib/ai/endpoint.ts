import 'server-only'

import { Resolver } from 'node:dns/promises'
import { BlockList } from 'node:net'
import { request } from 'node:https'
import type { IncomingMessage } from 'node:http'

/** Custom providers must be public HTTPS services, never local/internal hosts. */
export function parseBaseUrl(value: string): URL {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.port && url.port !== '443')
  ) {
    throw new Error('Use a public HTTPS API base URL without credentials, query parameters, or a custom port.')
  }
  return url
}

const blocked = new BlockList()
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(address, prefix)

export function isPublicAddress(address: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(address) && !blocked.check(address)
}

/** Pin a validated public address for the connection to prevent DNS rebinding.
 * TLS still authenticates the original hostname. Redirects are never followed.
 */
export async function postChat(
  baseUrl: string,
  apiKey: string,
  body: object,
): Promise<IncomingMessage> {
  const url = parseBaseUrl(baseUrl)
  const resolver = new Resolver({ timeout: 5000, tries: 1 })
  const addresses = await resolver.resolve4(url.hostname)
  if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) {
    throw new Error('The API base URL must resolve to a public internet address.')
  }
  const data = JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: addresses[0],
      servername: url.hostname,
      port: 443,
      path: `${url.pathname.replace(/\/$/, '')}/chat/completions`,
      method: 'POST',
      agent: false,
      headers: {
        Host: url.hostname,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Content-Length': Buffer.byteLength(data),
      },
      signal: AbortSignal.timeout(120_000),
    }, resolve)
    req.on('error', reject)
    req.end(data)
  })
}
