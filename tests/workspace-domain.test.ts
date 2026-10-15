import { describe, it, expect } from 'vitest'
import { costRecipe, convertQuantity, emptyWorkspace, sampleWorkspace, unitCost, orderPacks, createDraftOrders, receiveOrder, logWaste, stockStatus, workspaceSchema, kitchenDay, escapeCsv, type Ingredient, type Recipe } from '../src/lib/workspace/domain'
import { parseCsv, inventoryCsv, importInventory } from '../src/lib/workspace/import-export'

const ingredient: Ingredient = { id:'test-flour',name:'Flour',category:'Pantry',supplierId:null,purchaseLabel:'5 kg bag',baseUnit:'g',packQuantity:5000,price:20,yieldPct:80,stock:1000,par:7000,notes:'' }
const recipe: Recipe = { id:'test-recipe',name:'Test batch',category:'Bakery',portions:10,sellingPrice:10,notes:'',items:[{id:'item-1',ingredientId:'test-flour',quantity:2,unit:'kg'}] }

describe('Kitchen costing',()=>{
  it('applies usable yield and converts batch quantities before dividing into portions',()=>{
    expect(unitCost(ingredient)).toBeCloseTo(.005,8)
    const cost=costRecipe(recipe,[ingredient],30)
    expect(cost.batchCost).toBeCloseTo(10,8)
    expect(cost.portionCost).toBeCloseTo(1,8)
    expect(cost.foodCost).toBeCloseTo(10,8)
    expect(cost.contribution).toBeCloseTo(9,8)
    expect(cost.suggestedPrice).toBeCloseTo(10/3,8)
    expect(cost.status).toBe('on-target')
  })
  it('recalculates every affected recipe when a pack price changes',()=>{
    expect(costRecipe(recipe,[{...ingredient,price:40}],30).portionCost).toBe(2)
  })
  it('never treats missing supplier pricing as a zero cost',()=>{
    const result=costRecipe(recipe,[{...ingredient,price:null}])
    expect(result.batchCost).toBeNull();expect(result.portionCost).toBeNull();expect(result.foodCost).toBeNull();expect(result.status).toBe('incomplete')
  })
  it('rejects weight-to-volume conversion without a known density',()=>{
    expect(convertQuantity(5,'g','ml')).toBeNull()
    expect(costRecipe({...recipe,items:[{...recipe.items[0],unit:'ml'}]},[ingredient]).status).toBe('incomplete')
  })
  it('flags a zero selling price while keeping a known portion cost',()=>{
    const result=costRecipe({...recipe,sellingPrice:0},[ingredient])
    expect(result.portionCost).toBe(1);expect(result.foodCost).toBeNull();expect(result.contribution).toBeNull();expect(result.status).toBe('incomplete')
  })
  it('does not produce a per-portion cost without a batch yield',()=>{
    expect(costRecipe({...recipe,portions:null},[ingredient]).portionCost).toBeNull()
    expect(costRecipe({...recipe,items:[]},[ingredient]).batchCost).toBeNull()
    expect(costRecipe({...recipe,items:[{...recipe.items[0],quantity:0}]},[ingredient]).batchCost).toBeNull()
  })
  it('converts pounds and litres consistently',()=>{
    expect(convertQuantity(1,'lb','g')).toBeCloseTo(453.59237,5)
    expect(convertQuantity(2,'L','ml')).toBe(2000)
    expect(convertQuantity(2,'each','g')).toBeNull()
  })
})

describe('Inventory and receiving',()=>{
  it('rounds stock shortfalls up to whole usable purchase packs',()=>{
    expect(orderPacks(ingredient)).toBe(2)
    expect(orderPacks({...ingredient,stock:7000})).toBe(0)
    expect(orderPacks({...ingredient,stock:null})).toBeNull()
    expect(stockStatus({...ingredient,stock:null})).toBe('unknown')
  })
  it('groups by supplier and excludes ingredients on an open order',()=>{
    const state={...emptyWorkspace(),ingredients:[ingredient]}
    const orders=createDraftOrders(state,'2026-10-09',()=> 'order-1')
    expect(orders).toHaveLength(1);expect(orders[0].lines[0].packs).toBe(2)
    expect(createDraftOrders({...state,orders})).toHaveLength(0)
  })
  it('receives the snapshotted usable quantity and refuses a second receipt',()=>{
    const state={...emptyWorkspace(),ingredients:[ingredient]}
    const drafts=createDraftOrders(state,'2026-10-09',()=> 'order-1')
    const ordered={...state,orders:drafts.map(o=>({...o,status:'ordered' as const}))}
    const next=receiveOrder(ordered,'order-1','2026-10-10')
    expect(next.ingredients[0].stock).toBe(9000)
    expect(next.orders[0].status).toBe('received')
    expect(()=>receiveOrder(next,'order-1')).toThrow('once')
  })
  it('refuses receipt into uncounted stock or a changed stock unit',()=>{
    const state={...emptyWorkspace(),ingredients:[ingredient]}
    const orders=createDraftOrders(state,'2026-10-09',()=> 'order-1').map(o=>({...o,status:'ordered' as const}))
    expect(()=>receiveOrder({...state,orders,ingredients:[{...ingredient,stock:null}]},'order-1')).toThrow('Count')
    expect(()=>receiveOrder({...state,orders,ingredients:[{...ingredient,baseUnit:'ml'}]},'order-1')).toThrow('unit')
  })
})

describe('Waste and record validation',()=>{
  it('deducts only the wasted quantity and snapshots the cost',()=>{
    const state={...emptyWorkspace(),ingredients:[ingredient]}
    const next=logWaste(state,{id:'waste-1',ingredientId:ingredient.id,quantity:100,unit:'g',reason:'Spoilage',date:'2026-10-09'})
    expect(next.ingredients[0].stock).toBe(900)
    expect(next.waste[0].cost).toBe(.5)
    expect(state.ingredients[0].stock).toBe(1000)
  })
  it('does not allow waste exceeding stock or a mismatched unit',()=>{
    const state={...emptyWorkspace(),ingredients:[ingredient]}
    const entry={id:'waste-1',ingredientId:ingredient.id,quantity:1100,unit:'g' as const,reason:'Spoilage',date:'2026-10-09'}
    expect(()=>logWaste(state,entry)).toThrow('exceed')
    expect(()=>logWaste(state,{...entry,quantity:10,unit:'ml'})).toThrow()
  })
  it('validates schema version, references, unique names, and real dates',()=>{
    expect(workspaceSchema.safeParse(sampleWorkspace('2026-10-09')).success).toBe(true)
    expect(workspaceSchema.safeParse({...emptyWorkspace(),version:2}).success).toBe(false)
    expect(workspaceSchema.safeParse({...emptyWorkspace(),recipes:[recipe]}).success).toBe(false)
    expect(workspaceSchema.safeParse({...emptyWorkspace(),ingredients:[ingredient,{...ingredient,id:'other'}]}).success).toBe(false)
    const sample=sampleWorkspace('2026-10-09')
    expect(workspaceSchema.safeParse({...sample,prep:[{...sample.prep[0],due:'2026-02-30'}]}).success).toBe(false)
  })
  it('uses the kitchen timezone rather than UTC for overnight dates',()=>{
    expect(kitchenDay(new Date('2026-10-10T00:30:00Z'))).toBe('2026-10-09')
  })
})

describe('CSV imports and exports',()=>{
  it('round-trips quoted commas, newlines, and BOMs',()=>{
    const sample={...emptyWorkspace(),ingredients:[{...ingredient,name:'Flour, pastry',notes:'Line one\nLine "two"'}]}
    const output=inventoryCsv(sample)
    const imported=importInventory(output,emptyWorkspace(),()=> 'imported')
    expect(imported.ingredients[0].name).toBe('Flour, pastry')
    expect(imported.ingredients[0].notes).toBe('Line one\nLine "two"')
    expect(imported.ingredients[0].price).toBe(20)
  })
  it('updates by name while preserving the referenced ID',()=>{
    const state={...emptyWorkspace(),ingredients:[ingredient],recipes:[recipe]}
    const source=inventoryCsv({...state,ingredients:[{...ingredient,price:35}]})
    const imported=importInventory(source,state)
    expect(imported.ingredients).toHaveLength(1)
    expect(imported.ingredients[0].id).toBe(ingredient.id)
    expect(imported.ingredients[0].price).toBe(35)
    expect(imported.recipes[0].items[0].ingredientId).toBe(ingredient.id)
  })
  it('rejects malformed quoting, invalid numbers, and unit changes',()=>{
    expect(()=>parseCsv('name\n"broken')).toThrow('unclosed')
    expect(()=>importInventory('name,base_unit,pack_quantity,pack_price_cad\nFlour,g,5000,oops',emptyWorkspace())).toThrow('price')
    expect(()=>importInventory('name,base_unit,pack_quantity,pack_price_cad\nFlour,ml,5000,20',{...emptyWorkspace(),ingredients:[ingredient]})).toThrow('base unit')
  })
  it('neutralizes spreadsheet formula injection',()=>{
    expect(escapeCsv('=HYPERLINK("bad")')).toContain("'=HYPERLINK")
    expect(escapeCsv('  +CMD()')).toContain("'  +CMD")
    expect(escapeCsv(20)).toBe('"20"')
  })
})
