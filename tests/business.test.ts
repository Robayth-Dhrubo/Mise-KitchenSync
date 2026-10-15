import {describe,expect,it} from 'vitest'
import {annualRoleCost,businessSchema,businessTotals,emptyBusinessPlan} from '../src/lib/workspace/business'
import {emptyWorkspace,workspaceSchema} from '../src/lib/workspace/domain'
describe('Annual hiring and restaurant scenarios',()=>{
  it('keeps unknown employer costs and overhead unavailable',()=>{
    const p=emptyBusinessPlan();p.roles=[{id:'chef',role:'Chef',people:1,basis:'annual',rate:65000,weeklyHours:null}]
    expect(businessTotals(p)).toMatchObject({wages:65000,loadedLabour:null,hiringBudget:null,breakEven:null,operatingResult:null})
  })
  it('combines annual salaries, hourly headcount and paid weeks without converting salary days to hours',()=>{
    const p=emptyBusinessPlan();p.roles=[{id:'chef',role:'Chef',people:1,basis:'annual',rate:65000,weeklyHours:null},{id:'cook',role:'Cook',people:2,basis:'hourly',rate:25,weeklyHours:30}]
    expect(businessTotals(p).wages).toBe(143000)
    p.weeks=48;expect(businessTotals(p).wages).toBe(137000)
    expect(annualRoleCost({...p.roles[1],weeklyHours:null},52)).toBeNull()
  })
  it('calculates loaded hiring cost and the actual break-even equation including confirmed zero costs',()=>{
    const p=emptyBusinessPlan();Object.assign(p,{employerPct:20,overtimeAllowance:1000,recruitingBudget:2000,monthlySales:30000,foodPct:30,otherVariablePct:5,monthlyOverhead:5000})
    p.roles=[{id:'chef',role:'Chef',people:1,basis:'annual',rate:65000,weeklyHours:null}]
    const t=businessTotals(p);expect(t.loadedLabour).toBe(79200);expect(t.hiringBudget).toBe(81200)
    expect(t.breakEven).toBeCloseTo((81200/12+5000)/.65)
    expect(t.operatingResult).toBeCloseTo(30000*.65-(81200/12+5000))
    p.monthlySales=0;expect(businessTotals(p).operatingResult).toBeCloseTo(-(81200/12+5000));expect(businessTotals(p).labourPct).toBeNull()
  })
  it('rejects impossible variable costs and invalid calendar dates',()=>{
    const p=emptyBusinessPlan();p.foodPct=80;p.otherVariablePct=20;expect(businessSchema.safeParse(p).success).toBe(false)
    p.otherVariablePct=10;p.launch.date='2026-02-30';expect(businessSchema.safeParse(p).success).toBe(false)
  })
  it('accepts existing backups and preserves the new budget on a round trip',()=>{
    const state=emptyWorkspace();expect(workspaceSchema.parse(state).business).toBeUndefined()
    state.business=emptyBusinessPlan();expect(workspaceSchema.parse(JSON.parse(JSON.stringify(state))).business).toEqual(state.business)
  })
})
