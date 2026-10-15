import { sampleWorkspace } from './domain'
export function demoWorkspace(){
  const state=sampleWorkspace()
  state.settings.kitchenName='Juniper Kitchen'
  state.business={weeks:52,employerPct:18,overtimeAllowance:2500,recruitingBudget:2000,monthlySales:65000,foodPct:30,otherVariablePct:3,monthlyOverhead:9000,
    roles:[{id:'demo-chef',role:'Head chef',people:1,basis:'annual',rate:55000,weeklyHours:null},{id:'demo-cooks',role:'Line cook',people:2,basis:'hourly',rate:26,weeklyHours:35},{id:'demo-dish',role:'Dishwasher',people:1,basis:'hourly',rate:20,weeklyHours:25}],
    launch:{name:'Spring brunch menu',date:null,done:['scope','recipes','suppliers']}}
  return state
}
