import { z } from 'zod'
import { getChatGPTUser } from '@/app/chatgpt-auth'
import { checkAccount, checkOrigin, eventFromRow, eventsForPeriod, findInventoryEvent, InventoryError, privateJson, readWorkspace } from '@/lib/workspace/inventory-server'
import { reconcileInventory } from '@/lib/workspace/inventory-reconciliation'
import { recordId } from '@/lib/workspace/stock-control-schema'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return privateJson({ error: 'Sign in to review inventory usage.' }, 401)
  try {
    checkOrigin(request); checkAccount(request, user.userId, true)
    const body = await request.text(); if (body.length > 2000) return privateJson({ error: 'This review request is too large.' }, 413)
    const input = z.object({ openingId: recordId, closingId: recordId, reportId: recordId, completeSales: z.literal(true) }).parse(JSON.parse(body))
    const snapshot = await readWorkspace(user.userId), report = snapshot.state.operations?.salesReports.find(report => report.id === input.reportId)
    const openingRow = await findInventoryEvent(user.userId, input.openingId), closingRow = await findInventoryEvent(user.userId, input.closingId)
    if (!openingRow || !closingRow || !report) return privateJson({ error: 'Choose counts and a sales report from this kitchen.' }, 404)
    const opening = eventFromRow(openingRow), closing = eventFromRow(closingRow)
    if (opening.kind !== 'count' || closing.kind !== 'count') return privateJson({ error: 'Choose physical counts for both boundaries.' }, 400)
    const events = await eventsForPeriod(user.userId, opening.occurredOn, closing.occurredOn)
    return privateJson({ review: reconcileInventory(opening, closing, report, snapshot.state, events) })
  } catch (error) { return privateJson({ error: error instanceof InventoryError ? error.message : 'The inventory review could not be calculated. Check the selected records.' }, error instanceof InventoryError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503) }
}
