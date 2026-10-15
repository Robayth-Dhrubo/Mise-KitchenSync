import { env } from 'cloudflare:workers'
import { fabergeReportSchema, type FabergeReport } from './faberge'

export const privateResponse = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } })
export const assetKey = (owner: string, hash: string) => `owners/${owner}/faberge/${hash}`
export async function latestImport(owner: string): Promise<FabergeReport | null> {
  const row = await env.DB?.prepare('SELECT data FROM kitchen_imports WHERE owner_id = ? ORDER BY imported_at DESC LIMIT 1').bind(owner).first<{ data: string }>()
  return row ? fabergeReportSchema.parse(JSON.parse(row.data)) : null
}

// Agent imports require both private platform service access and a separate,
// server-only key. The target owner is configured independently of request data.
export async function importAuthorized(request: Request): Promise<boolean> {
  const expected = env.FABERGE_IMPORT_KEY, actual = request.headers.get('x-mise-import-key')
  if (!expected || !actual || !env.FABERGE_OWNER_ID || actual.length > 200) return false
  const encode = new TextEncoder()
  const [left, right] = await Promise.all([expected, actual].map(v => crypto.subtle.digest('SHA-256', encode.encode(v))))
  const a = new Uint8Array(left), b = new Uint8Array(right)
  let different = 0
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i]
  return different === 0
}
