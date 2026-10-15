import { countDraftSchema, type CountDraft } from './stock-control-schema'

export function countDraftKey(scope: string, demo = false): string { return `mise-count-draft-v1:${demo ? 'demo' : 'live'}:${encodeURIComponent(scope)}` }
export function readCountDraft(raw: string, scope: string): CountDraft | null {
  if (!raw || raw === '!storage-unavailable') return null
  try { const draft = countDraftSchema.parse(JSON.parse(raw)); return draft.scope === scope ? draft : null } catch { return null }
}
export function clearDeviceCount(scope: string, demo = false): boolean {
  try { (demo ? sessionStorage : localStorage).removeItem(countDraftKey(scope, demo)); window.dispatchEvent(new Event('mise-count-draft')); return true } catch { return false }
}
