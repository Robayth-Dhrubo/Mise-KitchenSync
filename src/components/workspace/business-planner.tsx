'use client'

import { useId, useState, type FormEvent } from 'react'
import { ArrowRight, Check, CheckCircle2, Download, Info, Plus, Save, Trash2, Users, Wallet, TrendingUp, CalendarDays } from 'lucide-react'
import { businessSchema, businessTotals, emptyBusinessPlan, annualRoleCost, menuLaunchSteps, type BusinessPlan } from '@/lib/workspace/business'
import { costRecipe, money, type Workspace } from '@/lib/workspace/domain'
import { useUnsavedChanges } from './operations-ui'
import { setupSteps } from '@/lib/workspace/readiness'
import { csv, download } from '@/lib/workspace/import-export'

type Props={state:Workspace;busy:boolean;save:(next:Workspace)=>Promise<boolean>;demo?:boolean}
function NumberField({label,value,onChange,suffix,min=0,max=1e9,step='0.01'}:{label:string;value:number|null;onChange:(v:number|null)=>void;suffix?:string;min?:number;max?:number;step?:string}) {
  const hint=useId()
  return <label className="plan-field"><span>{label}</span><div><input aria-label={label} aria-describedby={suffix?hint:undefined} type="number" min={min} max={max} step={step} value={value??''} placeholder="Not entered" onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}/>{suffix&&<small id={hint}>{suffix}</small>}</div></label>
}
function Stat({label,value,note,icon}:{label:string;value:string;note:string;icon:React.ReactNode}){
  return <article className="plan-stat"><div>{icon}<span>{label}</span></div><strong>{value}</strong><p>{note}</p></article>
}
export function BusinessPlanner({state,busy,save,demo=false}:Props) {
  const [plan,setPlan]=useState<BusinessPlan>(()=>state.business??emptyBusinessPlan())
  const [message,setMessage]=useState('')
  const [importing,setImporting]=useState(false)
  const [source,setSource]=useState(state.business)
  if(source!==state.business){setSource(state.business);setPlan(state.business??emptyBusinessPlan())}
  const totals=businessTotals(plan)
  const dirty=JSON.stringify(plan)!==JSON.stringify(state.business??emptyBusinessPlan())
  useUnsavedChanges(dirty)
  const change=<K extends keyof BusinessPlan>(key:K,value:BusinessPlan[K])=>setPlan(p=>({...p,[key]:value}))
  async function submit(e:FormEvent){e.preventDefault();const result=businessSchema.safeParse(plan);if(!result.success){setMessage(result.error.issues[0].message);return}if(await save({...state,business:result.data}))setMessage('Budget saved to your kitchen.')}
  async function importRoster(){
    setImporting(true);setMessage('')
    try {
      const response=await fetch('/api/faberge',{cache:'no-store',signal:AbortSignal.timeout(20000)})
      const body=await response.json()
      if(!response.ok||!body.report?.team?.schedule?.length)throw new Error('No imported roster is available for this kitchen.')
      const rows=body.report.team.schedule as {name:string;role:string;payType:string;rate:number|null;hours:number|null;weeklyCost:number|null}[]
      if(plan.roles.length&&!window.confirm('Replace the budget roles with the imported draft roster?'))return
      const roles=rows.map(p=>({id:crypto.randomUUID(),role:p.role||p.name,people:1,basis:p.payType==='Salary'?'annual' as const:'hourly' as const,rate:p.payType==='Salary'?(p.weeklyCost===null?null:p.weeklyCost*plan.weeks):p.rate,weeklyHours:p.payType==='Salary'?null:p.hours}))
      change('roles',roles);setMessage('Draft roster loaded into this scenario. Salary allocations are annualized using the selected weeks. Confirm rates, hours and staffing before saving.')
    }catch(e){setMessage(e instanceof Error?e.message:'The roster could not be loaded.')}
    finally{setImporting(false)}
  }
  function exportBudget(){download(csv([
    ['role','positions','pay_basis','rate_cad','hours_per_week','annual_base_wages_cad'],
    ...plan.roles.map(r=>[r.role,r.people,r.basis,r.rate,r.weeklyHours,annualRoleCost(r,plan.weeks)]),
    [],['assumption','value'],['paid_weeks',plan.weeks],['employer_cost_pct',plan.employerPct],['annual_overtime_allowance_cad',plan.overtimeAllowance],['annual_recruitment_cad',plan.recruitingBudget],
    ['annual_wages_cad',totals.wages],['annual_loaded_labour_cad',totals.loadedLabour],['annual_hiring_budget_cad',totals.hiringBudget],['monthly_sales_cad',plan.monthlySales],['food_pct',plan.foodPct],['other_variable_pct',plan.otherVariablePct],['monthly_fixed_overhead_cad',plan.monthlyOverhead],['monthly_break_even_sales_cad',totals.breakEven],['monthly_operating_scenario_cad',totals.operatingResult],
  ]),'mise-annual-labour-budget.csv','text/csv;charset=utf-8')}
  return <form className="business-planner" onSubmit={submit}>
    <section className="business-hero"><div><span className="eyebrow">BUILD A PLAN YOU CAN AFFORD</span><h2>Know the cost of your team.</h2><p>Set staffing and sales assumptions. See your annual hiring budget and the monthly sales needed to cover it.</p></div><span className="hero-emblem"><Wallet size={34} strokeWidth={1.5}/></span></section>
    <div className="plan-stats"><Stat label="Annual base wages" value={money(totals.wages,0)} note="All planned positions, before employer costs" icon={<Users size={17}/>}/><Stat label="Annual hiring budget" value={money(totals.hiringBudget,0)} note="Wages, allowance, employer costs and recruitment" icon={<Wallet size={17}/>}/><Stat label="Monthly break-even sales" value={money(totals.breakEven,0)} note="Uses your variable costs and fixed overhead" icon={<TrendingUp size={17}/>}/></div>
    <section className="panel budget-roles"><div className="plan-heading"><div><h2>Your staffing plan</h2><p>Annual salary or hourly pay × weekly hours × paid weeks.</p></div><div className="plan-actions">{!demo&&state.ingredients.some(i=>i.source)&&<button type="button" className="text-button" disabled={busy||importing} onClick={()=>void importRoster()}>Use imported draft roster</button>}<button type="button" className="button secondary small" onClick={()=>change('roles',[...plan.roles,{id:crypto.randomUUID(),role:'New position',people:1,basis:'hourly',rate:null,weeklyHours:null}])} disabled={busy}><Plus size={15}/>Add position</button></div></div>
      {!plan.roles.length?<div className="budget-empty"><Users size={30}/><h3>Start with the positions you need</h3><p>Add the chef, cooks and dishwashers in your plan. Unfilled positions belong in the budget too.</p></div>:<div className="table-scroll"><table className="budget-table"><thead><tr><th>Position</th><th>People</th><th>Pay basis</th><th>Pay / rate (CAD)</th><th>Hours / week</th><th className="numeric">Annual wages</th><th><span className="sr-only">Remove</span></th></tr></thead><tbody>{plan.roles.map((r,index)=>{
        function update(partial:Partial<typeof r>){change('roles',plan.roles.map((x,i)=>i===index?{...x,...partial}:x))}
        return <tr key={r.id}><td><input aria-label={`Position ${index+1}`} value={r.role} maxLength={120} required onChange={e=>update({role:e.target.value})}/></td><td><input aria-label={`People for position ${index+1}`} type="number" min={1} max={100} step={1} required value={r.people} onChange={e=>update({people:Number(e.target.value)})}/></td><td><select aria-label={`Pay basis for position ${index+1}`} value={r.basis} onChange={e=>update({basis:e.target.value as typeof r.basis,rate:null})}><option value="hourly">Hourly</option><option value="annual">Annual salary</option></select></td><td><input aria-label={`Rate for position ${index+1}`} type="number" min={0} max={1e9} step="0.01" value={r.rate??''} placeholder="Not entered" onChange={e=>update({rate:e.target.value===''?null:Number(e.target.value)})}/><small>{r.basis==='annual'?'per person / year':'per person / hour'}</small></td><td>{r.basis==='hourly'?<input aria-label={`Weekly hours for position ${index+1}`} type="number" min={0} max={168} step="0.25" value={r.weeklyHours??''} placeholder="Not entered" onChange={e=>update({weeklyHours:e.target.value===''?null:Number(e.target.value)})}/>:<span className="muted-text">Salary basis</span>}</td><td className="numeric">{money(annualRoleCost(r,plan.weeks),0)}</td><td><button type="button" className="icon-button" aria-label={`Remove position ${index+1}`} disabled={busy} onClick={()=>change('roles',plan.roles.filter(x=>x.id!==r.id))}><Trash2 size={15}/></button></td></tr>
      })}</tbody></table></div>}
    </section>
    <div className="budget-grid"><section className="panel"><div className="plan-heading"><div><h2>Complete the annual budget</h2><p>Leave unknown costs blank. Enter zero only when a cost is confirmed as zero.</p></div></div><div className="plan-fields"><NumberField label="Paid weeks for hourly positions" value={plan.weeks} min={1} max={53} step="1" onChange={v=>{if(v!==null)change('weeks',v)}} suffix="weeks"/><NumberField label="Employer costs and benefits" value={plan.employerPct} max={100} onChange={v=>change('employerPct',v)} suffix="% of wages + allowance"/><NumberField label="Annual overtime allowance" value={plan.overtimeAllowance} onChange={v=>change('overtimeAllowance',v)} suffix="CAD / year"/><NumberField label="Annual recruitment and training" value={plan.recruitingBudget} onChange={v=>change('recruitingBudget',v)} suffix="CAD / year"/></div></section>
    <section className="panel"><div className="plan-heading"><div><h2>Test the sales scenario</h2><p>Use sales before sales tax. Overhead excludes costs already entered as labour.</p></div></div><div className="plan-fields"><NumberField label="Projected monthly net sales" value={plan.monthlySales} onChange={v=>change('monthlySales',v)} suffix="CAD / month"/><NumberField label="Food and beverage cost" value={plan.foodPct} max={99} onChange={v=>change('foodPct',v)} suffix="% of sales"/><NumberField label="Other variable costs" value={plan.otherVariablePct} max={99} onChange={v=>change('otherVariablePct',v)} suffix="% of sales"/><NumberField label="Other fixed monthly overhead" value={plan.monthlyOverhead} onChange={v=>change('monthlyOverhead',v)} suffix="CAD / month"/></div><div className={`scenario-result ${totals.operatingResult!==null&&totals.operatingResult<0?'negative':''}`}><span>Monthly operating scenario</span><strong>{money(totals.operatingResult,0)}</strong><p>{totals.labourPct===null?'Complete the assumptions to calculate a result.':`${totals.labourPct.toFixed(1)}% planned labour cost · before income tax, financing and capital spending`}</p></div></section></div>
    <div className="plan-note"><Info size={18}/><p>This is a planning model. Check wage obligations and employer costs for your situation. The hourly calculation uses base pay; budget overtime separately. Sales targets and costs are your assumptions.</p></div>
    {message&&<div className="plan-feedback" role="status">{message}</div>}
    <div className="plan-save"><span>{dirty?'Unsaved scenario':'Saved assumptions'} · CAD</span><div><button type="button" className="button secondary" onClick={exportBudget}><Download size={16}/>Export budget</button><button className="button primary" type="submit" disabled={busy||!dirty}><Save size={16}/>{busy?'Saving…':'Save budget'}</button></div></div>
  </form>
}
export function MenuLaunch({state,busy,save}:Props){
  const [launch,setLaunch]=useState(()=>state.business?.launch??emptyBusinessPlan().launch)
  const [message,setMessage]=useState('')
  const [source,setSource]=useState(state.business?.launch)
  if(source!==state.business?.launch){setSource(state.business?.launch);setLaunch(state.business?.launch??emptyBusinessPlan().launch)}
  useUnsavedChanges(JSON.stringify(launch)!==JSON.stringify(state.business?.launch??emptyBusinessPlan().launch))
  const count=menuLaunchSteps.filter(s=>launch.done.includes(s.id)).length
  const ready=state.recipes.filter(r=>costRecipe(r,state.ingredients,state.settings.targetFoodCost).status!=='incomplete').length
  async function submit(e:FormEvent){e.preventDefault();if(await save({...state,business:{...(state.business??emptyBusinessPlan()),launch}}))setMessage('Menu launch plan saved.')}
  return <form className="menu-launch" onSubmit={submit}><section className="business-hero"><div><span className="eyebrow">FROM RECIPE TO SERVICE</span><h2>Launch with the team ready.</h2><p>A practical sequence for approving, rehearsing and reviewing your next menu.</p></div><span className="hero-emblem"><CalendarDays size={34}/></span></section><section className="panel launch-settings"><label className="plan-field"><span>Launch name</span><input value={launch.name} maxLength={120} onChange={e=>setLaunch(l=>({...l,name:e.target.value}))}/></label><label className="plan-field"><span>Service launch date</span><input type="date" value={launch.date??''} onChange={e=>setLaunch(l=>({...l,date:e.target.value||null}))}/></label><div className="launch-progress"><span>{count} / {menuLaunchSteps.length} steps complete</span><div><i style={{width:`${count/menuLaunchSteps.length*100}%`}}/></div><small>{ready} of {state.recipes.length} recipes have complete costing inputs</small></div></section><div className="launch-stages">{['Prepare','Rehearse','Launch','Review'].map((stage,index)=><section className="panel launch-stage" key={stage}><div className="launch-stage-title"><span>0{index+1}</span><h2>{stage}</h2></div>{menuLaunchSteps.filter(s=>s.stage===stage).map(step=><label className={`launch-step ${launch.done.includes(step.id)?'complete':''}`} key={step.id}><input type="checkbox" checked={launch.done.includes(step.id)} onChange={e=>setLaunch(l=>({...l,done:e.target.checked?[...l.done,step.id]:l.done.filter(id=>id!==step.id)}))}/><span className="launch-checkbox">{launch.done.includes(step.id)&&<Check size={13}/>}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div></label>)}</section>)}</div>{message&&<p role="status" className="plan-feedback">{message}</p>}<div className="plan-save"><span>Completion is confirmed by you and your team.</span><button type="submit" className="button primary" disabled={busy}><Save size={16}/>Save launch plan</button></div></form>
}
export function SetupGuide({state,navigate}:{state:Workspace;navigate:(view:string)=>void}){
  const steps=setupSteps(state)
  const complete=steps.filter(step=>step.done).length
  const next=steps.find(step=>!step.done)
  if(!next)return null
  return <section className="setup-compact"><span><CheckCircle2 size={19}/></span><div><h2>Your kitchen setup<span className="setup-count">{complete} / {steps.length} inputs ready</span></h2><p>Next: {next.title.toLowerCase()}.</p></div><button className="text-button" onClick={()=>navigate('start')}>Continue setup<ArrowRight size={14}/></button></section>
}

export function FirstKitchen({state,busy,save}:Props){
  const [name,setName]=useState(state.settings.kitchenName)
  const [target,setTarget]=useState(state.settings.targetFoodCost)
  const [message,setMessage]=useState('')
  async function submit(e:FormEvent){e.preventDefault();if(await save({...state,settings:{kitchenName:name,targetFoodCost:target}}))setMessage('Your kitchen is set up. Add suppliers and your first ingredient below.')}
  return <form className="panel first-kitchen" onSubmit={submit}><div><span className="eyebrow">WELCOME TO MISE</span><h2>A fresh start for your kitchen.</h2><p>Give your workspace a name and set an initial food-cost target. You can change both later.</p></div><label className="plan-field"><span>Kitchen name</span><input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><NumberField label="Food-cost target" value={target} min={0.1} max={99.9} onChange={v=>{if(v!==null)setTarget(v)}} suffix="% · your planning target"/><button type="submit" className="button primary" disabled={busy}><Check size={16}/>Save kitchen setup</button>{message&&<p role="status">{message}</p>}</form>
}
