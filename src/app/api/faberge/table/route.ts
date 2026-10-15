import { env } from 'cloudflare:workers'
import { getChatGPTUser } from '@/app/chatgpt-auth'
import { type SourceTable } from '@/lib/workspace/faberge'
import { assetKey, latestImport, privateResponse } from '@/lib/workspace/faberge-server'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const user = await getChatGPTUser()
  if (!user) return privateResponse({ error: 'Sign in to see this source.' }, 401)
  const params = new URL(request.url).searchParams
  const offset = Number(params.get('offset') ?? 0), query = (params.get('q') ?? '').trim().toLowerCase()
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000 || query.length > 150) return privateResponse({ error: 'Invalid source page.' }, 400)
  try {
    const report = await latestImport(user.userId)
    const table = report?.files.flatMap(file => file.tables).find(table => table.id === params.get('id'))
    if (!table) return privateResponse({ error: 'Source table not found.' }, 404)
    const object = await env.BUCKET?.get(assetKey(user.userId, table.asset))
    if (!object) return privateResponse({ error: 'This source is unavailable. Please retry.' }, 503)
    const source = await object.json<SourceTable>()
    const rows = query ? source.rows.filter(row => row.cells.some(cell => cell !== null && String(cell).toLowerCase().includes(query))) : source.rows
    const end = offset + 50
    return privateResponse({ name: source.name, columns: source.columns, rows: rows.slice(offset, end), total: rows.length, offset, nextOffset: end < rows.length ? end : null })
  } catch { return privateResponse({ error: 'This source could not be loaded. Please retry.' }, 503) }
}
