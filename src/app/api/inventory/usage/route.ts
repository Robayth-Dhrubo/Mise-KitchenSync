import { z } from 'zod'
import { getChatGPTUser } from '@/app/chatgpt-auth'
import { BillingError, requireBillingAccess } from '@/lib/workspace/billing'
import { kitchenDay } from '@/lib/workspace/domain'
import { type InventoryEvent } from '@/lib/workspace/inventory-control'
import { prepareSalesUsage } from '@/lib/workspace/inventory-reconciliation'
import { baselineCounts, checkAccount, checkOrigin, commitInventoryState, eventsForPeriod, findInventoryEvent, InventoryError, privateJson, readWorkspace, requestHash } from '@/lib/workspace/inventory-server'
import { recordId } from '@/lib/workspace/stock-control-schema'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return privateJson({ error: 'Sign in before posting sales usage.' }, 401)
  try {
    checkOrigin(request); checkAccount(request, user.userId, true)
    const raw = await request.text(); if (raw.length > 2000) return privateJson({ error: 'This request is too large.' }, 413)
    const input = z.object({ eventId: recordId, revision: z.number().int().min(0), reportId: recordId, confirmed: z.literal(true) }).parse(JSON.parse(raw))
    const hash = await requestHash(input), existing = await findInventoryEvent(user.userId, input.eventId)
    if (existing) {
      if (existing.kind !== 'usage' || existing.request_hash !== hash) throw new InventoryError('This posting ID was already used for different data.', 409)
      return privateJson({ snapshot: await readWorkspace(user.userId), duplicate: true })
    }
    const snapshot = await readWorkspace(user.userId)
    if (snapshot.revision !== input.revision) throw new InventoryError('The kitchen changed. Reload and review the usage preview before posting.', 409, snapshot)
    const report = snapshot.state.operations?.salesReports.find(report => report.id === input.reportId)
    if (!report) return privateJson({ error: 'The sales snapshot was not found in this kitchen.' }, 404)
    if (report.through > kitchenDay()) return privateJson({ error: 'Only recorded sales through today can be posted.' }, 400)
    const events = [...await baselineCounts(user.userId), ...await eventsForPeriod(user.userId, report.from, kitchenDay())]
    let applied: ReturnType<typeof prepareSalesUsage>
    try { applied = prepareSalesUsage(snapshot.state, report, events) } catch (error) { return privateJson({ error: error instanceof Error ? error.message : 'Review the inventory baseline.' }, 400) }
    await requireBillingAccess(user)
    const event: InventoryEvent = { id: input.eventId, kind: 'usage', occurredOn: report.through, recordedAt: new Date().toISOString(), revision: snapshot.revision + 1, referenceId: report.id,
      data: { name: report.name, source: report.source, from: report.from, through: report.through, lines: applied.lines, recipeIds: [...new Set(report.rows.flatMap(row => row.recipeId ? [row.recipeId] : []))] } }
    return privateJson({ snapshot: await commitInventoryState(user.userId, input.revision, applied.state, event, hash), duplicate: false })
  } catch (error) {
    if (error instanceof InventoryError) return privateJson({ error: error.message, ...(error.snapshot ? { snapshot: error.snapshot } : {}) }, error.status)
    if (error instanceof BillingError) return privateJson({ error: error.message }, error.status)
    return privateJson({ error: error instanceof z.ZodError ? error.issues[0]?.message : 'The posting was not confirmed. Keep its request ID and reload before retrying.' }, error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503)
  }
}
