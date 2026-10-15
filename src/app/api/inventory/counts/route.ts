import { getChatGPTUser } from '@/app/chatgpt-auth'
import { BillingError, requireBillingAccess } from '@/lib/workspace/billing'
import { applyCount, type InventoryEvent } from '@/lib/workspace/inventory-control'
import { checkAccount, checkCountDate, checkOrigin, commitInventoryState, findInventoryEvent, InventoryError, privateJson, readWorkspace, requestHash } from '@/lib/workspace/inventory-server'
import { countSubmissionSchema } from '@/lib/workspace/stock-control-schema'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  const user = await getChatGPTUser()
  if (!user) return privateJson({ error: 'Sign in before applying a stock count.' }, 401)
  try {
    checkOrigin(request); checkAccount(request, user.userId, true)
    const raw = await request.text(); if (raw.length > 150000) return privateJson({ error: 'This count draft is too large.' }, 413)
    const input = countSubmissionSchema.parse(JSON.parse(raw))
    const hash = await requestHash({ ...input, lines: [...input.lines].sort((a, b) => a.ingredientId.localeCompare(b.ingredientId)) })
    const existing = await findInventoryEvent(user.userId, input.eventId)
    if (existing) {
      if (existing.kind !== 'count' || existing.request_hash !== hash) throw new InventoryError('This count ID was already used for different data. Start a reviewed count instead.', 409)
      return privateJson({ snapshot: await readWorkspace(user.userId), duplicate: true })
    }
    const snapshot = await readWorkspace(user.userId)
    if (snapshot.revision !== input.revision) throw new InventoryError('Stock changed while this count was on the device. Review the latest records before applying it.', 409, snapshot)
    await requireBillingAccess(user)
    await checkCountDate(user.userId, input)
    let applied: ReturnType<typeof applyCount>
    try { applied = applyCount(snapshot.state, input, user.displayName) } catch (error) { throw new InventoryError(error instanceof Error ? error.message : 'Check the count units and date.') }
    const event: InventoryEvent = { id: input.eventId, kind: 'count', occurredOn: input.date, recordedAt: new Date().toISOString(), revision: snapshot.revision + 1, referenceId: null, data: applied.data }
    return privateJson({ snapshot: await commitInventoryState(user.userId, input.revision, applied.state, event, hash), duplicate: false })
  } catch (error) {
    if (error instanceof InventoryError) return privateJson({ error: error.message, ...(error.snapshot ? { snapshot: error.snapshot } : {}) }, error.status)
    if (error instanceof BillingError) return privateJson({ error: error.message }, error.status)
    if (error instanceof z.ZodError) return privateJson({ error: error.issues[0]?.message ?? 'Check the count entries.' }, 400)
    if (error instanceof SyntaxError) return privateJson({ error: 'The count could not be read.' }, 400)
    return privateJson({ error: error instanceof Error && /physical count|ingredient|unit, pack/.test(error.message) ? error.message : 'The count was not confirmed. Your device draft is kept; retry when connected.' }, 503)
  }
}
