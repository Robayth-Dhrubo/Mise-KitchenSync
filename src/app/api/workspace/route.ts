import { env } from 'cloudflare:workers'
import { getChatGPTUser } from '@/app/chatgpt-auth'
import { emptyWorkspace, workspaceSchema } from '@/lib/workspace/domain'
import { z } from 'zod'
import { checkAccount, saveWorkspace, InventoryError } from '@/lib/workspace/inventory-server'
import { requireBillingAccess, BillingError } from '@/lib/workspace/billing'

export const dynamic = 'force-dynamic'
const response = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request?: Request) {
  const user = await getChatGPTUser()
  if (!user) return response({ error: 'Sign in to open your kitchen.' }, 401)
  if (request) { try { checkAccount(request, user.userId) } catch { return response({error:'The signed-in account changed. Reload this page before opening kitchen records.'},403) } }
  if (!env.DB) return response({ error: 'Kitchen storage is unavailable. Please retry.' }, 503)
  try {
    const row = await env.DB.prepare('SELECT revision, data, updated_at FROM kitchen_workspaces WHERE owner_id = ?').bind(user.userId).first<{ revision: number; data: string; updated_at: string }>()
    return response({accountScope:user.userId,...(row ? { revision: row.revision, state: workspaceSchema.parse(JSON.parse(row.data)), updatedAt: row.updated_at } : { revision: 0, state: emptyWorkspace(), updatedAt: null })})
  } catch {
    return response({ error: 'Your kitchen could not be loaded. No records were changed.' }, 503)
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser()
  if (!user) return response({ error: 'Sign in before saving.' }, 401)
  try { checkAccount(request,user.userId) } catch { return response({error:'The signed-in account changed. Reload this page before saving.'},403) }
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return response({ error: 'This request did not originate from your kitchen.' }, 403)
  if (!env.DB) return response({ error: 'Kitchen storage is unavailable. Your edit has not been saved.' }, 503)
  let input: { revision: number; state: z.infer<typeof workspaceSchema>; intent?: 'edit' | 'replace' }
  try {
    const body = await request.text()
    if (body.length > 2_000_000) return response({ error: 'This backup is too large.' }, 413)
    input = z.object({ revision: z.number().int().min(0), state: workspaceSchema, intent: z.enum(['edit','replace']).optional() }).parse(JSON.parse(body))
  } catch (error) {
    return response({ error: error instanceof z.ZodError ? error.issues[0]?.message ?? 'Check your inputs.' : 'Invalid kitchen data.' }, 400)
  }
  try {
    await requireBillingAccess(user)
    return response(await saveWorkspace(user.userId, input.revision, input.state, input.intent === 'replace'))
  } catch (error) {
    if (error instanceof InventoryError) return response({ error: error.message }, error.status)
    if (error instanceof BillingError) return response({ error: error.message }, error.status)
    return response({ error: 'Saving failed. Your edit has not been saved; please retry.' }, 503)
  }
}
