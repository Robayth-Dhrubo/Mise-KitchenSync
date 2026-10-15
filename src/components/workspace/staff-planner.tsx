'use client'

import { useState, type FormEvent } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Download, Pencil, Plus, Printer, Save, Users } from 'lucide-react'
import { kitchenDay, money, type Workspace } from '@/lib/workspace/domain'
import { addDays, copyPreviousWeek, employeeSchema, emptyOperations, scheduleTotals, shiftHours, shiftSchema, weekStart, type Employee, type Operations, type Shift } from '@/lib/workspace/operations'
import { csv, download } from '@/lib/workspace/import-export'
import { Field, FormDialog } from './editors'
import { HelpLink, OperationEmpty, OperationNote, OperationStat, useUnsavedChanges } from './operations-ui'

type Props = { state: Workspace; busy: boolean; save: (state: Workspace) => Promise<boolean>; help: () => void }
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const number = (value: string) => value === '' ? null : Number(value)
type Editor = { type: 'employee'; id?: string } | { type: 'shift'; id?: string; employeeId?: string; date?: string }

export function StaffPlanner({ state, busy, save, help }: Props) {
  const operations = state.operations ?? emptyOperations()
  const [week, setWeek] = useState(weekStart(kitchenDay()))
  const [editor, setEditor] = useState<Editor | null>(null)
  const [message, setMessage] = useState('')
  const plan = operations.weeks.find(item => item.start === week)
  const [sales, setSales] = useState(plan?.projectedSales ?? null)
  const [threshold, setThreshold] = useState(plan?.hoursReview ?? null)
  const [planSource, setPlanSource] = useState(plan)
  if (planSource !== plan) { setPlanSource(plan); setSales(plan?.projectedSales ?? null); setThreshold(plan?.hoursReview ?? null) }
  const planDirty = sales !== (plan?.projectedSales ?? null) || threshold !== (plan?.hoursReview ?? null)
  useUnsavedChanges(planDirty)
  const dates = days.map((_, index) => addDays(week, index))
  const shifts = operations.shifts.filter(shift => shift.date >= week && shift.date <= dates[6])
  const staff = operations.employees.filter(employee => employee.active || shifts.some(shift => shift.employeeId === employee.id))
  const totals = scheduleTotals(shifts, sales)
  const approvalMissingRate = shifts.filter(shift => shift.status === 'approved' && shift.hourlyRate === null).length
  const warnings = staff.flatMap(employee => {
    const assigned = shifts.filter(shift => shift.employeeId === employee.id)
    const hours = assigned.reduce((sum, shift) => sum + shiftHours(shift), 0)
    const warnings: string[] = []
    if (threshold !== null && hours > threshold) warnings.push(`${employee.name}: ${hours.toFixed(1)} planned hours exceeds your ${threshold}-hour review threshold.`)
    if (assigned.some(shift => !employee.availableDays.includes(new Date(`${shift.date}T12:00:00Z`).getUTCDay()))) warnings.push(`${employee.name}: a shift falls outside recorded availability.`)
    return warnings
  })
  function changeWeek(value: string) {
    if (!value || !window.dispatchEvent(new Event('mise-before-navigate', { cancelable: true }))) return
    setWeek(weekStart(value)); setMessage(''); setSales(null); setThreshold(null)
  }
  async function update(next: Operations) { return save({ ...state, operations: next }) }
  async function savePlan(event: FormEvent) {
    event.preventDefault()
    if (await update({ ...operations, weeks: [...operations.weeks.filter(item => item.start !== week), { start: week, projectedSales: sales, hoursReview: threshold }] })) setMessage('Weekly assumptions saved.')
  }
  async function copy() {
    try { if (await update(copyPreviousWeek(operations, week))) setMessage('Previous week copied with current rates. Review availability and coverage before sharing.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The week could not be copied.') }
  }
  function exportRows(approved: boolean) {
    const rows = shifts.filter(shift => !approved || shift.status === 'approved').sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    download(csv([
      ['employee', 'role', 'date', 'start', 'end', 'ends_next_day', 'unpaid_break_minutes', 'planned_paid_hours', 'worked_paid_hours', 'saved_hourly_rate_cad', 'base_wages_cad', 'status', 'station'],
      ...rows.map(shift => { const person = operations.employees.find(employee => employee.id === shift.employeeId)!; return [person.name, person.role, shift.date, shift.start, shift.end, shift.endsNextDay, shift.unpaidBreak, shiftHours(shift), shift.actualHours, shift.hourlyRate, shift.hourlyRate === null ? null : (approved ? shift.actualHours! : shiftHours(shift)) * shift.hourlyRate, shift.status, shift.station] }),
    ]), `mise-${approved ? 'approved-hours' : 'schedule'}-${week}.csv`, 'text/csv;charset=utf-8')
  }
  return <div className="operation-page staff-planner">
    <section className="operation-hero"><div><span className="eyebrow">A WEEK THE TEAM CAN WORK WITH</span><h2>Put the right people on the plan.</h2><p>Plan shifts, review the base wages and approve worked hours in one place.</p></div><CalendarDays size={42} strokeWidth={1.4}/></section>
    <div className="operation-toolbar"><div className="operation-actions"><button className="button primary" disabled={busy} onClick={() => setEditor({ type: 'employee' })}><Plus size={16}/>Add employee</button><button className="button secondary" disabled={busy || !operations.employees.some(employee => employee.active)} onClick={() => setEditor({ type: 'shift', date: week })}><Plus size={16}/>Add shift</button></div><HelpLink title="Scheduling and hours guide" onClick={help}/></div>
    <div className="week-controls"><div><button className="icon-button" aria-label="Previous week" disabled={busy} onClick={() => changeWeek(addDays(week, -7))}><ChevronLeft size={19}/></button><label><span className="sr-only">Week containing date</span><input type="date" value={week} disabled={busy} onChange={event => changeWeek(event.target.value)}/></label><button className="icon-button" aria-label="Next week" disabled={busy} onClick={() => changeWeek(addDays(week, 7))}><ChevronRight size={19}/></button><span>Sunday to Saturday · Montréal</span></div><div className="operation-actions"><button className="button secondary small" disabled={busy || !!shifts.length} onClick={() => void copy()}><Copy size={15}/>Copy previous week</button><button className="button secondary small" disabled={!shifts.length} onClick={() => exportRows(false)}><Download size={15}/>Export schedule</button><button className="icon-button" aria-label="Print weekly schedule" disabled={!shifts.length} onClick={() => window.print()}><Printer size={17}/></button></div></div>
    <div className="operation-stats"><OperationStat label="Planned paid hours" value={shifts.length ? totals.hours.toFixed(1) : '—'} note={`${shifts.length} shifts · unpaid breaks deducted`}/><OperationStat label="Planned base wages" value={money(totals.wages)} note={shifts.some(shift => shift.hourlyRate === null) ? 'Complete missing shift rates' : 'Before employer costs and overtime premiums'}/><OperationStat label="Base wages / sales" value={totals.labourPct === null ? '—' : `${totals.labourPct.toFixed(1)}%`} note="Uses the projected sales entered below"/></div>
    {!operations.employees.length ? <OperationEmpty icon={<Users size={32}/>} title="Start with the people on your team" action={<button className="button primary" disabled={busy} onClick={() => setEditor({ type: 'employee' })}><Plus size={16}/>Add the first employee</button>}>Add hourly rates and availability, then build the week. These staff records do not create logins or invite anyone.</OperationEmpty>
      : <section className="panel schedule-panel"><div className="plan-heading"><div><h2>{week} – {dates[6]}</h2><p>Click a shift to review it. Use the plus button to fill a day.</p></div><span className="badge neutral">Planning records</span></div><div className="table-scroll"><table className="schedule-table"><caption className="sr-only">Sunday to Saturday staff schedule for the week starting {week}</caption><thead><tr><th>Employee / role</th>{dates.map((date, index) => <th key={date}>{days[index]}<small>{date.slice(5)}</small></th>)}<th className="numeric">Hours / wages</th></tr></thead><tbody>{staff.map(employee => {
        const assigned = shifts.filter(shift => shift.employeeId === employee.id)
        const total = scheduleTotals(assigned, null)
        return <tr key={employee.id}><th scope="row"><button className="item-name" onClick={() => setEditor({ type: 'employee', id: employee.id })}>{employee.name}<Pencil size={12}/></button><small>{employee.role}{!employee.active && ' · Archived'}</small><small>{money(employee.hourlyRate)} / hour</small></th>{dates.map((date, day) => <td key={date} className={!employee.availableDays.includes(day) ? 'unavailable-day' : ''}>{assigned.filter(shift => shift.date === date).sort((a, b) => a.start.localeCompare(b.start)).map(shift => <button key={shift.id} className={`shift-card ${shift.status}`} disabled={busy} onClick={() => setEditor({ type: 'shift', id: shift.id })}><strong>{shift.start}–{shift.end}{shift.endsNextDay && ' +1'}</strong><span>{shift.station || employee.role}</span><small>{shiftHours(shift).toFixed(1)} h · {shift.status === 'approved' ? 'Approved' : shift.status === 'worked' ? 'Review hours' : 'Planned'}</small></button>)}{employee.active && <button className="add-shift" disabled={busy} aria-label={`Add shift for ${employee.name} on ${date}`} onClick={() => setEditor({ type: 'shift', employeeId: employee.id, date })}><Plus size={13}/></button>}</td>)}<td className="numeric"><strong>{assigned.length ? total.hours.toFixed(1) : '—'}</strong><small>{money(total.wages)}</small></td></tr>
      })}</tbody></table>{!staff.length && <p className="no-results">All employees are archived. Add an employee or reactivate one below.</p>}</div></section>}
    {!!warnings.length && <section className="operation-warnings" aria-label="Schedule review notices"><h3>Before you share the schedule</h3>{warnings.map(warning => <p key={warning}>{warning}</p>)}</section>}
    <div className="operations-two-column"><form className="panel weekly-assumptions" onSubmit={savePlan}><h2>Check this week’s budget</h2><p>Choose your own review threshold. It flags hours for review and does not calculate an overtime premium.</p><label className="plan-field"><span>Projected weekly net sales (CAD)</span><input type="number" min="0" max="1000000000" step="0.01" value={sales ?? ''} placeholder="Not entered" onChange={event => setSales(number(event.target.value))}/></label><label className="plan-field"><span>Review employee hours above</span><input type="number" min="1" max="168" step="0.25" value={threshold ?? ''} placeholder="Choose a weekly threshold" onChange={event => setThreshold(number(event.target.value))}/></label><button className="button secondary" disabled={busy || !planDirty}><Save size={15}/>Save weekly assumptions</button></form>
    <section className="panel timesheet-summary"><span className="eyebrow">REVIEW BEFORE PAYROLL</span><h2>Approved worked hours</h2><strong>{totals.approvedHours.toFixed(1)} <small>hours</small></strong><p>{shifts.filter(shift => shift.status === 'approved').length} approved entries · {money(totals.approvedWages)} base wages</p>{approvalMissingRate > 0 && <p className="warning-text">{approvalMissingRate} approved entries have no rate. Confirm them before payroll.</p>}<button className="button secondary" disabled={!shifts.some(shift => shift.status === 'approved') || approvalMissingRate > 0} onClick={() => exportRows(true)}><Download size={16}/>Export approved hours</button><p className="muted-text">The manager enters and approves actual paid hours on each shift. Exporting does not run payroll.</p></section></div>
    {!!operations.employees.some(employee => !employee.active) && <details className="panel archived-staff"><summary>Archived staff</summary>{operations.employees.filter(employee => !employee.active).map(employee => <button className="text-button" key={employee.id} onClick={() => setEditor({ type: 'employee', id: employee.id })}>{employee.name} · {employee.role}<Pencil size={13}/></button>)}</details>}
    <OperationNote>Rates are stored per shift. Wage totals use hourly base pay; budget salaries, employer costs and overtime premiums in Labour &amp; budget. Scheduled hours use local clock times. Review worked hours for any clock change.</OperationNote>
    {message && <p className="operation-feedback" role="status">{message}</p>}
    {editor?.type === 'employee' && <EmployeeEditor key={editor.id ?? 'new-employee'} employee={operations.employees.find(employee => employee.id === editor.id)} operations={operations} busy={busy} update={update} close={() => setEditor(null)}/>}
    {editor?.type === 'shift' && <ShiftEditor key={editor.id ?? `${editor.employeeId}-${editor.date}`} existing={operations.shifts.find(shift => shift.id === editor.id)} employeeId={editor.employeeId} date={editor.date ?? week} operations={operations} busy={busy} update={update} close={() => setEditor(null)}/>}
  </div>
}

function EmployeeEditor({ employee, operations, busy, update, close }: { employee?: Employee; operations: Operations; busy: boolean; update: (value: Operations) => Promise<boolean>; close: () => void }) {
  const [draft, setDraft] = useState<Employee>(employee ?? { id: crypto.randomUUID(), name: '', role: '', hourlyRate: null, active: true, availableDays: [0, 1, 2, 3, 4, 5, 6], notes: '' })
  const [error, setError] = useState('')
  const change = (value: Partial<Employee>) => setDraft(current => ({ ...current, ...value }))
  async function submit(event: FormEvent) {
    event.preventDefault(); const result = employeeSchema.safeParse(draft)
    if (!result.success) { setError(result.error.issues[0].message); return }
    if (await update({ ...operations, employees: employee ? operations.employees.map(item => item.id === draft.id ? result.data : item) : [...operations.employees, result.data] })) close()
  }
  return <FormDialog title={employee ? 'Edit employee' : 'Add an employee'} description="Staff planning records stay in your kitchen. No login or invitation is created." close={close} busy={busy}><form onSubmit={submit}><fieldset disabled={busy}><div className="form-grid"><Field label="Employee name" wide><input autoFocus required maxLength={120} value={draft.name} onChange={event => change({ name: event.target.value })}/></Field><Field label="Role"><input required maxLength={120} placeholder="e.g. Line cook" value={draft.role} onChange={event => change({ role: event.target.value })}/></Field><Field label="Hourly base rate (CAD)" hint="Leave blank if unknown. Use Labour & budget for annual salary planning."><input type="number" min="0" max="1000000000" step="0.01" value={draft.hourlyRate ?? ''} onChange={event => change({ hourlyRate: number(event.target.value) })}/></Field><div className="form-field wide"><span id="availability-label">Available days · confirm with the employee</span><div className="day-picker" role="group" aria-labelledby="availability-label">{days.map((day, index) => <label key={day}><input type="checkbox" checked={draft.availableDays.includes(index)} onChange={event => change({ availableDays: event.target.checked ? [...draft.availableDays, index].sort() : draft.availableDays.filter(value => value !== index) })}/><span>{day}</span></label>)}</div></div><Field label="Notes" wide><textarea maxLength={300} rows={2} value={draft.notes} onChange={event => change({ notes: event.target.value })}/></Field>{employee && <label className="operation-checkbox"><input type="checkbox" checked={draft.active} onChange={event => change({ active: event.target.checked })}/><span>Active employee · archiving keeps existing shifts</span></label>}</div></fieldset>{error && <p className="operation-feedback error" role="alert">{error}</p>}<div className="form-footer"><button type="button" className="button secondary" disabled={busy} onClick={close}>Cancel</button><button className="button primary" disabled={busy}><Save size={16}/>Save employee</button></div></form></FormDialog>
}

function ShiftEditor({ existing, employeeId, date, operations, busy, update, close }: { existing?: Shift; employeeId?: string; date: string; operations: Operations; busy: boolean; update: (value: Operations) => Promise<boolean>; close: () => void }) {
  const first = operations.employees.find(employee => employee.id === employeeId) ?? operations.employees.find(employee => employee.active)
  const [draft, setDraft] = useState<Shift>(existing ?? { id: crypto.randomUUID(), employeeId: first?.id ?? '', date, start: '08:00', end: '16:00', endsNextDay: false, unpaidBreak: 0, station: '', hourlyRate: first?.hourlyRate ?? null, actualHours: null, status: 'planned' })
  const [error, setError] = useState('')
  const change = (value: Partial<Shift>) => setDraft(current => ({ ...current, ...value }))
  const locked = existing?.status === 'approved' && draft.status === 'approved'
  async function submit(event: FormEvent) {
    event.preventDefault(); const result = shiftSchema.safeParse(draft)
    if (!result.success) { setError(result.error.issues[0].message); return }
    if (await update({ ...operations, shifts: existing ? operations.shifts.map(shift => shift.id === draft.id ? result.data : shift) : [...operations.shifts, result.data] })) close()
  }
  async function remove() { if (window.confirm('Delete this planned or unapproved shift?') && await update({ ...operations, shifts: operations.shifts.filter(shift => shift.id !== draft.id) })) close() }
  return <FormDialog title={existing ? 'Review shift and hours' : 'Add a shift'} description="Times use the kitchen’s Montréal clock. The hourly rate is saved with this shift." close={close} busy={busy}><form onSubmit={submit}><fieldset disabled={busy || locked}><div className="form-grid"><Field label="Employee" wide><select required value={draft.employeeId} onChange={event => { const person = operations.employees.find(employee => employee.id === event.target.value)!; change({ employeeId: person.id, hourlyRate: person.hourlyRate }) }}>{operations.employees.filter(employee => employee.active || employee.id === draft.employeeId).map(employee => <option key={employee.id} value={employee.id}>{employee.name} · {employee.role}</option>)}</select></Field><Field label="Shift date"><input type="date" required value={draft.date} onChange={event => change({ date: event.target.value })}/></Field><Field label="Station"><input maxLength={120} placeholder="e.g. Hot line" value={draft.station} onChange={event => change({ station: event.target.value })}/></Field><Field label="Start time"><input type="time" required value={draft.start} onChange={event => change({ start: event.target.value })}/></Field><Field label="End time"><input type="time" required value={draft.end} onChange={event => change({ end: event.target.value })}/></Field><label className="operation-checkbox"><input type="checkbox" checked={draft.endsNextDay} onChange={event => change({ endsNextDay: event.target.checked })}/><span>Ends the next day</span></label><Field label="Unpaid break (minutes)"><input type="number" required min="0" max="720" step="1" value={draft.unpaidBreak} onChange={event => change({ unpaidBreak: Number(event.target.value) })}/></Field><Field label="Saved hourly rate (CAD)" hint="This rate applies to this shift. Employee-rate edits do not change it."><input type="number" min="0" max="1000000000" step="0.01" value={draft.hourlyRate ?? ''} onChange={event => change({ hourlyRate: number(event.target.value) })}/></Field><Field label="Actual paid hours" hint="Manager-reviewed hours after unpaid breaks. Blank means not recorded."><input type="number" min="0" max="24" step="0.01" value={draft.actualHours ?? ''} onChange={event => { const hours = number(event.target.value); change({ actualHours: hours, status: hours === null ? 'planned' : 'worked' }) }}/></Field><Field label="Review status"><select value={draft.status} onChange={event => change({ status: event.target.value as Shift['status'], ...(event.target.value === 'planned' ? { actualHours: null } : {}) })}><option value="planned">Planned</option><option value="worked">Worked · awaiting approval</option><option value="approved">Approved worked hours</option></select></Field></div></fieldset>{locked && <OperationNote>This entry is approved. Reopen it before changing its hours or rate.</OperationNote>}{error && <p className="operation-feedback error" role="alert">{error}</p>}<div className="form-footer">{existing && !locked && <button className="button danger-text" disabled={busy} type="button" onClick={() => void remove()}>Delete shift</button>}{locked ? <button className="button secondary" disabled={busy} type="button" onClick={() => change({ status: 'worked' })}>Reopen for review</button> : <button className="button secondary" disabled={busy} type="button" onClick={close}>Cancel</button>}<button className="button primary" disabled={busy || locked}><Check size={16}/>{draft.status === 'approved' ? 'Save approved hours' : 'Save shift'}</button></div></form></FormDialog>
}
