import { z } from 'zod'

const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
const label = z.string().trim().min(1).max(120)
const amount = z.number().finite().min(0).max(1e9).nullable()
export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
}, 'Enter a valid calendar date.')
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time between 00:00 and 23:59.')

export const employeeSchema = z.object({
  id, name: label, role: label, hourlyRate: amount, active: z.boolean(),
  availableDays: z.array(z.number().int().min(0).max(6)).max(7),
  notes: z.string().trim().max(300),
}).refine(value => new Set(value.availableDays).size === value.availableDays.length, 'Availability days must be unique.')

export const shiftSchema = z.object({
  id, employeeId: id, date: calendarDate, start: clock, end: clock, endsNextDay: z.boolean(),
  unpaidBreak: z.number().int().min(0).max(720), station: z.string().trim().max(120),
  hourlyRate: amount, actualHours: z.number().finite().min(0).max(24).nullable(),
  status: z.enum(['planned', 'worked', 'approved']),
}).superRefine((shift, ctx) => {
  const duration = clockMinutes(shift.end) - clockMinutes(shift.start) + (shift.endsNextDay ? 1440 : 0)
  if (duration <= 0 || duration > 16 * 60) ctx.addIssue({ code: 'custom', message: 'A shift must last more than zero and no more than 16 hours. Check the next-day option.' })
  if (shift.unpaidBreak >= duration) ctx.addIssue({ code: 'custom', message: 'The unpaid break must be shorter than the shift.' })
  if (shift.status !== 'planned' && shift.actualHours === null) ctx.addIssue({ code: 'custom', message: 'Enter worked hours before marking a shift worked or approved.' })
  if (shift.status === 'planned' && shift.actualHours !== null) ctx.addIssue({ code: 'custom', message: 'Mark a shift worked when entering actual hours.' })
})

export const salesReportSchema = z.object({
  id, name: label, from: calendarDate, through: calendarDate,
  source: z.string().trim().min(1, 'Name the report source.').max(200),
  rows: z.array(z.object({
    id, item: label, quantity: z.number().finite().min(0).max(1e7), netSales: z.number().finite().min(0).max(1e9), recipeId: id.nullable(),
  })).min(1).max(500),
}).superRefine((report, ctx) => {
  if (report.from > report.through) ctx.addIssue({ code: 'custom', message: 'The report end date must follow its start date.' })
  if (new Set(report.rows.map(row => row.id)).size !== report.rows.length) ctx.addIssue({ code: 'custom', message: 'Report row IDs must be unique.' })
  if (new Set(report.rows.map(row => row.item.toLocaleLowerCase('en-CA'))).size !== report.rows.length) ctx.addIssue({ code: 'custom', message: 'Combine duplicate item names into one sales row before importing.' })
  for (const row of report.rows) if (row.quantity === 0 && row.netSales !== 0) ctx.addIssue({ code: 'custom', message: `${row.item}: sales with zero units need review.` })
})

export const routineSchema = z.object({ id, title: label, phase: z.enum(['opening', 'closing']), station: z.string().trim().max(120), active: z.boolean() })
export const operationsSchema = z.object({
  employees: z.array(employeeSchema).max(200), shifts: z.array(shiftSchema).max(2000),
  weeks: z.array(z.object({ start: calendarDate, projectedSales: amount, hoursReview: z.number().min(1).max(168).nullable() })).max(520),
  salesReports: z.array(salesReportSchema).max(30), routines: z.array(routineSchema).max(100),
  checks: z.array(z.object({ id, routineId: id, date: calendarDate, completedAt: z.iso.datetime(), recordedBy: label, title: label, phase: z.enum(['opening', 'closing']), station: z.string().max(120) })).max(4000),
}).superRefine((value, ctx) => {
  for (const key of ['employees', 'shifts', 'salesReports', 'routines', 'checks'] as const) {
    if (new Set(value[key].map(row => row.id)).size !== value[key].length) ctx.addIssue({ code: 'custom', message: `Duplicate ${key} IDs.` })
  }
  if (new Set(value.weeks.map(week => week.start)).size !== value.weeks.length) ctx.addIssue({ code: 'custom', message: 'There is already a plan for this week.' })
  for (const week of value.weeks) if (calendarDate.safeParse(week.start).success && weekStart(week.start) !== week.start) ctx.addIssue({ code: 'custom', message: 'Weekly plans start on Sunday.' })
  const reportKeys = value.salesReports.map(report => `${report.from}:${report.through}:${report.source.trim().normalize('NFKC').toLocaleLowerCase('en-CA').replace(/\s+/g, ' ')}`)
  if (new Set(reportKeys).size !== reportKeys.length) ctx.addIssue({ code: 'custom', message: 'A report from this source for these dates already exists.' })
  const employees = new Set(value.employees.map(employee => employee.id))
  for (const shift of value.shifts) if (!employees.has(shift.employeeId)) ctx.addIssue({ code: 'custom', message: 'A scheduled employee is missing.' })
  const sorted = [...value.shifts].sort((a, b) => shiftInterval(a)[0] - shiftInterval(b)[0])
  const lastEnd = new Map<string, number>()
  for (const shift of sorted) {
    const [start, end] = shiftInterval(shift)
    if (start < (lastEnd.get(shift.employeeId) ?? -Infinity)) ctx.addIssue({ code: 'custom', message: 'An employee has overlapping shifts. Review the dates and times.' })
    lastEnd.set(shift.employeeId, Math.max(end, lastEnd.get(shift.employeeId) ?? -Infinity))
  }
  const routines = new Set(value.routines.map(routine => routine.id))
  const checked = new Set<string>()
  for (const check of value.checks) {
    if (!routines.has(check.routineId)) ctx.addIssue({ code: 'custom', message: 'A service checklist item is missing.' })
    const key = `${check.date}:${check.routineId}`
    if (checked.has(key)) ctx.addIssue({ code: 'custom', message: 'A service item can be checked once per date.' })
    checked.add(key)
  }
})

export type Operations = z.infer<typeof operationsSchema>
export type Employee = z.infer<typeof employeeSchema>
export type Shift = z.infer<typeof shiftSchema>
export type SalesReport = z.infer<typeof salesReportSchema>
export type Routine = z.infer<typeof routineSchema>
export function emptyOperations(): Operations { return { employees: [], shifts: [], weeks: [], salesReports: [], routines: [], checks: [] } }
export function clockMinutes(value: string): number { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes }
export function addDays(value: string, days: number): string { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10) }
export function weekStart(value: string): string { return addDays(value, -new Date(`${value}T12:00:00Z`).getUTCDay()) }
export function shiftHours(shift: Shift): number { return (clockMinutes(shift.end) - clockMinutes(shift.start) + (shift.endsNextDay ? 1440 : 0) - shift.unpaidBreak) / 60 }
function shiftInterval(shift: Shift): [number, number] {
  const start = new Date(`${shift.date}T00:00:00Z`).valueOf() / 60000
  return [start + clockMinutes(shift.start), start + clockMinutes(shift.end) + (shift.endsNextDay ? 1440 : 0)]
}
export function scheduleTotals(shifts: Shift[], projectedSales: number | null) {
  const hours = shifts.reduce((sum, shift) => sum + shiftHours(shift), 0)
  const wages = shifts.length > 0 && shifts.every(shift => shift.hourlyRate !== null) ? shifts.reduce((sum, shift) => sum + shiftHours(shift) * shift.hourlyRate!, 0) : null
  const approved = shifts.filter(shift => shift.status === 'approved')
  const approvedHours = approved.reduce((sum, shift) => sum + shift.actualHours!, 0)
  const approvedWages = approved.length > 0 && approved.every(shift => shift.hourlyRate !== null) ? approved.reduce((sum, shift) => sum + shift.actualHours! * shift.hourlyRate!, 0) : null
  return { hours, wages, approvedHours, approvedWages, labourPct: wages !== null && projectedSales !== null && projectedSales > 0 ? wages / projectedSales * 100 : null }
}
export function copyPreviousWeek(operations: Operations, target: string, newId = () => crypto.randomUUID()): Operations {
  if (!calendarDate.safeParse(target).success || weekStart(target) !== target) throw new Error('Choose a valid Sunday for the copied week.')
  if (operations.shifts.some(shift => shift.date >= target && shift.date < addDays(target, 7))) throw new Error('Copy into an empty week to avoid duplicating shifts.')
  const previous = addDays(target, -7)
  const rows = operations.shifts.filter(shift => shift.date >= previous && shift.date < target && operations.employees.some(employee => employee.id === shift.employeeId && employee.active))
  if (!rows.length) throw new Error('The previous week has no shifts for active staff.')
  return operationsSchema.parse({ ...operations, shifts: [...operations.shifts, ...rows.map(shift => ({ ...shift, id: newId(), date: addDays(shift.date, 7), hourlyRate: operations.employees.find(employee => employee.id === shift.employeeId)!.hourlyRate, actualHours: null, status: 'planned' }))] })
}
export const suggestedRoutines: Omit<Routine, 'id'>[] = [
  { title: 'Complete the kitchen’s required temperature checks', phase: 'opening', station: 'Kitchen', active: true },
  { title: 'Check handwashing and station supplies', phase: 'opening', station: 'Kitchen', active: true },
  { title: 'Confirm prep, portions and service quantities', phase: 'opening', station: 'Line', active: true },
  { title: 'Brief the team on the menu and verified allergens', phase: 'opening', station: 'Pass', active: true },
  { title: 'Label, date and store remaining preparation', phase: 'closing', station: 'Kitchen', active: true },
  { title: 'Count priority stock and review tomorrow’s orders', phase: 'closing', station: 'Stores', active: true },
  { title: 'Complete the equipment and cleaning checks', phase: 'closing', station: 'Kitchen', active: true },
  { title: 'Assign tomorrow’s prep and handover notes', phase: 'closing', station: 'Pass', active: true },
]
