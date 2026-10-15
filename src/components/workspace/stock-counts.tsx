'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Check, ClipboardCheck, CloudUpload, Download, Plus, RefreshCw, Save, ShieldCheck, Trash2, Wifi, WifiOff } from 'lucide-react'
import { kitchenDay, workspaceSchema, type Snapshot, type Workspace } from '@/lib/workspace/domain'
import { applyCount, countSubmission, newCountDraft, rebaseCount, type InventoryEvent } from '@/lib/workspace/inventory-control'
import { countDraftKey, readCountDraft, clearDeviceCount } from '@/lib/workspace/offline-counts'
import { countDraftSchema, type CountDraft } from '@/lib/workspace/stock-control-schema'
import { ingredientQuantity, measureUnits, unitLabel } from '@/lib/workspace/measurements'
import { download } from '@/lib/workspace/import-export'
import { HelpLink, OperationEmpty, OperationNote, useUnsavedChanges } from './operations-ui'

function subscribeDraft(listener: () => void) { window.addEventListener('storage', listener); window.addEventListener('mise-count-draft', listener); return () => { window.removeEventListener('storage', listener); window.removeEventListener('mise-count-draft', listener) } }
function subscribeOnline(listener: () => void) { window.addEventListener('online', listener); window.addEventListener('offline', listener); return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener) } }
export function useDeviceCount(scope: string, demo = false) {
  const key = countDraftKey(scope, demo)
  const read = useCallback(() => { try { return (demo ? sessionStorage : localStorage).getItem(key) ?? '' } catch { return '!storage-unavailable' } }, [key, demo])
  const raw = useSyncExternalStore(subscribeDraft, read, () => '')
  const cached = useMemo(() => readCountDraft(raw, scope), [raw, scope])
  const [volatile, setVolatile] = useState<CountDraft | null>(null)
  const [failure, setFailure] = useState('')
  const persist = (value: CountDraft) => {
    const parsed = countDraftSchema.safeParse(value)
    if (!parsed.success) { setFailure(parsed.error.issues[0].message); return false }
    try { (demo ? sessionStorage : localStorage).setItem(key, JSON.stringify(parsed.data)); setVolatile(null); setFailure(''); window.dispatchEvent(new Event('mise-count-draft')); return true }
    catch { setVolatile(parsed.data); setFailure('Device storage is unavailable. Keep this page open or export the draft; it will not survive a reload.'); return false }
  }
  const discard = () => { if (clearDeviceCount(scope, demo)) { setVolatile(null); setFailure(''); return true }; setFailure('The device draft could not be cleared. Close it only after exporting a copy.'); return false }
  return { draft: volatile?.scope === scope ? volatile : cached, persist, discard, failure: failure || (raw === '!storage-unavailable' ? 'This browser cannot save device drafts. Keep the page open and export a copy before leaving.' : raw && !cached ? 'A damaged or mismatched device draft was found. Clear it before starting again.' : ''), raw }
}

type Props = { state: Workspace; revision: number; scope: string; demo: boolean; busy: boolean; onSnapshot: (snapshot: Snapshot) => void; onEvent: (event?: InventoryEvent) => void; help: () => void }
export function StockCounts({ state, revision, scope, demo, busy, onSnapshot, onEvent, help }: Props) {
  const device = useDeviceCount(scope, demo), draft = device.draft
  useUnsavedChanges(!!draft && !!device.failure)
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [remote, setRemote] = useState<Snapshot | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const running = useRef(false), attempted = useRef(''), latest = useRef({ draft, state, revision, busy })
  useEffect(() => { latest.current = { draft, state, revision, busy } }, [draft, state, revision, busy])
  async function sync(value: CountDraft) {
    if (running.current || latest.current.busy || !navigator.onLine || value.status !== 'queued') return
    running.current = true; setSyncing(true); setMessage('')
    try {
      const input = countSubmission(value)
      if (demo) {
        if (value.revision !== latest.current.revision) { setRemote({ revision: latest.current.revision, state: latest.current.state, updatedAt: null }); device.persist({ ...value, status: 'conflict' }); setMessage('The demo changed. Review the latest inventory before applying this draft.'); return }
        const next = applyCount(latest.current.state, input, 'Demo guest')
        const snapshot = { revision: latest.current.revision + 1, state: next.state, updatedAt: new Date().toISOString() }
        sessionStorage.setItem('mise-product-demo-v1', JSON.stringify(next.state)); onSnapshot(snapshot); device.discard(); onEvent({id:input.eventId,kind:'count',occurredOn:input.date,recordedAt:snapshot.updatedAt,revision:snapshot.revision,referenceId:null,data:next.data}); setMessage('Demo count applied. No private kitchen records were changed.'); return
      }
      const response = await fetch('/api/inventory/counts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mise-Account': scope }, body: JSON.stringify(input), cache: 'no-store', signal: AbortSignal.timeout(20000) })
      const body = await response.json()
      if (response.status === 409) {
        if (body.snapshot) { setRemote({ ...body.snapshot, state: workspaceSchema.parse(body.snapshot.state) }); setReviewed(false) }
        device.persist({ ...value, status: 'conflict' }); setMessage(body.error ?? 'Review the latest stock before applying this draft.'); return
      }
      if (!response.ok) { if (response.status === 400) device.persist({ ...value, status: 'draft' }); throw new Error(body.error ?? 'The count could not be confirmed.') }
      const snapshot: Snapshot = { ...body.snapshot, state: workspaceSchema.parse(body.snapshot.state) }
      onSnapshot(snapshot); device.discard(); onEvent(); setMessage(body.duplicate ? 'This count was already applied. The latest kitchen is loaded.' : 'Count applied once and recorded in inventory history.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Connection lost. The queued draft is kept on this device.') }
    finally { running.current = false; setSyncing(false) }
  }
  const queuedKey = draft?.status === 'queued' ? `${draft.eventId}:${draft.revision}` : ''
  useEffect(() => {
    if (!online) { attempted.current = ''; return }
    if (busy || !queuedKey || attempted.current === queuedKey) return
    // Start one queued attempt after hydration; failed requests wait for Retry
    // or a later connectivity event, rather than looping on every render.
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted && latest.current.draft?.status === 'queued') { attempted.current = queuedKey; void sync(latest.current.draft) } })
    return () => controller.abort()
  // sync reads current values through the ref; this effect tracks the queue.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, queuedKey, busy])
  function change(value: Partial<CountDraft>) { if (draft) device.persist({ ...draft, ...value, status: 'draft', updatedAt: new Date().toISOString() }) }
  function start() { try { if (device.raw && !draft && !window.confirm('Clear the unreadable device draft and start a new count?')) return; device.persist(newCountDraft(state, revision, scope)); setMessage('The ingredient list is saved for this count. You can enter quantities while this page is open without Wi-Fi.') } catch (error) { setMessage(error instanceof Error ? error.message : 'The count could not be started.') } }
  function queue() {
    if (!draft) return
    try { countSubmission(draft); const next = { ...draft, status: 'queued' as const, updatedAt: new Date().toISOString() }; const stored = device.persist(next); setMessage(online ? 'Ready to sync. The request keeps the same ID if it needs a retry.' : stored ? 'Queued on this device. Reconnect with this page open to sync; newer stock changes will require review.' : 'Keep this page open. Device storage is unavailable, so export the draft before leaving.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Enter at least one measured quantity.') }
  }
  async function loadLatest() {
    setSyncing(true)
    try {
      if (demo) setRemote({ state, revision, updatedAt: null })
      else { const response = await fetch('/api/workspace', { cache: 'no-store', headers: { 'X-Mise-Account': scope }, signal: AbortSignal.timeout(20000) }); const body = await response.json(); if (!response.ok || body.accountScope !== scope) throw new Error(body.error ?? 'Sign in to the account that started this draft.'); setRemote({ ...body, state: workspaceSchema.parse(body.state) }) }
      setReviewed(false)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The latest inventory could not be loaded.') }
    finally { setSyncing(false) }
  }
  function rebase() {
    if (!draft || !remote || !reviewed) return
    try { device.persist(rebaseCount(draft, remote.state, remote.revision)); onSnapshot(remote); setRemote(null); setReviewed(false); setMessage('A new review draft uses the latest revision. Re-enter any quantities whose units changed, then apply it when ready.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Start a new count.') }
  }
  const entered = draft?.lines.filter(line => line.quantity !== null).length ?? 0
  const locked = syncing || busy || draft?.status === 'queued' || draft?.status === 'conflict'
  return <div className="stock-counts"><div className="operation-toolbar"><div className="count-connection"><span className={`badge ${online ? 'good' : 'warning'}`}>{online ? <Wifi size={13}/> : <WifiOff size={13}/>} {online ? 'Connected' : 'Offline'}</span>{draft && <span className="badge neutral">{draft.status === 'queued' ? 'Queued on device' : draft.status === 'conflict' ? 'Review needed' : 'Device draft'}</span>}</div><HelpLink title="Counting offline and syncing safely" onClick={help}/></div>
    {!draft ? <OperationEmpty icon={<ClipboardCheck size={32}/>} title="Count stock where the stock is" action={<button className="button primary" disabled={busy || !state.ingredients.length} onClick={start}><Plus size={16}/>Start a stock count</button>}>Save a count draft on this device, then take it into the walk-in. Keep the page open while offline. Counted entries sync when you reconnect; blank entries leave existing stock unchanged.</OperationEmpty> : <>
      <section className="panel count-session"><div className="count-session-heading"><div><span className="eyebrow">{draft.kitchenName}</span><h2>{entered} of {draft.lines.length} ingredients counted</h2><p>Draft based on kitchen revision {draft.revision}. Blank means not counted; zero means confirmed empty.</p></div><span className="count-device-icon"><Save size={25}/></span></div><div className="count-session-fields"><label className="plan-field"><span>Count name</span><input disabled={locked} value={draft.name} maxLength={120} onChange={event => change({ name: event.target.value || 'Stock count' })}/></label><label className="plan-field"><span>Count date</span><input disabled={locked} type="date" max={kitchenDay()} value={draft.date} onChange={event => { if (event.target.value) change({ date: event.target.value }) }}/></label><label className="plan-field"><span>Count timing</span><select disabled={locked} value={draft.phase} onChange={event => change({ phase: event.target.value as CountDraft['phase'] })}><option value="spot">Spot count · part of the day</option><option value="opening">Opening · before service</option><option value="closing">Closing · after service</option></select></label></div>
      <label className="search-box count-search"><span className="sr-only">Find an ingredient to count</span><input type="search" placeholder="Find an ingredient…" value={query} onChange={event => setQuery(event.target.value)}/></label><div className="table-scroll"><table><caption className="sr-only">Offline stock-count quantities and their usable base-unit equivalents</caption><thead><tr><th>Ingredient</th><th>Measured quantity</th><th>Count unit</th><th className="numeric">Usable quantity</th>{remote && <th className="numeric">Latest cloud stock</th>}</tr></thead><tbody>{draft.lines.filter(line => line.name.toLowerCase().includes(query.toLowerCase())).map(line => {
        const converted = line.quantity === null ? null : ingredientQuantity(line.quantity, line.unit, line)
        const current = remote?.state.ingredients.find(item => item.id === line.ingredientId)
        return <tr key={line.ingredientId}><td><strong>{line.name}</strong><small>{line.packQuantity === null ? 'Pack size not set' : `${line.packQuantity.toLocaleString('en-CA')} ${line.baseUnit} / pack · ${line.yieldPct}% yield`}</small></td><td><input className="count-quantity" aria-label={`Count quantity for ${line.name}`} type="number" min="0" max="1000000000" step="any" disabled={locked} value={line.quantity ?? ''} placeholder="Not counted" onChange={event => { const value = event.target.value === '' ? null : Number(event.target.value); if (value === null || Number.isFinite(value) && value >= 0) change({ lines: draft.lines.map(item => item.ingredientId === line.ingredientId ? { ...item, quantity: value } : item) }) }}/></td><td><select aria-label={`Count unit for ${line.name}`} disabled={locked} value={line.unit} onChange={event => change({ lines: draft.lines.map(item => item.ingredientId === line.ingredientId ? { ...item, unit: event.target.value as typeof item.unit } : item) })}>{measureUnits.filter(unit => ingredientQuantity(1, unit, line) !== null).map(unit => <option key={unit} value={unit}>{unitLabel(unit)}</option>)}</select></td><td className="numeric">{converted === null ? '—' : `${converted.toLocaleString('en-CA', { maximumFractionDigits: 3 })} ${line.baseUnit}`}</td>{remote && <td className="numeric">{current?.stock == null ? 'Unknown / removed' : `${current.stock.toLocaleString('en-CA')} ${current.baseUnit}`}</td>}</tr>
      })}</tbody></table></div></section>
      {draft.status === 'conflict' && <section className="operation-warnings"><h3>Review the newer stock records first</h3><p>Your measured quantities are kept. An outdated draft has not replaced newer kitchen changes.</p>{!remote ? <button className="button secondary" disabled={syncing || !online} onClick={() => void loadLatest()}><RefreshCw size={15}/>Load latest stock for review</button> : <><label className="operation-checkbox"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)}/><span>I rechecked these counts against receipts, usage and other changes since I started.</span></label><button className="button secondary" disabled={!reviewed || syncing} onClick={rebase}>Create reviewed count draft<Check size={15}/></button></>}</section>}
      <div className="plan-save"><span><ShieldCheck size={14}/> {device.failure?'Device storage needs attention':'Saved to this account’s device draft'}</span><div><button className="button danger-text" disabled={syncing} onClick={() => { if (window.confirm('Clear this device draft? This does not reverse a count already applied to the kitchen.')) device.discard() }}><Trash2 size={15}/>Clear draft</button><button className="button secondary" onClick={() => download(JSON.stringify(draft, null, 2), `mise-count-draft-${draft.date}.json`, 'application/json')}><Download size={15}/>Export draft</button>{draft.status === 'queued' ? <button className="button primary" disabled={syncing || busy || !online} onClick={() => void sync(draft)}><RefreshCw size={16}/>{syncing ? 'Syncing…' : 'Retry sync'}</button> : <button className="button primary" disabled={syncing || busy || !entered || draft.status === 'conflict'} onClick={queue}><CloudUpload size={16}/>{online ? 'Apply reviewed count' : 'Queue for reconnect'}</button>}</div></div>
    </>}
    {(device.failure || message) && <p className={`operation-feedback ${device.failure ? 'error' : ''}`} role="status">{device.failure || message}</p>}
    <OperationNote>This device draft is account-specific. Open the app and start the count while connected; offline launch from a closed browser is not included. Sign out only after syncing or exporting the draft. Inventory event history is stored separately from the kitchen JSON backup.</OperationNote>
  </div>
}
