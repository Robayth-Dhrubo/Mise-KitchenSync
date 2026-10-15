import { kitchenDay, sampleWorkspace } from './domain'
import { addDays, emptyOperations, suggestedRoutines, weekStart } from './operations'
export function demoWorkspace(){
  const state=sampleWorkspace()
  state.settings.kitchenName='Juniper Kitchen'
  state.business={weeks:52,employerPct:18,overtimeAllowance:2500,recruitingBudget:2000,monthlySales:65000,foodPct:30,otherVariablePct:3,monthlyOverhead:9000,
    roles:[{id:'demo-chef',role:'Head chef',people:1,basis:'annual',rate:55000,weeklyHours:null},{id:'demo-cooks',role:'Line cook',people:2,basis:'hourly',rate:26,weeklyHours:35},{id:'demo-dish',role:'Dishwasher',people:1,basis:'hourly',rate:20,weeklyHours:25}],
    launch:{name:'Spring brunch menu',date:null,done:['scope','recipes','suppliers']}}
  state.recipes.push(
    {id:'demo-toast',name:'Eggs on toast',category:'Brunch',portions:1,sellingPrice:16,notes:'Illustrative demo recipe.',items:[{id:'toast-egg',ingredientId:'sample-eggs',quantity:2,unit:'each'},{id:'toast-bread',ingredientId:'sample-brioche',quantity:1,unit:'each'},{id:'toast-butter',ingredientId:'sample-butter',quantity:10,unit:'g'}]},
    {id:'demo-omelette',name:'Ham & cheddar omelette',category:'Brunch',portions:1,sellingPrice:21,notes:'Illustrative demo recipe.',items:[{id:'omelette-egg',ingredientId:'sample-eggs',quantity:3,unit:'each'},{id:'omelette-ham',ingredientId:'sample-ham',quantity:60,unit:'g'},{id:'omelette-cheese',ingredientId:'sample-cheese',quantity:30,unit:'g'},{id:'omelette-butter',ingredientId:'sample-butter',quantity:10,unit:'g'}]},
    {id:'demo-brioche',name:'Grilled breakfast brioche',category:'Brunch',portions:1,sellingPrice:15,notes:'Illustrative demo recipe.',items:[{id:'brioche-bread',ingredientId:'sample-brioche',quantity:2,unit:'each'},{id:'brioche-cheese',ingredientId:'sample-cheese',quantity:60,unit:'g'},{id:'brioche-butter',ingredientId:'sample-butter',quantity:20,unit:'g'}]},
  )
  const today=kitchenDay(),start=weekStart(today)
  state.operations=emptyOperations()
  state.operations.employees=[
    {id:'demo-alex',name:'Alex',role:'Line cook',hourlyRate:26,active:true,availableDays:[0,1,2,3,4,5,6],notes:'Fictional demo employee.'},
    {id:'demo-sam',name:'Sam',role:'Prep cook',hourlyRate:23,active:true,availableDays:[0,1,2,3,4,5,6],notes:'Fictional demo employee.'},
    {id:'demo-jordan',name:'Jordan',role:'Dishwasher',hourlyRate:null,active:true,availableDays:[0,1,2,3,4,5,6],notes:'Missing rate illustrates an incomplete wage total.'},
  ]
  state.operations.shifts=[0,1,2,3,4,5,6].flatMap((day)=>[
    {id:`demo-shift-a-${day}`,employeeId:'demo-alex',date:addDays(start,day),start:'07:30',end:'15:30',endsNextDay:false,unpaidBreak:30,station:'Hot line',hourlyRate:26,actualHours:addDays(start,day)<today?7.5:null,status:addDays(start,day)<today?'approved' as const:'planned' as const},
    ...(day===0||day===5||day===6?[{id:`demo-shift-s-${day}`,employeeId:'demo-sam',date:addDays(start,day),start:'08:00',end:'15:00',endsNextDay:false,unpaidBreak:30,station:'Cold prep',hourlyRate:23,actualHours:null,status:'planned' as const}]:[]),
  ])
  state.operations.weeks=[{start,projectedSales:24000,hoursReview:40}]
  state.operations.salesReports=[{id:'demo-sales',name:'Last week’s brunch',from:addDays(today,-7),through:addDays(today,-1),source:'Illustrative till export',rows:[
    {id:'demo-sale-monte',item:'Monte Cristo',quantity:120,netSales:2880,recipeId:'sample-monte'},
    {id:'demo-sale-toast',item:'Eggs on toast',quantity:150,netSales:2400,recipeId:'demo-toast'},
    {id:'demo-sale-omelette',item:'Ham & cheddar omelette',quantity:25,netSales:525,recipeId:'demo-omelette'},
    {id:'demo-sale-brioche',item:'Grilled breakfast brioche',quantity:20,netSales:300,recipeId:'demo-brioche'},
  ]}]
  state.operations.routines=suggestedRoutines.map((routine,index)=>({...routine,id:`demo-routine-${index}`}))
  state.stockControl={stations:[{id:'demo-hot-line',name:'Hot line',assignee:'Alex',targets:[{recipeId:'sample-monte',par:24,onHand:6,countedOn:today},{recipeId:'demo-omelette',par:20,onHand:null,countedOn:null}]}]}
  return state
}
