import { env } from 'cloudflare:workers'
import { getChatGPTUser } from '@/app/chatgpt-auth'
import { assetKey, latestImport, privateResponse } from '@/lib/workspace/faberge-server'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const user = await getChatGPTUser()
  if (!user) return privateResponse({ error: 'Sign in to download this file.' }, 401)
  try {
    const report = await latestImport(user.userId)
    const file = report?.files.find(file => file.id === new URL(request.url).searchParams.get('id'))
    if (!file) return privateResponse({ error: 'Source file not found.' }, 404)
    const object = await env.BUCKET?.get(assetKey(user.userId, file.asset))
    if (!object) return privateResponse({ error: 'This source is unavailable. Please retry.' }, 503)
    return new Response(object.body as unknown as BodyInit, { headers: {
      'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'Content-Length': String(object.size), 'X-Content-SHA256': file.asset,
    } })
  } catch { return privateResponse({ error: 'Download failed. Please retry.' }, 503) }
}
