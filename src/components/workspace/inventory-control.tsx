'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, Download, History, RefreshCw } from 'lucide-react'
import { type Snapshot, type Workspace } from '@/lib/workspace/domain'
import { inventoryEventSchema, type InventoryEvent } from '@/lib/workspace/inventory-control'
import { demoInventoryHistory } from '@/lib/workspace/inventory-demo'
import { csv, download } from '@/lib/workspace/import-export'
import { StockCounts } from './stock-counts'
import { StationPrep } from './station-prep'
import { DemandOrders, SalesUsage, VarianceReview } from './inventory-review'
import { HelpLink, OperationEmpty, OperationNote } from './operations-ui'

const tabs = [
  { id: 'counts', label: 'Stock counts', guide: 'offline-counts' }, { id: 'stations', label: 'Station prep', guide: 'station-targets' },
  { id: 'usage', label: 'Sales usage', guide: 'stock-usage' }, { id: 'variance', label: 'Usage variance', guide: 'stock-variance' },
  { id: 'forecast', label: 'Order forecast', guide: 'stock-forecast' }, { id: 'history', label: 'Stock history', guide: 'stock-history' },
] as const
type Tab = typeof tabs[number]['id']
type Props = { state: Workspace; revision: number; scope: string; demo: boolean; busy: boolean; save: (state: Workspace) => Promise<boolean>; onSnapshot: (snapshot: Snapshot) => void; help: (id: string) => void; openPrep: () => void; openOrders: () => void }
export function InventoryControl(props: Props) {
  const { state, scope, demo, busy, revision, save, onSnapshot, help, openPrep, openOrders } = props
  const [tab, setTab] = useState<Tab>('counts')
  const [events, setEvents] = useState<InventoryEvent[]>(() => demo ? demoInventoryHistory(state) : [])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  function selectTab(next: Tab) {
    if (next === tab) return true
    if (!window.dispatchEvent(new Event('mise-before-navigate', { cancelable: true }))) return false
    setTab(next); return true
  }
  function readDemo() {
    try { const saved = sessionStorage.getItem('mise-demo-inventory-events-v1'); if (saved) return (JSON.parse(saved) as unknown[]).map(value => inventoryEventSchema.parse(value)) } catch { /* Start a damaged demo ledger with illustrative records. */ }
    return demoInventoryHistory(state)
  }
  useEffect(() => {
    const controller = new AbortController()
    if (demo) {
      Promise.resolve().then(() => { if (!controller.signal.aborted) { setEvents(readDemo()); setLoading(false) } })
    } else if (scope) {
      fetch('/api/inventory/events', { cache: 'no-store', headers: { 'X-Mise-Account': scope }, signal: controller.signal }).then(async response => {
        const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Inventory history could not be loaded.')
        setEvents((body.events as unknown[]).map(value => inventoryEventSchema.parse(value))); setCursor(body.nextCursor); setError('')
      }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'History is unavailable.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }
    return () => controller.abort()
  // The demo ledger is retained separately; current recipes do not rewrite it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, demo, refresh])
  async function more() {
    if (!cursor || loading || demo) return
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/inventory/events?cursor=${encodeURIComponent(cursor)}`, { cache: 'no-store', headers: { 'X-Mise-Account': scope }, signal: AbortSignal.timeout(20000) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Older history could not be loaded.')
      const next = (body.events as unknown[]).map(value => inventoryEventSchema.parse(value))
      setEvents(old => [...old, ...next.filter(event => !old.some(item => item.id === event.id))]); setCursor(body.nextCursor)
    } catch (error) { setError(error instanceof Error ? error.message : 'Older history is unavailable.') }
    finally { setLoading(false) }
  }
  function onEvent(event?: InventoryEvent) {
    if (demo && event) { const next = [event, ...readDemo().filter(item => item.id !== event.id)]; sessionStorage.setItem('mise-demo-inventory-events-v1', JSON.stringify(next)); setEvents(next) }
    else { setLoading(true); setRefresh(value => value + 1) }
  }
  const current = tabs.find(value => value.id === tab)!
  if (!scope) return <OperationEmpty icon={<ClipboardCheck size={31}/>} title="Verify your account before keeping device drafts">Reload this page while signed in. Counts are bound to the account that starts them so another sign-in cannot receive the wrong kitchen’s draft.</OperationEmpty>
  const reviewProps = { state, revision, scope, demo, busy, events, onSnapshot, onEvent, help: () => help(current.guide) }
  return <div className="operation-page inventory-control"><section className="operation-hero"><div><span className="eyebrow">FROM THE WALK-IN TO THE NEXT SERVICE</span><h2>Trust the stock behind the numbers.</h2><p>Count on the device, plan each station and compare physical usage with recipes sold. Every applied stock change has its own history.</p></div><ClipboardCheck size={41} strokeWidth={1.4}/></section>
    <div className="stock-tool-tabs" role="tablist" aria-label="Inventory control tools">{tabs.map(value => <button key={value.id} id={`stock-tab-${value.id}`} role="tab" aria-selected={tab === value.id} aria-controls={`stock-panel-${value.id}`} tabIndex={tab === value.id ? 0 : -1} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const index = tabs.findIndex(item => item.id === tab); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; if (selectTab(tabs[next].id)) document.getElementById(`stock-tab-${tabs[next].id}`)?.focus() } }} onClick={() => selectTab(value.id)}>{value.label}</button>)}</div>
    {error && <div className="operation-feedback error" role="status">{error}<button className="text-button" onClick={() => { setLoading(true); setRefresh(value => value + 1) }}>Retry history<RefreshCw size={14}/></button></div>}
    <section id={`stock-panel-${tab}`} role="tabpanel" aria-labelledby={`stock-tab-${tab}`} className="stock-tool-panel">
      {tab === 'counts' && <StockCounts state={state} revision={revision} scope={scope} demo={demo} busy={busy} onSnapshot={onSnapshot} onEvent={onEvent} help={() => help(current.guide)}/>}
      {tab === 'stations' && <StationPrep state={state} busy={busy} save={save} help={() => help(current.guide)} openPrep={openPrep}/>}
      {tab === 'usage' && <SalesUsage {...reviewProps}/>}
      {tab === 'variance' && <VarianceReview state={state} scope={scope} demo={demo} events={events} help={() => help(current.guide)}/>}
      {tab === 'forecast' && <DemandOrders state={state} busy={busy} save={save} help={() => help(current.guide)} openOrders={openOrders}/>}
      {tab === 'history' && <InventoryHistory events={events} help={() => help(current.guide)} loading={loading} refresh={() => { setLoading(true); setRefresh(value => value + 1) }}/ >}
    </section>
    {cursor && ['history', 'variance', 'usage'].includes(tab) && <button className="button secondary load-stock-history" disabled={loading} onClick={() => void more()}><History size={16}/>{loading ? 'Loading history…' : 'Load older inventory history'}</button>}
  </div>
}
function InventoryHistory({ events, help, loading, refresh }: { events: InventoryEvent[]; help: () => void; loading: boolean; refresh: () => void }) {
  function exportCsv() {
    download(csv([['event_id', 'kind', 'service_date', 'recorded_at', 'revision', 'reference', 'ingredient', 'quantity', 'unit', 'unit_cost_cad', 'reason'], ...events.flatMap(event => event.data.lines.map(line => [event.id, event.kind, event.occurredOn, event.recordedAt, event.revision, event.referenceId, line.name, line.quantity, line.unit, line.unitCost, 'reason' in line ? line.reason : event.kind === 'count' ? event.data.phase : 'recipe usage']))]), 'mise-loaded-inventory-history.csv', 'text/csv;charset=utf-8')
  }
  return <div className="operation-page"><div className="operation-toolbar"><div className="operation-actions"><button className="button secondary" disabled={loading} onClick={refresh}><RefreshCw size={15}/>Refresh history</button><button className="button secondary" disabled={!events.length} onClick={exportCsv}><Download size={15}/>Export loaded CSV</button><button className="button secondary" disabled={!events.length} onClick={() => download(JSON.stringify({ version: 1, events }, null, 2), 'mise-loaded-inventory-history.json', 'application/json')}>Export loaded JSON</button></div><HelpLink title="Inventory records and backups" onClick={help}/></div>
    {!events.length ? <OperationEmpty icon={<History size={30}/>} title={loading ? 'Loading inventory history' : 'Your inventory history starts here'}>Applied stock counts, received orders, recorded waste, manual stock edits and posted recipe usage will appear here. Earlier records are not invented during the upgrade.</OperationEmpty> : <div className="inventory-event-list">{events.map(event => <details className="panel inventory-event" key={event.id}><summary><span className={`badge ${event.kind === 'count' ? 'good' : event.kind === 'usage' ? 'blue' : 'neutral'}`}>{event.kind === 'count' ? 'Physical count' : event.kind === 'usage' ? 'Recipe usage' : 'Stock movement'}</span><span><strong>{event.kind === 'movement' ? `${event.data.lines.length} ingredient changes` : event.data.name}</strong><small>{event.occurredOn} · kitchen revision {event.revision}</small></span><time>{new Date(event.recordedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></summary><div className="table-scroll"><table><thead><tr><th>Ingredient</th><th className="numeric">Quantity</th><th>Unit</th><th className="numeric">Saved unit cost</th><th>Basis</th></tr></thead><tbody>{event.data.lines.map((line, index) => <tr key={`${line.ingredientId}-${index}`}><td>{line.name}</td><td className="numeric">{line.quantity === null ? 'Unknown' : line.quantity.toLocaleString('en-CA', { maximumFractionDigits: 3 })}</td><td>{line.unit}</td><td className="numeric">{line.unitCost === null ? '—' : line.unitCost.toFixed(5)}</td><td>{'reason' in line ? line.reason : event.kind === 'count' ? event.data.phase : 'Sold recipe quantities'}</td></tr>)}</tbody></table></div></details>)}</div>}
    <OperationNote>Exports include the history loaded on this page. Load older pages for additional records. The append-only ledger stays in server storage when a kitchen JSON backup is restored; export it separately. Count drafts are device files and do not restore the ledger.</OperationNote>
  </div>
}
