import KitchenWorkspace from '@/components/workspace/workspace'
import { requireChatGPTUser } from './chatgpt-auth'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const user = await requireChatGPTUser('/')
  return <KitchenWorkspace displayName={user.displayName} />
}
