import { z } from 'zod'
import { getChatGPTUser } from '@/app/chatgpt-auth'
import { checkAccount, InventoryError, listInventoryEvents, privateJson } from '@/lib/workspace/inventory-server'
import { recordId } from '@/lib/workspace/stock-control-schema'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const user = await getChatGPTUser()
  if (!user) return privateJson({ error: 'Sign in to open inventory history.' }, 401)
  try {
    checkAccount(request, user.userId)
    const raw = new URL(request.url).searchParams.get('cursor')
    if (raw && raw.length > 500) return privateJson({ error: 'Invalid history cursor.' }, 400)
    const cursor = raw ? z.object({ at: z.iso.datetime(), id: recordId }).parse(JSON.parse(atob(raw))) : null
    const result = await listInventoryEvents(user.userId, cursor)
    return privateJson({ events: result.events, nextCursor: result.next ? btoa(JSON.stringify(result.next)) : null })
  } catch (error) { return privateJson({ error: error instanceof InventoryError ? error.message : 'Inventory history could not be loaded. Please retry.' }, error instanceof InventoryError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError || error instanceof DOMException ? 400 : 503) }
}
