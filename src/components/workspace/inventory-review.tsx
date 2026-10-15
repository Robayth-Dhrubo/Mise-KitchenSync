'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BarChart3, Check, Download, PackageCheck, ShoppingCart } from 'lucide-react'
import { money, quantity, workspaceSchema, type Snapshot, type Workspace } from '@/lib/workspace/domain'
import { forecastOrders, purchaseForecast, theoreticalUsage, type InventoryEvent } from '@/lib/workspace/inventory-control'
import { prepareSalesUsage, reconcileInventory } from '@/lib/workspace/inventory-reconciliation'
import { csv, download } from '@/lib/workspace/import-export'
import { HelpLink, OperationEmpty, OperationNote, OperationStat } from './operations-ui'

type Props = { state: Workspace; revision: number; scope: string; demo: boolean; busy: boolean; events: InventoryEvent[]; onSnapshot: (snapshot: Snapshot) => void; onEvent: (event?: InventoryEvent) => void; help: () => void }
export function SalesUsage({ state, revision, scope, demo, busy, events, onSnapshot, onEvent, help }: Props) {
  const reports = state.operations?.salesReports ?? []
  const [selected, setSelected] = useState(reports[0]?.id ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const [posting, setPosting] = useState(false)
  const [message, setMessage] = useState('')
  const pending = useRef<{ eventId: string; revision: number; reportId: string; confirmed: true } | null>(null)
  useEffect(() => {
    const key = `mise-pmix-request:${scope}:${demo ? 'demo' : 'live'}`
    try {
      const input = JSON.parse(sessionStorage.getItem(key) ?? 'null')
      if (input && events.some(event => event.id === input.eventId && event.kind === 'usage' && event.referenceId === input.reportId)) { sessionStorage.removeItem(key); pending.current = null }
    } catch { /* A failed storage read leaves the request available for retry. */ }
  }, [scope, demo, events])
  const report = reports.find(item => item.id === selected) ?? reports[0]
  if (!report) return <OperationEmpty icon={<BarChart3 size={31}/>} title="Link sales to recipe quantities first">Save a reviewed sales snapshot in Menu performance. You can then preview its ingredient usage here before deciding whether it should reduce recorded stock.</OperationEmpty>
  const usage = theoreticalUsage(report, state), posted = events.find(event => event.kind === 'usage' && event.referenceId === report.id)
  let eligibility = ''
  try { prepareSalesUsage(state, report, events) } catch (error) { eligibility = error instanceof Error ? error.message : 'Review the stock baseline.' }
  async function post() {
    if (!confirmed || posting) return
    const key = `mise-pmix-request:${scope}:${demo ? 'demo' : 'live'}`
    setPosting(true); setMessage('')
    try {
      let input = pending.current
      try { if (!input) input = JSON.parse(sessionStorage.getItem(key) ?? 'null') } catch { /* A damaged request record is replaced before any write. */ }
      if (input && input.reportId !== report!.id) throw new Error('Resolve the pending posting for the other report before starting a new one.')
      input ??= { eventId: crypto.randomUUID(), revision, reportId: report!.id, confirmed: true }
      pending.current = input; sessionStorage.setItem(key, JSON.stringify(input))
      if (demo) {
        const next = prepareSalesUsage(state, report!, events), now = new Date().toISOString()
        const event: InventoryEvent = { id: input.eventId, kind: 'usage', occurredOn: report!.through, recordedAt: now, revision: revision + 1, referenceId: report!.id, data: { name: report!.name, source: report!.source, from: report!.from, through: report!.through, lines: next.lines, recipeIds: [...new Set(report!.rows.flatMap(row => row.recipeId ? [row.recipeId] : []))] } }
        sessionStorage.setItem('mise-product-demo-v1', JSON.stringify(next.state)); onSnapshot({ revision: revision + 1, state: next.state, updatedAt: now }); onEvent(event)
      } else {
        const response = await fetch('/api/inventory/usage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mise-Account': scope }, body: JSON.stringify(input), cache: 'no-store', signal: AbortSignal.timeout(20000) })
        const body = await response.json()
        if (!response.ok) { if ([400, 404, 409].includes(response.status)) { pending.current = null; sessionStorage.removeItem(key); onEvent() }; throw new Error(body.error ?? 'The posting could not be confirmed.') }
        onSnapshot({ ...body.snapshot, state: workspaceSchema.parse(body.snapshot.state) }); onEvent()
      }
      pending.current = null; sessionStorage.removeItem(key); setConfirmed(false); setMessage('Sales usage posted once. Recipe quantities and the report reference are kept in inventory history.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The request was not confirmed. Its ID is kept for a safe retry.') }
    finally { setPosting(false) }
  }
  return <div className="operation-page"><div className="operation-toolbar"><label className="operation-select">Sales snapshot<select aria-label="Sales snapshot for stock usage" value={report.id} disabled={posting} onChange={event => { setSelected(event.target.value); setConfirmed(false); setMessage('') }}>{reports.map(report => <option key={report.id} value={report.id}>{report.name} · {report.from}–{report.through}</option>)}</select></label><HelpLink title="Theoretical usage and safe stock posting" onClick={help}/></div>
    <div className="operation-stats"><OperationStat label="Recipe coverage" value={usage.complete ? 'Complete' : 'Needs review'} note={usage.complete ? 'All sold items have usable recipe quantities' : `${usage.issues.length} quantity or matching checks`}/><OperationStat label="Ingredient usage value" value={money(usage.cost)} note="Estimated at current usable ingredient prices"/><OperationStat label="Stock posting" value={posted ? 'Posted' : 'Not posted'} note="A preview never changes your inventory"/></div>
    {!!usage.issues.length && <section className="operation-warnings"><h3>Complete the usage inputs</h3>{usage.issues.map(issue => <p key={issue}>{issue}</p>)}</section>}
    <section className="panel"><div className="plan-heading"><div><h2>From dishes sold to ingredients used</h2><p>{report.from} through {report.through} · quantities use your current recipes and measured batch yields.</p></div><button className="button secondary small" onClick={() => download(csv([['ingredient', 'usable_quantity', 'unit', 'unit_cost_cad', 'estimate_cad'], ...usage.lines.map(line => [line.name, line.quantity, line.unit, line.unitCost, line.unitCost === null ? null : line.quantity * line.unitCost])]), `mise-recipe-usage-${report.from}-${report.through}.csv`, 'text/csv;charset=utf-8')}><Download size={15}/>Export preview</button></div><div className="table-scroll"><table><thead><tr><th>Ingredient</th><th className="numeric">Recipe usage</th><th className="numeric">Recorded stock now</th><th className="numeric">After posting</th></tr></thead><tbody>{usage.lines.map(line => { const stock = state.ingredients.find(item => item.id === line.ingredientId)?.stock ?? null; return <tr key={line.ingredientId}><td><strong>{line.name}</strong></td><td className="numeric">{quantity(line.quantity, line.unit)}</td><td className="numeric">{stock === null ? 'Not counted' : quantity(stock, line.unit)}</td><td className={`numeric ${stock !== null && stock < line.quantity ? 'warning-text' : ''}`}>{stock === null ? '—' : quantity(stock - line.quantity, line.unit)}</td></tr> })}</tbody></table></div></section>
    <section className="panel usage-posting"><PackageCheck size={26}/><div><h3>Post only sales that are not already in your counts</h3><p>A dated baseline must precede this sales period. A later physical count or an overlapping posting blocks depletion, so old PMIX reports are not deducted twice.</p>{eligibility && <p className="warning-text">{eligibility}</p>}<label className="operation-checkbox"><input type="checkbox" checked={confirmed} disabled={!!eligibility || busy || posting} onChange={event => setConfirmed(event.target.checked)}/><span>I reviewed the mapping, modifiers and period. These sales are complete and have not already been deducted from this stock.</span></label><button className="button primary" disabled={!confirmed || !!eligibility || busy || posting} onClick={() => void post()}><Check size={16}/>{posting ? 'Posting…' : 'Post reviewed sales usage'}</button></div></section>
    {message && <p role="status" className="operation-feedback">{message}</p>}
    <OperationNote>This is a reviewed PMIX workflow. Direct POS webhooks are not connected. An old report can still be used for variance review and purchase scenarios when it cannot safely change current stock.</OperationNote>
  </div>
}

export function VarianceReview({ state, scope, demo, events, help }: Pick<Props, 'state' | 'scope' | 'demo' | 'events' | 'help'>) {
  const counts = events.filter((event): event is Extract<InventoryEvent, { kind: 'count' }> => event.kind === 'count')
  const reports = state.operations?.salesReports ?? []
  const [opening, setOpening] = useState(counts.find(event => event.data.phase === 'opening')?.id ?? '')
  const [closing, setClosing] = useState(counts.find(event => event.data.phase === 'closing')?.id ?? '')
  const [reportId, setReportId] = useState(reports[0]?.id ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof reconcileInventory> | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const reset = () => { setResult(null); setConfirmed(false); setMessage('') }
  async function review() {
    setLoading(true); setMessage(''); setResult(null)
    try {
      if (demo) {
        const first = counts.find(event => event.id === opening), last = counts.find(event => event.id === closing), report = reports.find(report => report.id === reportId)
        if (!first || !last || !report) throw new Error('Choose the two physical counts and a sales report.')
        setResult(reconcileInventory(first, last, report, state, events))
      } else {
        const response = await fetch('/api/inventory/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mise-Account': scope }, body: JSON.stringify({ openingId: opening, closingId: closing, reportId, completeSales: confirmed }), cache: 'no-store', signal: AbortSignal.timeout(20000) })
        const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'The review could not be calculated.'); setResult(body.review)
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The review could not be calculated.') }
    finally { setLoading(false) }
  }
  if (counts.length < 2 || !reports.length) return <OperationEmpty icon={<BarChart3 size={31}/>} title="Bookend the sales period with physical counts">Record opening and closing counts, then save a complete sales snapshot for the same service days. Load older history if the counts you need are not listed.</OperationEmpty>
  return <div className="operation-page"><div className="operation-toolbar"><p className="muted-text">Compare counted usage with recipe quantities; investigate the difference.</p><HelpLink title="What inventory variance can tell you" onClick={help}/></div><section className="panel reconciliation-controls"><div className="reconciliation-selects"><label className="plan-field"><span>Opening boundary</span><select value={opening} onChange={event => { setOpening(event.target.value); reset() }}><option value="">Choose count</option>{counts.map(event => <option key={event.id} value={event.id}>{event.occurredOn} · {event.data.name} · {event.data.phase}</option>)}</select></label><label className="plan-field"><span>Closing boundary</span><select value={closing} onChange={event => { setClosing(event.target.value); reset() }}><option value="">Choose count</option>{counts.map(event => <option key={event.id} value={event.id}>{event.occurredOn} · {event.data.name} · {event.data.phase}</option>)}</select></label><label className="plan-field"><span>Sales report for the interval</span><select value={reportId} onChange={event => { setReportId(event.target.value); reset() }}>{reports.map(report => <option key={report.id} value={report.id}>{report.name} · {report.from}–{report.through}</option>)}</select></label></div><label className="operation-checkbox"><input type="checkbox" checked={confirmed} onChange={event => { setConfirmed(event.target.checked); setResult(null) }}/><span>The report covers all sales between these counts, and I reviewed receipts, modifiers and other channels.</span></label><button className="button primary" disabled={!opening || !closing || !reportId || !confirmed || loading} onClick={() => void review()}><BarChart3 size={16}/>{loading ? 'Reviewing…' : 'Calculate usage variance'}</button></section>
    {message && <p role="status" className="operation-feedback error">{message}</p>}
    {result && <><div className="operation-stats"><OperationStat label="Unexplained value difference" value={money(result.varianceValue)} note={result.complete ? 'Positive means more used than recipes plus logged waste' : 'Complete missing counts, dates or recipe inputs'}/><OperationStat label="Manual changes to review" value={String(result.adjustmentCount)} note="Stock edits are flagged, not counted again as receipts"/><OperationStat label="Service period" value={`${result.from.slice(5)}–${result.through.slice(5)}`} note={result.usageBasis}/></div>{!!result.issues.length && <section className="operation-warnings"><h3>Resolve the review boundaries</h3>{result.issues.map(issue => <p key={issue}>{issue}</p>)}</section>}<section className="panel"><div className="plan-heading"><div><h2>The physical count explains the starting point</h2><p>Actual usage = opening stock + received stock − closing stock. Unexplained difference = actual − recipe usage − logged waste.</p></div><button className="button secondary small" onClick={() => download(csv([['ingredient', 'unit', 'opening', 'received', 'closing', 'actual_used', 'recipe_usage', 'logged_waste', 'unexplained_quantity', 'closing_unit_cost_cad', 'unexplained_value_cad', 'checks'], ...result.rows.map(row => [row.name, row.unit, row.opening, row.receipts, row.closing, row.actual, row.theoretical, row.loggedWaste, row.variance, row.unitCost, row.varianceValue, row.issues.join('; ')])]), `mise-inventory-variance-${result.from}-${result.through}.csv`, 'text/csv;charset=utf-8')}><Download size={15}/>Export review</button></div><div className="table-scroll"><table><thead><tr><th>Ingredient</th><th className="numeric">Opening</th><th className="numeric">Received</th><th className="numeric">Closing</th><th className="numeric">Actual used</th><th className="numeric">Recipe use</th><th className="numeric">Waste logged</th><th className="numeric">Unexplained</th><th className="numeric">Value</th></tr></thead><tbody>{result.rows.map(row => <tr key={row.ingredientId}><td><strong>{row.name}</strong><small>{row.unit}{row.adjustments > 0 && ` · ${row.adjustments} manual changes`}</small>{row.issues.map(issue => <small className="warning-text" key={issue}>{issue}</small>)}</td>{[row.opening, row.receipts, row.closing, row.actual, row.theoretical, row.loggedWaste, row.variance].map((value, index) => <td className="numeric" key={index}>{value === null ? '—' : value.toLocaleString('en-CA', { maximumFractionDigits: 2 })}</td>)}<td className="numeric">{money(row.varianceValue)}</td></tr>)}</tbody></table></div></section><OperationNote>Variance is a question to investigate. Portion differences, count mistakes, missing receipts, unrecorded transfers and recipe mismatches can all contribute. Values use the closing count’s saved unit cost; this is not proof of waste or theft.</OperationNote></>}
  </div>
}

export function DemandOrders({ state, busy, save, help, openOrders }: { state: Workspace; busy: boolean; save: (state: Workspace) => Promise<boolean>; help: () => void; openOrders: () => void }) {
  const reports = state.operations?.salesReports ?? []
  const [selected, setSelected] = useState(reports[0]?.id ?? '')
  const [days, setDays] = useState(3), [multiplier, setMultiplier] = useState(1), [confirmed, setConfirmed] = useState(false), [message, setMessage] = useState('')
  const report = reports.find(report => report.id === selected) ?? reports[0]
  if (!report) return <OperationEmpty icon={<ShoppingCart size={31}/>} title="Use a sales period to plan the next order">Import and match a sales report in Menu performance first. The forecast uses its average daily recipe quantities, your cover days and a demand adjustment.</OperationEmpty>
  let forecast: ReturnType<typeof purchaseForecast> | null = null, error = ''
  try { forecast = purchaseForecast(state, report, days, multiplier) } catch (failure) { error = failure instanceof Error ? failure.message : 'Check the forecast assumptions.' }
  async function build() {
    try { const orders = forecastOrders(state, report!, days, multiplier); if (!orders.length) { setMessage('No additional packs are needed under these assumptions. Open orders are already included.'); return }; if (await save({ ...state, orders: [...orders, ...state.orders] })) { setConfirmed(false); setMessage(`${orders.length} purchase drafts added. Review delivery timing and quantities before contacting suppliers.`) } }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'The drafts could not be built.') }
  }
  return <div className="operation-page"><div className="operation-toolbar"><p className="muted-text">A transparent demand scenario. Drafts remain yours to review.</p><HelpLink title="How sales-based order suggestions work" onClick={help}/></div><section className="panel reconciliation-controls"><div className="reconciliation-selects"><label className="plan-field"><span>Historical sales snapshot</span><select value={report.id} onChange={event => { setSelected(event.target.value); setConfirmed(false) }}>{reports.map(report => <option key={report.id} value={report.id}>{report.name} · {report.from}–{report.through}</option>)}</select></label><label className="plan-field"><span>Days of stock to cover</span><input type="number" min="1" max="30" step="1" value={days} onChange={event => { setDays(Number(event.target.value)); setConfirmed(false) }}/></label><label className="plan-field"><span>Demand multiplier</span><input type="number" min="0.01" max="5" step="0.05" value={multiplier} onChange={event => { setMultiplier(Number(event.target.value)); setConfirmed(false) }}/><small>1.00 repeats the report’s average. 1.20 assumes 20% more demand.</small></label></div></section>
    {error && <p className="operation-feedback error" role="alert">{error}</p>}
    {forecast && <><div className="operation-stats"><OperationStat label="Sales-period length" value={`${forecast.span} days`} note="Calendar days, including days with no sales"/><OperationStat label="Suggested extra packs" value={forecast.complete && forecast.forecast.every(line => line.packs !== null) ? String(forecast.forecast.reduce((sum, line) => sum + line.packs!, 0)) : '—'} note="After current stock and all open order quantities"/><OperationStat label="Draft purchase value" value={money(forecast.complete && forecast.forecast.every(line => line.cost !== null) ? forecast.forecast.reduce((sum, line) => sum + line.cost!, 0) : null)} note="Current full-pack prices; delivery charges excluded"/></div>{!!forecast.issues.length && <section className="operation-warnings"><h3>Complete the demand inputs</h3>{forecast.issues.map(issue => <p key={issue}>{issue}</p>)}</section>}<section className="panel"><div className="table-scroll"><table><thead><tr><th>Ingredient</th><th className="numeric">Daily recipe use</th><th className="numeric">Target to cover</th><th className="numeric">On hand</th><th className="numeric">Open orders</th><th className="numeric">Extra packs</th><th className="numeric">Pack cost</th></tr></thead><tbody>{forecast.forecast.map(line => <tr key={line.ingredientId}><td><strong>{line.name}</strong><small>{line.unit} · target is the higher of demand or your par</small></td><td className="numeric">{line.daily.toFixed(2)}</td><td className="numeric">{line.target.toFixed(2)}</td><td className="numeric">{line.ingredient.stock === null ? 'Not counted' : line.ingredient.stock.toFixed(2)}</td><td className="numeric">{line.incoming.toFixed(2)}</td><td className="numeric">{line.packs ?? 'Review inputs'}</td><td className="numeric">{money(line.cost)}</td></tr>)}</tbody></table></div></section><label className="operation-checkbox"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/><span>I checked report coverage, recent stock counts, open order delivery dates and the demand assumption.</span></label><div className="operation-actions"><button className="button primary" disabled={!confirmed || busy || !forecast.complete || forecast.forecast.some(line => line.packs === null)} onClick={() => void build()}><ShoppingCart size={16}/>Build purchase drafts</button><button className="button secondary" onClick={openOrders}>Review purchase orders<ArrowRight size={15}/></button></div></>}
    {message && <p role="status" className="operation-feedback">{message}</p>}<OperationNote>This is an average-use scenario, not a guaranteed demand prediction. It does not know weather, events, supplier lead times or whether a pending delivery will arrive before service. Nothing is sent to a supplier automatically.</OperationNote>
  </div>
}
