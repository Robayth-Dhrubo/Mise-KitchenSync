import KitchenWorkspace from '@/components/workspace/workspace'
import ProductLanding from '@/components/product/product-landing'
import { getChatGPTUser, chatGPTSignInPath } from './chatgpt-auth'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const user = await getChatGPTUser()
  if (!user) return <ProductLanding signInHref={chatGPTSignInPath('/')} />
  return <KitchenWorkspace displayName={user.displayName} />
}
