'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, FolderArchive, Loader2, Search, Users, BarChart3 } from 'lucide-react'
import { fabergeReportSchema, type FabergeReport, type SourceFile, type SourcePage } from '@/lib/workspace/faberge'
import { money } from '@/lib/workspace/domain'
import { csv, download } from '@/lib/workspace/import-export'

export type DataView = 'sales' | 'team' | 'sources'
const date = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' })
const sourceLink = (id: string) => `/api/faberge/file?id=${encodeURIComponent(id)}`
const number = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 }).format(value)

export function FabergeData({ view }: { view: DataView }) {
  const [report, setReport] = useState<FabergeReport | null>(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/faberge', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'The import could not be loaded.')
      setReport(result.report ? fabergeReportSchema.parse(result.report) : null)
      setLoaded(true)
    }).catch(error => { if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : 'Please retry.'); setLoaded(true) } })
    return () => controller.abort()
  }, [retry])
  function retryLoad(){setLoaded(false);setError('');setRetry(n=>n+1)}
  if (!loaded) return <div className="data-loading" role="status"><Loader2 size={23} className="spin"/>Loading your imported records…</div>
  if (error) return <section className="panel data-message" role="alert"><AlertCircle size={24}/><p>{error}</p><button className="button secondary" onClick={retryLoad}>Retry</button></section>
  if (!report) return <section className="panel data-message"><FolderArchive size={30}/><h2>Your imported records</h2><p>Imported files and historical reports will appear here when the import is complete.</p><button className="button secondary" onClick={retryLoad}>Refresh import status</button></section>
  return <div className="faberge-data">{view === 'sales' ? <Sales report={report}/> : view === 'team' ? <Team report={report}/> : <Sources report={report}/>}</div>
}

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return <div className="data-stat"><small>{title}</small><strong>{value}</strong><span>{note}</span></div>
}
function Heading({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  return <div className="data-heading"><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</div>
}
function Note({ children }: { children: ReactNode }) { return <div className="data-note"><AlertCircle size={18}/><div>{children}</div></div> }
function Toolbar({ query, setQuery, exportRows }: { query: string; setQuery: (v: string) => void; exportRows: () => void }) {
  return <div className="table-toolbar"><div className="search-box"><Search size={17}/><input aria-label="Search imported records" placeholder="Search records…" value={query} maxLength={150} onChange={e => setQuery(e.target.value)}/></div><button className="button secondary small" onClick={exportRows}><Download size={15}/>Export this view</button></div>
}
function Tabs<T extends string>({ value, setValue, tabs }: { value: T; setValue: (v: T) => void; tabs: [T, string][] }) {
  return <div className="filter-tabs data-tabs" role="group" aria-label="Report view">{tabs.map(([id, label]) => <button key={id} aria-pressed={value === id} className={value === id ? 'selected' : ''} onClick={() => setValue(id)}>{label}</button>)}</div>
}

function Sales({ report }: { report: FabergeReport }) {
  const [section, setSection] = useState<'daily' | 'items' | 'categories' | 'hours' | 'menu'>('daily')
  const [query, setQuery] = useState('')
  const { summary, sales } = report
  const account = sales.controls.find(c => c.report === 'Account')
  const matches = (text: string) => text.toLowerCase().includes(query.toLowerCase())
  let headers: string[], rows: (string | number | null)[][]
  if (section === 'daily') {
    headers = ['date', 'item_sales_cad', 'quantity', 'receipts']
    rows = sales.daily.filter(r => matches(r.date)).map(r => [r.date, r.sales, r.quantity, r.receipts])
  } else if (section === 'items') {
    headers = ['item_id', 'item', 'category', 'quantity', 'item_sales_cad']
    rows = sales.items.filter(r => matches(`${r.name} ${r.category}`)).map(r => [r.id, r.name, r.category, r.quantity, r.sales])
  } else if (section === 'categories') {
    headers = ['category', 'quantity', 'item_sales_cad']
    rows = sales.categories.filter(r => matches(r.name)).map(r => [r.name, r.quantity, r.sales])
  } else if (section === 'hours') {
    headers = ['hour', 'reported_sales_cad']
    rows = sales.hours.filter(r => matches(r.hour)).map(r => [r.hour, r.sales])
  } else {
    headers = ['item', 'category', 'sold', 'historical_cost_cad', 'average_selling_price_cad', 'item_revenue_cad', 'classification', 'cost_basis']
    rows = sales.menu.filter(r => matches(`${r.name} ${r.category}`)).map(r => [r.name, r.category, r.sold, r.foodCost, r.sellingPrice, r.revenue, r.classification, r.basis])
  }
  return <>
    <section className="data-hero"><span className="data-hero-icon"><BarChart3 size={30}/></span><div><span className="eyebrow">IMPORTED POS HISTORY</span><h2>{date(summary.salesFrom)} – {date(summary.salesThrough)}</h2><p>{number(summary.salesRows)} item rows across {summary.salesDates} recorded sales dates. The recorded date range follows the item-detail export.</p></div></section>
    <div className="data-stats"><Stat title="Item-detail sales" value={money(summary.salesTotal)} note="Options are in a separate export"/><Stat title="Receipts" value={number(summary.receipts)} note="Unique receipt numbers per date"/><Stat title="Recorded sales dates" value={String(summary.salesDates)} note="Days present in item detail"/><Stat title="Account report" value={money(account?.total ?? null)} note="Separate control; includes options"/></div>
    <Note>The item, category, hourly and account exports have different control totals. These views preserve each basis. Options are not allocated by date, and no report total is added to another.</Note>
    <Tabs value={section} setValue={setSection} tabs={[[ 'daily', 'Daily sales' ],[ 'items', 'By item' ],[ 'categories', 'By category' ],[ 'hours', 'By hour' ],[ 'menu', 'Menu engineering' ]]}/>
    {section === 'menu' && <Note>Sales are matched to the source menu. Ingredient costs reflect historical workbook assumptions. Confirm current invoice prices and recipe inputs in Recipe costing.</Note>}
    {section === 'hours' && <Note>The hourly export reports {money(sales.hours.reduce((sum, row) => sum + (row.sales ?? 0), 0))}. Its basis differs from the item-detail total.</Note>}
    <Toolbar query={query} setQuery={setQuery} exportRows={() => download(csv([headers, ...rows]), `mise-${section}-sales.csv`, 'text/csv;charset=utf-8')}/>
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr>{headers.map(h => <th key={h}>{h.replaceAll('_', ' ').replace('cad', '(CAD)')}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((value, col) => <td key={col} className={typeof value === 'number' ? 'numeric' : ''}>{headers[col].endsWith('_cad') ? money(value as number | null) : typeof value === 'number' ? number(value) : value ?? '—'}</td>)}</tr>)}</tbody></table>{!rows.length && <div className="no-results">No records match this search.</div>}</div></section>
    <section className="panel data-controls"><Heading title="Report controls" note="Original export totals, retained for reconciliation."/><div className="table-scroll"><table><thead><tr><th>Export</th><th className="numeric">Reported total</th><th>Original file</th></tr></thead><tbody>{sales.controls.map(c => <tr key={c.report}><td>{c.report}</td><td className="numeric">{money(c.total)}</td><td><a className="text-button" href={sourceLink(c.fileId)}><Download size={14}/>Download</a></td></tr>)}</tbody></table></div><p className="data-footnote">Item detail + options = {money(summary.salesTotal + (sales.controls.find(c => c.report === 'Extra - Options')?.total ?? 0))}; the Account export differs by $0.05. Corrections and discounts are preserved in Sources and are not automatically deducted again.</p></section>
  </>
}

function Team({ report }: { report: FabergeReport }) {
  const [section, setSection] = useState<'schedule' | 'payroll'>('schedule')
  const [query, setQuery] = useState('')
  const [year, setYear] = useState(report.team.payrollSummary.year)
  const { schedule, payroll, payrollSummary: current } = report.team
  const years = [...new Set(payroll.map(p => p.year))]
  const periodRows = payroll.filter(p => p.year === year && `${p.period} ${p.year}`.toLowerCase().includes(query.toLowerCase()))
  const staff = schedule.filter(p => `${p.name} ${p.role}`.toLowerCase().includes(query.toLowerCase()))
  const total = schedule.reduce((sum, person) => sum + (person.weeklyCost ?? 0), 0)
  function exportRows() {
    const rows = section === 'schedule'
      ? [['employee','role','pay_type','rate','mon','tue','wed','thu','fri','sat','sun','day_unit','weekly_hours','planned_wages_cad'], ...staff.map(p => [p.name,p.role,p.payType,p.rate,...p.days,p.dayUnit,p.hours,p.weeklyCost])]
      : [['year','period','sales_cad','foh_cad','boh_cad','admin_cad','management_separate_cad','reported_payroll_cad'], ...periodRows.map(p => [p.year,p.period,p.sales,p.foh,p.boh,p.admin,p.management,p.reportedTotal])]
    download(csv(rows),`mise-${section}.csv`,'text/csv;charset=utf-8')
  }
  return <>
    <section className="data-hero"><span className="data-hero-icon"><Users size={30}/></span><div><span className="eyebrow">STAFFING & PAYROLL</span><h2>Your roster and payroll history</h2><p>The roster is an undated draft. Historical payroll periods and original workbook calculations remain available below and in Sources.</p></div></section>
    <div className="data-stats"><Stat title="Draft weekly kitchen wages" value={money(total)} note="Unapproved plan; gross wages only"/><Stat title="Roster entries" value={String(schedule.length)} note="Includes two unnamed dishwasher roles"/><Stat title="Reported payroll" value={money(current.reportedTotal)} note={current.coverage}/><Stat title="Management, shown separately" value={money(current.management)} note="Not added to the reported total"/></div>
    <Tabs value={section} setValue={setSection} tabs={[[ 'schedule', 'Draft roster' ],[ 'payroll', 'Payroll history' ]]}/>
    {section === 'schedule' ? <Note>The chef row uses work days and a daily salary allocation. It does not record hours. Hourly staff rows use hours. Confirm names, approved week, shifts and rates before using this as a service schedule.</Note> : <Note>The current-year reported payroll is FOH + BOH + Administration. Management is a separate column and remains unreconciled. Missing values and original spreadsheet errors are preserved in Sources.</Note>}
    <Toolbar query={query} setQuery={setQuery} exportRows={exportRows}/>
    {section === 'payroll' && <label className="data-select">Fiscal sheet<select value={year} onChange={e => setYear(e.target.value)}>{years.map(year => <option key={year}>{year}</option>)}</select></label>}
    <section className="panel table-panel"><div className="table-scroll">{section === 'schedule' ? <table><thead><tr><th>Employee / role</th><th>Pay basis / rate</th>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <th className="numeric" key={d}>{d}</th>)}<th className="numeric">Hours</th><th className="numeric">Planned wages</th></tr></thead><tbody>{staff.map(p => <tr key={p.name}><td><strong>{p.name}</strong><small>{p.role}</small></td><td>{p.payType}<small>{money(p.rate)} / {p.payType === 'Salary' ? 'work day' : 'hour'}</small></td>{p.days.map((hours, i) => <td key={i} className="numeric">{number(hours)}<small>{p.dayUnit}</small></td>)}<td className="numeric">{number(p.hours)}</td><td className="numeric">{money(p.weeklyCost)}</td></tr>)}</tbody></table> : <table><thead><tr><th>Period</th><th className="numeric">Net sales</th><th className="numeric">FOH</th><th className="numeric">BOH</th><th className="numeric">Admin</th><th className="numeric">Management, separate</th><th className="numeric">Reported total</th></tr></thead><tbody>{periodRows.map(p => <tr key={p.period}><td>{p.period}</td>{[p.sales,p.foh,p.boh,p.admin,p.management,p.reportedTotal].map((n,i) => <td className="numeric" key={i}>{money(n)}</td>)}</tr>)}</tbody></table>}</div></section>
    <div className="data-source-links"><a className="button secondary small" href={sourceLink(report.team.scheduleFileId)}><Download size={15}/>Original roster</a><a className="button secondary small" href={sourceLink(current.fileId)}><Download size={15}/>Original payroll workbook</a></div>
  </>
}

function Sources({ report }: { report: FabergeReport }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All files')
  const [selected, setSelected] = useState<SourceFile | null>(null)
  const files = report.files.filter(file => (category === 'All files' || file.category === category) && file.name.toLowerCase().includes(query.toLowerCase()))
  if (selected) return <SourceBrowser file={selected} back={() => setSelected(null)}/>
  return <>
    <section className="data-hero"><span className="data-hero-icon"><FolderArchive size={30}/></span><div><span className="eyebrow">YOUR SOURCE LIBRARY</span><h2>{report.files.length} original files, together</h2><p>Browse {report.summary.tables} imported sheets and documents, or download the exact original file. Blank cells, source formulas and historical calculations are preserved.</p></div></section>
    <div className="data-stats"><Stat title="Purchasing products" value={String(report.summary.priceProducts)} note={`${report.summary.recipeInputs} additional recipe inputs to confirm`}/><Stat title="Working recipes" value={String(report.summary.recipes)} note="Drafts retain missing costs and yields"/><Stat title="Prep templates" value={String(report.summary.prepTemplates)} note="No service dates invented"/><Stat title="Import completed" value={new Date(report.importedAt).toLocaleDateString('en-CA', { month:'short',day:'numeric',timeZone:'America/Toronto' })} note={`${report.receipt?.keptExisting ?? 0} existing records preserved`}/></div>
    <section className="panel data-quality"><Heading title="Inputs to finish" note="These points came from the source files."/><div className="data-issue-grid">{report.issues.map(issue => <article key={issue.title}><AlertCircle size={17}/><div><h3>{issue.title}</h3><p>{issue.detail}</p></div></article>)}</div></section>
    <div className="table-toolbar"><div className="search-box"><Search size={17}/><input aria-label="Search source files" placeholder="Find a workbook, report or recipe…" value={query} onChange={e=>setQuery(e.target.value)}/></div><label className="data-select"><span className="sr-only">File category</span><select value={category} onChange={e=>setCategory(e.target.value)}>{['All files', ...new Set(report.files.map(f=>f.category))].map(category=><option key={category}>{category}</option>)}</select></label></div>
    <div className="source-file-grid">{files.map(file => <article className="panel source-file" key={file.id}><div className="source-file-top">{file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? <FileSpreadsheet size={25}/> : <FileText size={25}/>}<span className={`badge ${file.status==='draft'?'warning':'neutral'}`}>{file.status==='draft'?'Draft':file.status==='reference'?'Historical reference':'Imported snapshot'}</span></div><h3>{file.name}</h3><p>{file.category} · {file.tables.length} {file.tables.length===1?'sheet':'sheets'} · {(file.bytes / 1024).toFixed(0)} KB</p><small>File saved {new Date(file.modifiedAt).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Toronto'})}</small><div className="source-file-actions">{file.tables.length>0 && <button className="button secondary small" onClick={()=>setSelected(file)}>Browse data<ChevronRight size={14}/></button>}<a className="text-button" href={sourceLink(file.id)} aria-label={`Download original ${file.name}`}><Download size={14}/>Original</a></div></article>)}</div>{!files.length && <div className="no-results">No source files match this search.</div>}
  </>
}

function formatCell(value: string | number | boolean | null, format?: string, formula?: string) {
  if (value === null || value === undefined) return formula ? 'Not calculated' : ''
  if (typeof value !== 'number') return String(value)
  if (format?.includes('%')) return `${new Intl.NumberFormat('en-CA',{maximumFractionDigits:2}).format(value*100)}%`
  if (format?.includes('$')) return money(value)
  return new Intl.NumberFormat('en-CA',{maximumFractionDigits:6}).format(value)
}

function SourceBrowser({ file, back }: { file: SourceFile; back: () => void }) {
  const [tableId, setTableId] = useState(file.tables[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState<SourcePage | null>(null)
  const [resultKey,setResultKey]=useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const requestKey=JSON.stringify([tableId,query,offset,retry])
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ id:tableId,offset:String(offset),q:query })
    const timer = setTimeout(() => {
      fetch(`/api/faberge/table?${params}`, {cache:'no-store',signal:controller.signal}).then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'This source could not be loaded.')
        setError('');setPage(result)
      }).catch(error => { if(!controller.signal.aborted) setError(error instanceof Error?error.message:'Please retry.') }).finally(()=>{if(!controller.signal.aborted)setResultKey(requestKey)})
    }, query ? 250 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  },[tableId,offset,query,retry,requestKey])
  return <>
    <button className="text-button source-back" onClick={back}><ArrowLeft size={15}/>All source files</button>
    <section className="panel source-browser"><Heading title={file.name} note="Original values and cached calculations. Editing kitchen records does not alter the source file." action={<a className="button secondary small" href={sourceLink(file.id)}><Download size={15}/>Download original</a>}/><div className="source-browser-controls"><label className="data-select">Sheet / document<select value={tableId} onChange={e=>{setTableId(e.target.value);setOffset(0)}}>{file.tables.map(table=><option value={table.id} key={table.id}>{table.name} ({table.rows} rows)</option>)}</select></label><div className="search-box"><Search size={16}/><input aria-label="Search cells in this source" placeholder="Search cells in this sheet…" maxLength={150} value={query} onChange={e=>{setQuery(e.target.value);setOffset(0)}}/></div></div>
      {resultKey!==requestKey ? <div className="data-loading" role="status"><Loader2 size={20} className="spin"/>Loading source rows…</div> : error ? <div className="data-message" role="alert"><p>{error}</p><button className="button secondary" onClick={()=>setRetry(n=>n+1)}>Retry</button></div> : page && <>
        <div className="source-page-meta"><span>{number(page.total)} rows{query?' match':''} · showing {page.total?offset+1:0}–{Math.min(offset+50,page.total)}</span><button className="text-button" disabled={!page.rows.length} onClick={()=>download(csv([['source_row',...page.columns],...page.rows.map(row=>[row.row,...row.cells])]),'mise-source-page.csv','text/csv;charset=utf-8')}><Download size={14}/>Export this page</button></div>
        <div className="table-scroll source-grid"><table><thead><tr><th>Source row</th>{page.columns.map((col,i)=><th key={i}>{col}</th>)}</tr></thead><tbody>{page.rows.map(row=><tr key={row.row}><th scope="row">{row.row}</th>{page.columns.map((_,i)=>{const raw=row.cells[i]??null;const content=formatCell(raw,row.formats?.[String(i)],row.formulas?.[String(i)]);return <td key={i} title={row.formulas?.[String(i)]} className={typeof raw==='number'?'numeric':typeof raw==='string'&&/^#(REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!)/.test(raw)?'source-error':''}>{content.length>220?<details><summary>{content.slice(0,180)}…</summary><div>{content}</div></details>:content}</td>})}</tr>)}</tbody></table>{!page.rows.length && <div className="no-results">No source rows match.</div>}</div>
        <div className="source-pagination"><button className="button secondary small" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-50))}><ChevronLeft size={15}/>Previous</button><span>Page {Math.floor(offset/50)+1} of {Math.max(1,Math.ceil(page.total/50))}</span><button className="button secondary small" disabled={page.nextOffset===null} onClick={()=>{if(page.nextOffset!==null)setOffset(page.nextOffset)}}>Next<ChevronRight size={15}/></button></div>
      </>}
    </section>
  </>
}
