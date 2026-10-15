import { getChatGPTUser } from '@/app/chatgpt-auth'
import { latestImport, privateResponse } from '@/lib/workspace/faberge-server'

export const dynamic = 'force-dynamic'
export async function GET() {
  const user = await getChatGPTUser()
  if (!user) return privateResponse({ error: 'Sign in to see your Fabergé sources.' }, 401)
  try { return privateResponse({ report: await latestImport(user.userId) }) }
  catch { return privateResponse({ error: 'Your import could not be loaded. Please retry.' }, 503) }
}
