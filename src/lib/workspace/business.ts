import { z } from 'zod'

const amount = z.number().finite().min(0).max(1e9).nullable()
const label = z.string().trim().min(1).max(120)
export const businessSchema = z.object({
  weeks: z.number().int().min(1).max(53),
  employerPct: z.number().min(0).max(100).nullable(),
  overtimeAllowance: amount,
  recruitingBudget: amount,
  monthlySales: amount,
  foodPct: z.number().min(0).max(99).nullable(),
  otherVariablePct: z.number().min(0).max(99).nullable(),
  monthlyOverhead: amount,
  roles: z.array(z.object({
    id: z.string().min(1).max(100), role: label, people: z.number().int().min(1).max(100),
    basis: z.enum(['hourly', 'annual']), rate: amount,
    weeklyHours: z.number().min(0).max(168).nullable(),
  })).max(100),
  launch: z.object({ name: z.string().max(120), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v},'Use a valid launch date').nullable(), done: z.array(z.string().max(60)).max(30) }),
}).superRefine((p, ctx) => {
  if (new Set(p.roles.map(r => r.id)).size !== p.roles.length) ctx.addIssue({ code:'custom', message:'Budget roles need unique IDs.' })
  if (p.foodPct !== null && p.otherVariablePct !== null && p.foodPct + p.otherVariablePct >= 100) ctx.addIssue({ code:'custom', message:'Variable costs must total less than 100% of sales.' })
})
export type BusinessPlan = z.infer<typeof businessSchema>
export function emptyBusinessPlan(): BusinessPlan {
  return { weeks:52, employerPct:null, overtimeAllowance:null, recruitingBudget:null, monthlySales:null,
    foodPct:null, otherVariablePct:null, monthlyOverhead:null, roles:[], launch:{ name:'New menu launch',date:null,done:[] } }
}
export function annualRoleCost(role: BusinessPlan['roles'][number], weeks: number): number | null {
  if (role.rate === null || role.basis === 'hourly' && role.weeklyHours === null) return null
  return role.people * role.rate * (role.basis === 'annual' ? 1 : role.weeklyHours! * weeks)
}
export function businessTotals(plan: BusinessPlan) {
  const costs = plan.roles.map(r => annualRoleCost(r,plan.weeks))
  const wages = costs.length && costs.every(c=>c !== null) ? costs.reduce<number>((sum,c)=>sum+c!,0) : null
  const loadedLabour = wages !== null && plan.employerPct !== null && plan.overtimeAllowance !== null
    ? (wages + plan.overtimeAllowance) * (1+plan.employerPct/100) : null
  const hiringBudget = loadedLabour !== null && plan.recruitingBudget !== null ? loadedLabour+plan.recruitingBudget : null
  const variablePct = plan.foodPct !== null && plan.otherVariablePct !== null ? plan.foodPct + plan.otherVariablePct : null
  const fixedMonthly = hiringBudget !== null && plan.monthlyOverhead !== null ? hiringBudget/12 + plan.monthlyOverhead : null
  const breakEven = fixedMonthly !== null && variablePct !== null && variablePct < 100 ? fixedMonthly/(1-variablePct/100) : null
  const operatingResult = plan.monthlySales !== null && fixedMonthly !== null && variablePct !== null
    ? plan.monthlySales*(1-variablePct/100)-fixedMonthly : null
  const labourPct = plan.monthlySales !== null && plan.monthlySales > 0 && loadedLabour !== null ? loadedLabour/12/plan.monthlySales*100 : null
  return { wages, loadedLabour, hiringBudget, variablePct, fixedMonthly, breakEven, operatingResult, labourPct }
}
export const menuLaunchSteps = [
  { id:'scope', stage:'Prepare', title:'Approve the menu', detail:'Agree on the final dishes, prices and launch date with the owner.' },
  { id:'recipes', stage:'Prepare', title:'Finish every recipe card', detail:'Measure batch yield, portions and ingredient quantities. Resolve all missing costs.' },
  { id:'suppliers', stage:'Prepare', title:'Confirm purchasing', detail:'Check invoice prices, pack sizes, delivery days and first-week pars.' },
  { id:'prep', stage:'Rehearse', title:'Write the station prep', detail:'Assign prep quantities, owners, storage labels and service dates.' },
  { id:'trial', stage:'Rehearse', title:'Run a timed service trial', detail:'Cook and plate each dish with the team. Record bottlenecks and adjust the prep.' },
  { id:'training', stage:'Rehearse', title:'Train kitchen and front of house', detail:'Cover portions, plating, substitutions and allergen information verified from ingredients.' },
  { id:'pos', stage:'Launch', title:'Update POS and printed menus', detail:'Match prices, item names and modifiers. Check a test order before service.' },
  { id:'opening', stage:'Launch', title:'Complete the opening check', detail:'Confirm counts, prep, deliveries and the staffing plan for the first service.' },
  { id:'review', stage:'Review', title:'Review the first week', detail:'Compare item sales, ingredient usage, waste and scheduled labour. Adjust portions or pars.' },
] as const
