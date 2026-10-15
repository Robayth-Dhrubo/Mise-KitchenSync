'use client'

import { useState, type FormEvent } from 'react'
import { Archive, Check, CheckCheck, Download, Moon, Pencil, Plus, Save, Sun } from 'lucide-react'
import { kitchenDay, type Workspace } from '@/lib/workspace/domain'
import { emptyOperations, routineSchema, suggestedRoutines, type Routine } from '@/lib/workspace/operations'
import { csv, download } from '@/lib/workspace/import-export'
import { Field, FormDialog } from './editors'
import { HelpLink, OperationEmpty, OperationNote, OperationStat } from './operations-ui'

type Props = { state: Workspace; busy: boolean; save: (state: Workspace) => Promise<boolean>; displayName: string; help: () => void; openPrep: () => void }
export function ServiceChecks({ state, busy, save, displayName, help, openPrep }: Props) {
  const operations = state.operations ?? emptyOperations()
  const [date, setDate] = useState(kitchenDay())
  const [editor, setEditor] = useState<Routine | 'new' | null>(null)
  const [message, setMessage] = useState('')
  const today = kitchenDay()
  const active = operations.routines.filter(routine => routine.active)
  const checks = operations.checks.filter(check => check.date === date)
  const done = active.filter(routine => checks.some(check => check.routineId === routine.id)).length
  const recordedBy = displayName.trim().slice(0, 120) || 'Kitchen owner'
  async function toggle(routine: Routine) {
    const existing = checks.find(check => check.routineId === routine.id)
    if (date > today) { setMessage('Future services can be planned, but checks are completed on the service date.'); return }
    if (existing && !window.confirm(`Reopen “${routine.title}” for ${date}?`)) return
    const next = existing ? operations.checks.filter(check => check.id !== existing.id) : [...operations.checks, { id: crypto.randomUUID(), routineId: routine.id, date, completedAt: new Date().toISOString(), recordedBy, title: routine.title, phase: routine.phase, station: routine.station }]
    await save({ ...state, operations: { ...operations, checks: next } })
  }
  async function install() {
    if (await save({ ...state, operations: { ...operations, routines: [...operations.routines, ...suggestedRoutines.map(routine => ({ ...routine, id: crypto.randomUUID() }))] } })) setMessage('Suggested routine added. Adapt the items to your kitchen before using it.')
  }
  async function archive(routine: Routine) {
    if (!window.confirm(`Archive “${routine.title}”? Past completion records will be kept.`)) return
    await save({ ...state, operations: { ...operations, routines: operations.routines.map(item => item.id === routine.id ? { ...item, active: false } : item) } })
  }
  function exportChecks() {
    download(csv([['service_date', 'phase', 'check', 'station', 'completed_at', 'recorded_by', 'active_routine'], ...checks.map(check => { const routine = operations.routines.find(item => item.id === check.routineId)!; return [check.date, check.phase, check.title, check.station, check.completedAt, check.recordedBy, routine.active] })]), `mise-service-checks-${date}.csv`, 'text/csv;charset=utf-8')
  }
  return <div className="operation-page"><section className="operation-hero"><div><span className="eyebrow">GOOD SERVICE STARTS WITH A ROUTINE</span><h2>Open ready. Close with a plan.</h2><p>Repeat the essential checks. Keep each service date separate and leave a clear record of what was completed.</p></div><CheckCheck size={42} strokeWidth={1.4}/></section>
    <div className="operation-toolbar"><div className="operation-actions"><label className="operation-select">Service date<input aria-label="Service date" type="date" value={date} onChange={event => { if (event.target.value) { setDate(event.target.value); setMessage('') } }}/></label><button className="button primary" disabled={busy} onClick={() => setEditor('new')}><Plus size={16}/>Add routine item</button><button className="button secondary" disabled={!checks.length} onClick={exportChecks}><Download size={16}/>Export checks</button></div><HelpLink title="Build your service routine" onClick={help}/></div>
    <div className="operation-stats"><OperationStat label="Checks complete" value={`${done} / ${active.length}`} note={`Active opening and closing checks for ${date}`}/><OperationStat label="Opening" value={`${active.filter(routine => routine.phase === 'opening' && checks.some(check => check.routineId === routine.id)).length} / ${active.filter(routine => routine.phase === 'opening').length}`} note="Before the team begins service"/><OperationStat label="Closing" value={`${active.filter(routine => routine.phase === 'closing' && checks.some(check => check.routineId === routine.id)).length} / ${active.filter(routine => routine.phase === 'closing').length}`} note="Before handing over to the next service"/></div>
    {!operations.routines.length ? <OperationEmpty icon={<CheckCheck size={32}/>} title="Make the daily routine repeatable" action={<div className="operation-actions"><button className="button primary" disabled={busy} onClick={() => void install()}><Plus size={16}/>Start with suggested checks</button><button className="button secondary" disabled={busy} onClick={() => setEditor('new')}>Create my own</button></div>}>Start with eight suggested opening and closing checks, then adapt them to your kitchen. They are templates, and start unchecked.</OperationEmpty>
      : <div className="operations-two-column service-columns">{(['opening', 'closing'] as const).map(phase => <section className="panel" key={phase}><div className="plan-heading"><div className="service-phase-icon">{phase === 'opening' ? <Sun size={22}/> : <Moon size={22}/>}<div><h2>{phase === 'opening' ? 'Before service' : 'After service'}</h2><p>{phase === 'opening' ? 'Set the kitchen up for the day.' : 'Prepare the handover and tomorrow’s start.'}</p></div></div><span className="badge neutral">{phase === 'opening' ? 'Opening' : 'Closing'}</span></div><div className="service-routine-list">{active.filter(routine => routine.phase === phase).map(routine => {
        const check = checks.find(item => item.routineId === routine.id)
        return <article className={`service-routine ${check ? 'complete' : ''}`} key={routine.id}><button className="service-check-button" aria-label={`${check ? 'Reopen' : 'Complete'} ${routine.title}`} aria-pressed={!!check} disabled={busy || date > today} onClick={() => void toggle(routine)}>{check && <Check size={16}/>}</button><div><strong>{routine.title}</strong><small>{routine.station || 'General kitchen'}</small>{check && <small className="service-completion">Recorded by {check.recordedBy} · {new Date(check.completedAt).toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit' })}</small>}</div><div className="routine-actions"><button className="icon-button" disabled={busy} aria-label={`Edit check ${routine.title}`} onClick={() => setEditor(routine)}><Pencil size={14}/></button><button className="icon-button" disabled={busy} aria-label={`Archive check ${routine.title}`} onClick={() => void archive(routine)}><Archive size={14}/></button></div></article>
      })}{!active.some(routine => routine.phase === phase) && <p className="no-results">Add a {phase} check to build this routine.</p>}</div></section>)}</div>}
    {!!checks.length && <details className="panel archived-staff"><summary>Recorded checks for {date}</summary><div className="table-scroll"><table><thead><tr><th>Check as recorded</th><th>Phase / station</th><th>Recorded by</th><th>Completed at</th></tr></thead><tbody>{checks.map(check => <tr key={check.id}><td>{check.title}</td><td>{check.phase}<small>{check.station}</small></td><td>{check.recordedBy}</td><td>{new Date(check.completedAt).toLocaleString('en-CA', {timeZone:'America/Toronto'})}</td></tr>)}</tbody></table></div></details>}
    {!!operations.routines.some(routine => !routine.active) && <details className="panel archived-staff"><summary>Archived routine items</summary>{operations.routines.filter(routine => !routine.active).map(routine => <button className="text-button" key={routine.id} disabled={busy} onClick={() => setEditor(routine)}>{routine.title} · edit or reactivate<Pencil size={13}/></button>)}</details>}
    {date > today && <OperationNote>You are viewing a future service. Review its routine now and complete the checks on the day.</OperationNote>}
    <OperationNote>Use your kitchen’s approved procedures and limits. These are repeatable checks; dated preparation quantities and assignments belong on the <button className="text-button" onClick={openPrep}>Prep board</button>.</OperationNote>
    {message && <p className="operation-feedback" role="status">{message}</p>}
    {editor && <RoutineEditor key={editor === 'new' ? 'new' : editor.id} existing={editor === 'new' ? undefined : editor} busy={busy} close={() => setEditor(null)} save={async routine => {
      const hasHistory = editor !== 'new' && operations.checks.some(check => check.routineId === routine.id)
      const changedAction = editor !== 'new' && (editor.title !== routine.title || editor.phase !== routine.phase || editor.station !== routine.station)
      const next = editor === 'new' ? [...operations.routines, routine] : hasHistory && changedAction ? [...operations.routines.map(item => item.id === routine.id ? { ...item, active: false } : item), { ...routine, id: crypto.randomUUID() }] : operations.routines.map(item => item.id === routine.id ? routine : item)
      return save({ ...state, operations: { ...operations, routines: next } })
    }}/>}
  </div>
}
function RoutineEditor({ existing, busy, close, save }: { existing?: Routine; busy: boolean; close: () => void; save: (routine: Routine) => Promise<boolean> }) {
  const [draft, setDraft] = useState<Routine>(existing ?? { id: crypto.randomUUID(), title: '', phase: 'opening', station: '', active: true })
  const [error, setError] = useState('')
  async function submit(event: FormEvent) { event.preventDefault(); const result = routineSchema.safeParse(draft); if (!result.success) { setError(result.error.issues[0].message); return }; if (await save(result.data)) close() }
  return <FormDialog title={existing ? 'Edit routine item' : 'Add a routine item'} description="Write one clear action. Completed checks keep their original wording when a routine changes." close={close} busy={busy}><form onSubmit={submit}><fieldset disabled={busy}><div className="form-grid"><Field label="Check to complete" wide><input autoFocus required maxLength={120} placeholder="e.g. Confirm tomorrow’s prep assignments" value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))}/></Field><Field label="Service phase"><select value={draft.phase} onChange={event => setDraft(value => ({ ...value, phase: event.target.value as Routine['phase'] }))}><option value="opening">Opening</option><option value="closing">Closing</option></select></Field><Field label="Station"><input maxLength={120} value={draft.station} onChange={event => setDraft(value => ({ ...value, station: event.target.value }))}/></Field>{existing && <label className="operation-checkbox"><input type="checkbox" checked={draft.active} onChange={event => setDraft(value => ({ ...value, active: event.target.checked }))}/><span>Active routine item</span></label>}</div></fieldset>{error && <p className="operation-feedback error" role="alert">{error}</p>}<div className="form-footer"><button type="button" className="button secondary" disabled={busy} onClick={close}>Cancel</button><button className="button primary" disabled={busy}><Save size={16}/>Save routine item</button></div></form></FormDialog>
}
