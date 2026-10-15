import { describe, expect, it } from 'vitest'
import { sampleWorkspace, workspaceSchema } from '../src/lib/workspace/domain'
import { demoWorkspace } from '../src/lib/workspace/demo'
import { addDays, copyPreviousWeek, emptyOperations, operationsSchema, scheduleTotals, shiftHours, shiftSchema, weekStart, type Shift } from '../src/lib/workspace/operations'

const employee = { id: 'employee-one', name: 'Test cook', role: 'Cook', hourlyRate: 25, active: true, availableDays: [0, 1, 2, 3, 4, 5, 6], notes: '' }
const shift: Shift = { id: 'shift-one', employeeId: employee.id, date: '2026-10-11', start: '08:00', end: '16:00', endsNextDay: false, unpaidBreak: 30, station: 'Hot line', hourlyRate: 25, actualHours: null, status: 'planned' }
const operations = () => ({ ...emptyOperations(), employees: [employee], shifts: [shift] })

describe('Staff planning calculations', () => {
  it('uses Sunday to Saturday across month and year boundaries', () => {
    expect(weekStart('2026-10-14')).toBe('2026-10-11')
    expect(weekStart('2027-01-01')).toBe('2026-12-27')
    expect(addDays('2026-12-27', 6)).toBe('2027-01-02')
  })
  it('deducts unpaid breaks and handles overnight shifts', () => {
    expect(shiftHours(shift)).toBe(7.5)
    expect(shiftHours({ ...shift, start: '22:00', end: '06:00', endsNextDay: true })).toBe(7.5)
    expect(scheduleTotals([shift], 1000)).toMatchObject({ hours: 7.5, wages: 187.5, labourPct: 18.75 })
  })
  it('keeps missing rates and a missing sales budget unknown', () => {
    expect(scheduleTotals([{ ...shift, hourlyRate: null }], 1000).wages).toBeNull()
    expect(scheduleTotals([shift], null).labourPct).toBeNull()
    expect(scheduleTotals([shift], 0).labourPct).toBeNull()
    expect(scheduleTotals([], 1000).wages).toBeNull()
    expect(scheduleTotals([{ ...shift, hourlyRate: 0 }], 1000).wages).toBe(0)
  })
  it('calculates approved actual hours separately from the planned schedule', () => {
    const result = scheduleTotals([{ ...shift, status: 'approved', actualHours: 7 }, { ...shift, id: 'another', date: '2026-10-12', status: 'worked', actualHours: 9 }], null)
    expect(result.hours).toBe(15)
    expect(result.wages).toBe(375)
    expect(result.approvedHours).toBe(7)
    expect(result.approvedWages).toBe(175)
  })
  it.each([
    { start: '16:00', end: '08:00' }, { unpaidBreak: 480 }, { start: '01:00', end: '23:00' },
    { start: '25:00' }, { date: '2026-02-30' }, { status: 'approved', actualHours: null },
    { status: 'planned', actualHours: 7 }, { actualHours: -1 },
  ])('rejects an invalid shift: %j', partial => { expect(shiftSchema.safeParse({ ...shift, ...partial }).success).toBe(false) })
  it('rejects overlapping shifts, including an overnight collision on the next day', () => {
    const first = { ...shift, start: '22:00', end: '06:00', endsNextDay: true }
    const second = { ...shift, id: 'second', date: '2026-10-12', start: '05:00', end: '12:00' }
    expect(operationsSchema.safeParse({ ...operations(), shifts: [first, second] }).success).toBe(false)
    expect(operationsSchema.safeParse({ ...operations(), shifts: [first, { ...second, start: '06:00' }] }).success).toBe(true)
  })
  it('allows different employees on the same station and time', () => {
    expect(operationsSchema.safeParse({ ...operations(), employees: [employee, { ...employee, id: 'second-person' }], shifts: [shift, { ...shift, id: 'second-shift', employeeId: 'second-person' }] }).success).toBe(true)
  })
  it('rejects missing staff and duplicate or invalid weekly plans without throwing', () => {
    expect(operationsSchema.safeParse({ ...operations(), employees: [] }).success).toBe(false)
    const plan = { start: '2026-10-11', projectedSales: 1000, hoursReview: 40 }
    expect(operationsSchema.safeParse({ ...operations(), weeks: [plan, plan] }).success).toBe(false)
    expect(operationsSchema.safeParse({ ...operations(), weeks: [{ ...plan, start: '2026-02-30' }] }).success).toBe(false)
    expect(operationsSchema.safeParse({ ...operations(), weeks: [{ ...plan, start: '2026-10-12' }] }).success).toBe(false)
  })
  it('copies current rates into an empty week, resets approval and preserves history', () => {
    const original = { ...operations(), employees: [{ ...employee, hourlyRate: 30 }], shifts: [{ ...shift, status: 'approved' as const, actualHours: 7 }] }
    const result = copyPreviousWeek(original, '2026-10-18', () => 'copied')
    expect(result.shifts[1]).toMatchObject({ id: 'copied', date: '2026-10-18', hourlyRate: 30, status: 'planned', actualHours: null })
    expect(original.shifts).toHaveLength(1)
    expect(result.shifts[0].hourlyRate).toBe(25)
    expect(() => copyPreviousWeek(result, '2026-10-18')).toThrow('empty week')
    expect(() => copyPreviousWeek(original, '2026-10-19')).toThrow('Sunday')
  })
  it('does not copy archived employees into the next week', () => {
    expect(() => copyPreviousWeek({ ...operations(), employees: [{ ...employee, active: false }] }, '2026-10-18')).toThrow('active staff')
  })
})

describe('Service records and existing backups', () => {
  const routine = { id: 'routine-one', title: 'Check the line', phase: 'opening' as const, station: 'Kitchen', active: true }
  const check = { id: 'check-one', routineId: routine.id, date: '2026-10-14', completedAt: '2026-10-14T12:00:00Z', recordedBy: 'Test manager', title: routine.title, phase: routine.phase, station: routine.station }
  it('separates checks by service date and rejects double completion', () => {
    const state = { ...emptyOperations(), routines: [routine], checks: [check] }
    expect(operationsSchema.safeParse(state).success).toBe(true)
    expect(operationsSchema.safeParse({ ...state, checks: [check, { ...check, id: 'check-two' }] }).success).toBe(false)
    expect(operationsSchema.safeParse({ ...state, checks: [check, { ...check, id: 'check-two', date: '2026-10-15' }] }).success).toBe(true)
    expect(operationsSchema.safeParse({ ...state, routines: [] }).success).toBe(false)
  })
  it('preserves completion wording and does not discard records when a routine is archived', () => {
    const parsed = operationsSchema.parse({ ...emptyOperations(), routines: [{ ...routine, active: false, title: 'Revised future wording' }], checks: [check] })
    expect(parsed.checks[0].title).toBe('Check the line')
    expect(parsed.checks).toHaveLength(1)
  })
  it('accepts earlier kitchen backups and round-trips all new records', () => {
    const old = sampleWorkspace('2026-10-14')
    expect(workspaceSchema.parse(old).operations).toBeUndefined()
    const demo = demoWorkspace()
    expect(workspaceSchema.parse(JSON.parse(JSON.stringify(demo)))).toEqual(demo)
    expect(demo.operations!.salesReports.length).toBeGreaterThan(0)
    expect(demo.sampleData).toBe(true)
  })
})
