import { env } from 'cloudflare:workers'
import { z } from 'zod'
import { workspaceSchema } from '@/lib/workspace/domain'
import { fabergeReportSchema, mergeFaberge, requiredAssets } from '@/lib/workspace/faberge'
import { assetKey, importAuthorized, privateResponse } from '@/lib/workspace/faberge-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!await importAuthorized(request)) return privateResponse({ error: 'Import access denied.' }, 403)
  try {
    const owner = env.FABERGE_OWNER_ID!
    const row = await env.DB?.prepare('SELECT revision, data FROM kitchen_workspaces WHERE owner_id = ?').bind(owner).first<{ revision: number; data: string }>()
    if (!row) return privateResponse({ error: 'Open and save your kitchen before importing.' }, 409)
    const imports = await env.DB!.prepare('SELECT batch_id, imported_at FROM kitchen_imports WHERE owner_id = ? ORDER BY imported_at DESC').bind(owner).all()
    return privateResponse({ revision: row.revision, state: workspaceSchema.parse(JSON.parse(row.data)), imports: imports.results })
  } catch { return privateResponse({ error: 'Import status is unavailable.' }, 503) }
}

export async function POST(request: Request) {
  if (!await importAuthorized(request)) return privateResponse({ error: 'Import access denied.' }, 403)
  if (!env.DB || !env.BUCKET) return privateResponse({ error: 'Import storage is unavailable.' }, 503)
  const owner = env.FABERGE_OWNER_ID!
  const params = new URL(request.url).searchParams
  try {
    if (params.get('mode') === 'asset') {
      const hash = params.get('sha256') ?? ''
      if (!/^[a-f0-9]{64}$/.test(hash)) return privateResponse({ error: 'Invalid file checksum.' }, 400)
      if (Number(request.headers.get('content-length')) > 12_000_000) return privateResponse({ error: 'File too large.' }, 413)
      const bytes = await request.arrayBuffer()
      if (bytes.byteLength > 12_000_000) return privateResponse({ error: 'File too large.' }, 413)
      const actual = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('')
      if (actual !== hash) return privateResponse({ error: 'The file checksum does not match.' }, 400)
      await env.BUCKET.put(assetKey(owner, hash), bytes, { customMetadata: { sha256: hash } })
      return privateResponse({ sha256: hash, bytes: bytes.byteLength })
    }
    const raw = await request.text()
    if (raw.length > 2_000_000) return privateResponse({ error: 'Import package too large.' }, 413)
    const input = z.object({ expectedRevision: z.number().int().positive(), workspace: workspaceSchema, report: fabergeReportSchema }).parse(JSON.parse(raw))
    const previous = await env.DB.prepare('SELECT data FROM kitchen_imports WHERE owner_id = ? AND batch_id = ?').bind(owner, input.report.batchId).first<{ data: string }>()
    if (previous) return privateResponse({ alreadyImported: true, receipt: fabergeReportSchema.parse(JSON.parse(previous.data)).receipt })
    const current = await env.DB.prepare('SELECT revision, data FROM kitchen_workspaces WHERE owner_id = ?').bind(owner).first<{ revision: number; data: string }>()
    if (!current || current.revision !== input.expectedRevision) return privateResponse({ error: 'Your kitchen changed. Refresh the import status before retrying.' }, 409)
    const sources = new Set(input.report.files.map(file => file.id))
    for (const record of [...input.workspace.ingredients, ...input.workspace.recipes, ...input.workspace.suppliers, ...input.workspace.prep]) {
      if (record.source && !sources.has(record.source.fileId)) return privateResponse({ error: 'A record source is missing.' }, 400)
    }
    const assets = requiredAssets(input.report)
    for (let start = 0; start < assets.length; start += 12) {
      const found = await Promise.all(assets.slice(start, start + 12).map(hash => env.BUCKET!.head(assetKey(owner, hash))))
      if (found.some(item => !item)) return privateResponse({ error: 'Upload every original and source table before completing the import.' }, 409)
    }
    const merged = mergeFaberge(workspaceSchema.parse(JSON.parse(current.data)), input.workspace)
    const timestamp = new Date().toISOString()
    const report = { ...input.report, importedAt: timestamp, receipt: merged.receipt }
    // D1 batch is transactional. Both writes use the same optimistic revision
    // guard, so concurrent kitchen edits cannot produce a partial import.
    const result = await env.DB.batch([
      env.DB.prepare('INSERT INTO kitchen_imports (owner_id, batch_id, data, imported_at) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM kitchen_workspaces WHERE owner_id = ? AND revision = ?) ON CONFLICT(owner_id, batch_id) DO NOTHING')
        .bind(owner, report.batchId, JSON.stringify(report), timestamp, owner, input.expectedRevision),
      env.DB.prepare('UPDATE kitchen_workspaces SET revision = revision + 1, data = ?, updated_at = ? WHERE owner_id = ? AND revision = ? AND EXISTS (SELECT 1 FROM kitchen_imports WHERE owner_id = ? AND batch_id = ? AND imported_at = ?)')
        .bind(JSON.stringify(merged.state), timestamp, owner, input.expectedRevision, owner, report.batchId, timestamp),
    ])
    if (!result[0].meta.changes || !result[1].meta.changes) return privateResponse({ error: 'Your kitchen changed. Refresh the import status before retrying.' }, 409)
    return privateResponse({ imported: true, batchId: report.batchId, revision: input.expectedRevision + 1, receipt: merged.receipt, summary: report.summary })
  } catch (error) {
    if (error instanceof z.ZodError) return privateResponse({ error: error.issues[0]?.message ?? 'Invalid import data.', path: error.issues[0]?.path }, 400)
    return privateResponse({ error: 'Import failed. Refresh its status before retrying.' }, 503)
  }
}
