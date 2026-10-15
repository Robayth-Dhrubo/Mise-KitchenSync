'use client'

import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, BarChart3, Download, FileSpreadsheet, Plus, Save, Trash2, Upload } from 'lucide-react'
import { kitchenDay, money, type Workspace } from '@/lib/workspace/domain'
import { analyseMenu, importSales, salesHeaders, storeSalesReport } from '@/lib/workspace/menu-analysis'
import { addDays, type SalesReport } from '@/lib/workspace/operations'
import { csv, download } from '@/lib/workspace/import-export'
import { Field, FormDialog } from './editors'
import { HelpLink, OperationEmpty, OperationNote, OperationStat, useUnsavedChanges } from './operations-ui'

type Props = { state: Workspace; busy: boolean; save: (state: Workspace) => Promise<boolean>; help: () => void; openRecipes: () => void }
const number = (value: string) => value === '' ? null : Number(value)

export function MenuPerformance({ state, busy, save, help, openRecipes }: Props) {
  const reports = state.operations?.salesReports ?? []
  const [selected, setSelected] = useState(reports[0]?.id ?? '')
  const [importOpen, setImportOpen] = useState(false)
  const [candidate, setCandidate] = useState<SalesReport | null>(null)
  const report = candidate ?? reports.find(item => item.id === selected) ?? reports[0]
  function beginImport() { if (window.dispatchEvent(new Event('mise-before-navigate', { cancelable: true }))) setImportOpen(true) }
  function choose(value: string) {
    if (!window.dispatchEvent(new Event('mise-before-navigate', { cancelable: true }))) return
    setCandidate(null); setSelected(value)
  }
  return <div className="operation-page">
    <section className="operation-hero"><div><span className="eyebrow">FROM SALES TO A BETTER MENU</span><h2>See what earns its place.</h2><p>Bring in a sales snapshot. Match it to your recipes. Review demand and ingredient contribution together.</p></div><BarChart3 size={42} strokeWidth={1.4}/></section>
    <div className="operation-toolbar"><div className="operation-actions"><button className="button primary" disabled={busy || !!candidate} onClick={beginImport}><Plus size={16}/>Import sales report</button><button className="button secondary" onClick={() => download(csv([salesHeaders]), 'mise-sales-template.csv', 'text/csv;charset=utf-8')}><Download size={16}/>CSV template</button></div><HelpLink title="How menu analysis works" onClick={help}/></div>
    {!!reports.length && <label className="operation-select">Sales snapshot<select value={candidate ? '' : report?.id ?? ''} disabled={busy} onChange={event => choose(event.target.value)}>{candidate && <option value="">Unsaved import preview</option>}{reports.map(item => <option key={item.id} value={item.id}>{item.name} · {item.from} to {item.through}</option>)}</select></label>}
    {report ? <ReportReview key={report.id} report={report} state={state} busy={busy} isNew={!!candidate} save={save} openRecipes={openRecipes} discard={() => setCandidate(null)} saved={() => { setSelected(report.id); setCandidate(null) }}/>
      : <OperationEmpty icon={<FileSpreadsheet size={32}/>} title="Start with a report from your till" action={<button className="button primary" onClick={beginImport}><Upload size={16}/>Add your first sales snapshot</button>}>Use one row per sold item, with its quantity and net sales before tax and tips. You will review the dates and recipe links before saving.</OperationEmpty>}
    {importOpen && <SalesImport state={state} busy={busy} close={() => setImportOpen(false)} preview={value => { setCandidate(value); setImportOpen(false) }}/ >}
  </div>
}

function SalesImport({ state, busy, close, preview }: { state: Workspace; busy: boolean; close: () => void; preview: (report: SalesReport) => void }) {
  const today = kitchenDay()
  const [name, setName] = useState('Menu review')
  const [from, setFrom] = useState(addDays(today, -6))
  const [through, setThrough] = useState(today)
  const [source, setSource] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  async function read(value?: File) {
    if (!value) return
    setReading(true); setError('')
    try {
      if (value.size > 1_000_000) throw new Error('Choose a sales CSV smaller than 1 MB.')
      setText(await value.text()); if (!source) setSource(value.name.slice(0, 200))
    } catch (error) { setError(error instanceof Error ? error.message : 'The file could not be read.') }
    finally { setReading(false) }
  }
  function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    try { preview(importSales(text, state, { id: crypto.randomUUID(), name, from, through, source })) }
    catch (error) { setError(error instanceof Error ? error.message : 'Check the CSV and dates.') }
  }
  return <FormDialog title="Import a sales snapshot" description="Nothing changes until you review and save the report." close={close} busy={busy || reading}><form onSubmit={submit}><fieldset disabled={busy || reading}><div className="form-grid">
    <Field label="Report name" wide><input value={name} required maxLength={120} onChange={event => setName(event.target.value)}/></Field>
    <Field label="Sales from"><input type="date" required value={from} onChange={event => setFrom(event.target.value)}/></Field>
    <Field label="Sales through"><input type="date" required value={through} onChange={event => setThrough(event.target.value)}/></Field>
    <Field label="Report source" wide hint="Name the till export or channel. Reports from the same source and dates are protected against duplicate imports."><input required maxLength={200} placeholder="e.g. Till item sales" value={source} onChange={event => setSource(event.target.value)}/></Field>
    <div className="form-field wide"><span>Sales CSV</span><button className="button secondary" type="button" onClick={() => file.current?.click()}><Upload size={16}/>{reading ? 'Reading…' : 'Choose CSV file'}</button><input ref={file} className="sr-only" tabIndex={-1} type="file" accept=".csv,text/csv" onChange={event => { void read(event.target.files?.[0]); event.target.value = '' }}/></div>
    <Field label="Or paste CSV contents" wide hint="Required headings: item, quantity, net_sales_cad. Use non-negative net totals per item; combine duplicate names."><textarea rows={6} required maxLength={1_000_000} spellCheck={false} placeholder={'item,quantity,net_sales_cad\nMonte Cristo,80,1920'} value={text} onChange={event => setText(event.target.value)}/></Field>
  </div><OperationNote>Exclude tax and tips. Export net item totals after relevant discounts and returns. Include modifier revenue only when the linked recipe covers those ingredients.</OperationNote></fieldset>{error && <p className="operation-feedback error" role="alert">{error}</p>}<div className="form-footer"><button type="button" className="button secondary" disabled={reading} onClick={close}>Cancel</button><button className="button primary" disabled={busy || reading}>Review import<ArrowRight size={16}/></button></div></form></FormDialog>
}

function ReportReview({ report, state, busy, isNew, save, saved, discard, openRecipes }: Omit<Props, 'help'> & { report: SalesReport; isNew: boolean; saved: () => void; discard: () => void }) {
  const [draft, setDraft] = useState(report)
  const [source, setSource] = useState(report)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [scenarioRow, setScenarioRow] = useState('')
  const [price, setPrice] = useState<number | null>(null)
  if (source !== report) { setSource(report); setDraft(report) }
  const dirty = isNew || JSON.stringify(draft) !== JSON.stringify(report)
  useUnsavedChanges(dirty)
  const result = analyseMenu(draft, state)
  const rows = result.rows.filter(row => row.item.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || filter === 'missing' && row.foodCost === null || row.action === filter))
  const scenario = result.rows.find(row => row.id === scenarioRow)
  const delta = scenario && scenario.averagePrice !== null && price !== null && Number.isFinite(price) && price >= 0 ? (price - scenario.averagePrice) * scenario.quantity : null
  async function submit() {
    setMessage('')
    try { if (await save(storeSalesReport(state, draft, isNew ? undefined : draft.id))) { setMessage('Sales report and recipe links saved.'); saved() } }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The report could not be saved.') }
  }
  async function remove() {
    if (!window.confirm('Delete this sales snapshot? Recipes and original source files will be kept.')) return
    if (await save({ ...state, operations: { ...state.operations!, salesReports: state.operations!.salesReports.filter(item => item.id !== report.id) } })) saved()
  }
  function exportAnalysis() {
    download(csv([
      ['report', draft.name], ['from', draft.from], ['through', draft.through], ['source', draft.source], ['cost_basis', 'Current ingredient prices; excludes labour and overhead'], [],
      ['item', 'linked_recipe', 'units', 'net_sales_cad', 'current_portion_cost_cad', 'estimated_ingredient_cost_cad', 'ingredient_contribution_cad', 'action', 'reason'],
      ...result.rows.map(row => [row.item, row.recipe?.name, row.quantity, row.netSales, row.portionCost, row.foodCost, row.contribution, row.action, row.reason]),
    ]), `mise-menu-review-${draft.from}-${draft.through}.csv`, 'text/csv;charset=utf-8')
  }
  return <>
    <div className="snapshot-heading"><div><span className={`badge ${isNew ? 'warning' : 'good'}`}>{isNew ? 'Review before saving' : 'Saved snapshot'}</span><h3>{draft.name}</h3><p>{draft.from} – {draft.through} · {draft.source}</p></div><button className="button secondary" onClick={exportAnalysis}><Download size={16}/>Export analysis</button></div>
    <div className="operation-stats"><OperationStat label="Recorded net sales" value={money(result.netSales)} note={`${result.units.toLocaleString('en-CA')} units in this report`}/><OperationStat label="Ingredient contribution" value={money(result.contribution)} note={result.missing ? `${result.missing} sold items still need costs` : 'Estimated using current ingredient costs'}/><OperationStat label="Weighted food cost" value={result.foodPct === null ? '—' : `${result.foodPct.toFixed(1)}%`} note="Current ingredient cost ÷ recorded net sales"/></div>
    <OperationNote>Current costs against historical sales are an estimate, before labour and overhead. {result.missing ? 'Complete the missing recipe links or costs to see a total contribution.' : 'Use the item actions as prompts for a menu review.'}</OperationNote>
    <section className="panel"><div className="plan-heading"><div><h2>Match the sales. Understand the dish.</h2><p>Review every suggested recipe link. Sales from different snapshots are never added together.</p></div><button className="text-button" onClick={openRecipes}>Open recipe costing<ArrowRight size={14}/></button></div>
      <div className="operation-table-tools"><label className="search-box"><span className="sr-only">Search sold items</span><input value={query} placeholder="Search sold items…" onChange={event => setQuery(event.target.value)}/></label><label className="operation-select"><span className="sr-only">Filter menu actions</span><select value={filter} onChange={event => setFilter(event.target.value)}>{['all', 'missing', 'Feature it', 'Review the margin', 'Improve visibility', 'Review the dish'].map(value => <option key={value} value={value}>{value === 'all' ? 'All menu actions' : value === 'missing' ? 'Missing recipe costs' : value}</option>)}</select></label></div>
      <div className="table-scroll"><table><caption className="sr-only">Sales quantities, recipe links, estimated contribution and recommended review actions</caption><thead><tr><th>Sold item / linked recipe</th><th className="numeric">Units</th><th className="numeric">Net sales</th><th className="numeric">Cost / portion</th><th className="numeric">Contribution</th><th>Review action</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.item}</strong><label><span className="sr-only">Recipe for {row.item}</span><select className="recipe-match" disabled={busy} value={row.recipeId ?? ''} onChange={event => setDraft(value => ({ ...value, rows: value.rows.map(item => item.id === row.id ? { ...item, recipeId: event.target.value || null } : item) }))}><option value="">Choose recipe…</option>{state.recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label></td><td className="numeric">{row.quantity.toLocaleString('en-CA')}</td><td className="numeric">{money(row.netSales)}</td><td className="numeric">{money(row.portionCost)}</td><td className="numeric">{money(row.contribution)}</td><td><span className={`badge ${row.action === 'Feature it' ? 'good' : row.action === 'Complete inputs' ? 'neutral' : 'warning'}`}>{row.action}</span><small className="menu-action-reason">{row.reason}</small></td></tr>)}</tbody></table>{!rows.length && <p className="no-results">No sold items match this view.</p>}</div>
      <details className="operation-method"><summary>How these actions are calculated</summary><p>{result.comparableCount} sold item rows have complete ingredient costs. High contribution means at least the quantity-weighted average ({money(result.averageContribution)} per unit). A popular item reaches at least {result.popularityThreshold === null ? '—' : `${(result.popularityThreshold * 100).toFixed(1)}%`} of units among those comparable rows: 70% of an equal share. Missing costs and zero-sale rows are excluded from that comparison.</p></details>
    </section>
    <section className="panel price-scenario"><div><span className="eyebrow">TRY A CHANGE BEFORE YOU COMMIT</span><h2>What if the price changed?</h2><p>Hold this report’s sales volume constant and compare a different price. The saved menu price stays as it is.</p></div><label className="plan-field"><span>Sold item</span><select value={scenarioRow} onChange={event => { setScenarioRow(event.target.value); setPrice(null) }}><option value="">Choose an item</option>{result.rows.filter(row => row.quantity > 0 && row.portionCost !== null).map(row => <option key={row.id} value={row.id}>{row.item}</option>)}</select></label><label className="plan-field"><span>Test selling price (CAD)</span><input type="number" min="0" max="1000000" step="0.01" value={price ?? ''} placeholder={scenario?.averagePrice?.toFixed(2) ?? 'Enter a price'} onChange={event => setPrice(number(event.target.value))}/></label><div className="scenario-delta"><small>Estimated contribution change</small><strong>{money(delta)}</strong><p>{scenario ? `At the same ${scenario.quantity} units. Demand, portions and costs held constant.` : 'Select a costed item and enter a price.'}</p></div></section>
    {message && <p className="operation-feedback" role="status">{message}</p>}
    <div className="plan-save"><span>{dirty ? 'Unsaved report changes' : 'Saved recipe links'} · Current cost basis</span><div>{isNew ? <button className="button secondary" onClick={() => { if (window.confirm('Discard this unsaved sales import?')) discard() }}>Discard import</button> : <button className="button danger-text" disabled={busy} onClick={() => void remove()}><Trash2 size={15}/>Delete snapshot</button>}<button className="button primary" disabled={busy || !dirty} onClick={() => void submit()}><Save size={16}/>{busy ? 'Saving…' : isNew ? 'Save sales report' : 'Save recipe links'}</button></div></div>
  </>
}
