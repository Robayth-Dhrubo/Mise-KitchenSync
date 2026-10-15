'use client'

import { useState, type ReactNode, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, Trash2, Info, ArrowRight } from 'lucide-react'
import { convertMeasure, measureUnits, purchaseUnits, unitLabel } from '@/lib/workspace/measurements'
import { costRecipe, ingredientSchema, recipeSchema, supplierSchema, prepSchema, logWaste, kitchenDay, money, quantity, type Ingredient, type Recipe, type Supplier, type PrepTask, type Workspace } from '@/lib/workspace/domain'

export type EditorProps = { state: Workspace; id?: string; busy: boolean; save: (next: Workspace) => Promise<boolean>; close: () => void; notify: (message: string) => void }
export function FormDialog({ title, description, close, busy, children }: { title: string; description: string; close: () => void; busy: boolean; children: ReactNode }) {
  return <Dialog.Root open onOpenChange={open => { if (!open && !busy) close() }}><Dialog.Portal><Dialog.Overlay className="mise-overlay"/><Dialog.Content className="mise-dialog" onEscapeKeyDown={e => { if (busy) e.preventDefault() }} onPointerDownOutside={e => { if (busy) e.preventDefault() }}>
    <div className="dialog-heading"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div><button type="button" className="icon-button" onClick={close} disabled={busy} aria-label="Close dialog"><X size={20}/></button></div>{children}
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}
export function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`form-field${wide ? ' wide' : ''}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}
const number = (value: string) => value.trim() === '' ? null : Number(value)
function Footer({ busy, close, label = 'Save changes' }: { busy: boolean; close: () => void; label?: string }) {
  return <div className="form-footer"><button type="button" className="button secondary" onClick={close} disabled={busy}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : label}<ArrowRight size={16}/></button></div>
}

export function IngredientEditor(props: EditorProps) {
  const { state, busy, close, save, notify } = props
  const existing = state.ingredients.find(i => i.id === props.id)
  const [value, setValue] = useState<Ingredient>(existing ?? { id: crypto.randomUUID(), name: '', category: 'Produce', supplierId: null, purchaseLabel: '', baseUnit: 'g', packQuantity: null, price: null, yieldPct: 100, stock: null, par: null, notes: '' })
  const [packUnit,setPackUnit]=useState<string>(value.baseUnit)
  const packUnits=purchaseUnits(value.baseUnit)
  const displayPackUnit=packUnits.includes(packUnit as typeof packUnits[number])?packUnit:value.baseUnit
  const packAmount=value.packQuantity===null?null:convertMeasure(value.packQuantity,value.baseUnit,displayPackUnit)
  const change = (key: keyof Ingredient, v: unknown) => setValue(old => ({ ...old, [key]: v }))
  const lockedUnit = existing && (state.recipes.some(r => r.items.some(i => i.ingredientId === existing.id)) || state.waste.some(w => w.ingredientId === existing.id) || state.orders.some(o => o.lines.some(l => l.ingredientId === existing.id)))
  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = ingredientSchema.safeParse(value)
    if (!parsed.success) return notify(parsed.error.issues[0].message)
    if (existing?.source && (value.price !== existing.price || value.packQuantity !== existing.packQuantity || value.yieldPct !== existing.yieldPct)) parsed.data.source = { ...existing.source, status: 'review', detail: 'Pricing changed in inventory. Confirm against the current supplier invoice.', priceDate: undefined }
    if (await save({ ...state, ingredients: existing ? state.ingredients.map(i => i.id === value.id ? parsed.data : i) : [...state.ingredients, parsed.data] })) close()
  }
  return <FormDialog title={existing ? 'Edit ingredient' : 'Add an ingredient'} description="Enter the full purchase pack. Recipe quantities and stock use the base unit." close={close} busy={busy}><form onSubmit={submit}><fieldset disabled={busy}><div className="form-grid">
    <Field label="Ingredient name" wide><input required maxLength={120} autoFocus value={value.name} onChange={e => change('name', e.target.value)} placeholder="e.g. Clarified butter"/></Field>
    <Field label="Category"><select value={value.category} onChange={e => change('category', e.target.value)}>{['Produce','Dairy & eggs','Meat & seafood','Pantry','Bakery','Beverages','Other'].map(v => <option key={v}>{v}</option>)}{!['Produce','Dairy & eggs','Meat & seafood','Pantry','Bakery','Beverages','Other'].includes(value.category) && <option>{value.category}</option>}</select></Field>
    <Field label="Supplier"><select value={value.supplierId ?? ''} onChange={e => change('supplierId', e.target.value || null)}><option value="">Unassigned</option>{state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
    <Field label="Purchase pack" hint="The unit on the supplier invoice."><input value={value.purchaseLabel} maxLength={300} onChange={e => change('purchaseLabel', e.target.value)} placeholder="e.g. 5 kg bag or case of 180"/></Field>
    <Field label="Price per full pack (CAD)"><input type="number" min="0" max="1000000000" step="any" value={value.price ?? ''} onChange={e => change('price', number(e.target.value))} placeholder="Leave blank if unknown"/></Field>
    <Field label="Base unit" hint={lockedUnit ? 'Locked because this ingredient is used in saved records.' : 'Use grams, millilitres, or individual pieces.'}><select disabled={!!lockedUnit} value={value.baseUnit} onChange={e => {setPackUnit(e.target.value);setValue(old=>({...old,baseUnit:e.target.value as Ingredient['baseUnit'],packQuantity:null,stock:null,par:null}))}}><option value="g">Grams (g)</option><option value="ml">Millilitres (ml)</option><option value="each">Pieces (each)</option></select></Field>
    <Field label="Purchase quantity unit" hint="Use the unit printed on the pack. US and Imperial volume units are named separately."><select value={displayPackUnit} onChange={e=>setPackUnit(e.target.value)}>{packUnits.map(unit=><option key={unit} value={unit}>{unitLabel(unit)}</option>)}</select></Field>
    <Field label={`Quantity in one pack (${unitLabel(displayPackUnit)})`} hint={value.packQuantity===null?'Enter the whole pack quantity.':`Stored as ${value.packQuantity.toLocaleString('en-CA',{maximumFractionDigits:5})} ${value.baseUnit} before yield loss.`}><input type="number" min="0.000001" step="any" value={packAmount===null?'':Number(packAmount.toFixed(9))} onChange={e => change('packQuantity', e.target.value===''?null:convertMeasure(Number(e.target.value),displayPackUnit,value.baseUnit))} placeholder="e.g. 5"/></Field>
    <Field label="Usable yield (%)" hint="100% means no trimming or preparation loss."><input required type="number" min="0.01" max="100" step="any" value={value.yieldPct} onChange={e => change('yieldPct', number(e.target.value))}/></Field>
    <Field label={`Available usable stock (${value.baseUnit})`} hint="Leave blank until you count it. Zero means none."><input type="number" min="0" step="any" value={value.stock ?? ''} onChange={e => change('stock', number(e.target.value))}/></Field>
    <Field label={`Target stock / par (${value.baseUnit})`} hint="The usable quantity you want on hand."><input type="number" min="0" step="any" value={value.par ?? ''} onChange={e => change('par', number(e.target.value))}/></Field>
    {value.baseUnit!=='each'&&<details className="ingredient-conversions wide"><summary>Optional: ingredient-specific weight / volume conversion</summary><Field label="Known density (grams per millilitre)" hint="Enter only a measured or supplier-confirmed density for this usable ingredient. Blank keeps weight and volume separate."><input type="number" min="0.000001" max="100" step="any" value={value.densityGPerMl??''} onChange={e=>change('densityGPerMl',number(e.target.value))}/></Field></details>}
    {value.source && <div className="source-stamp wide"><strong>Imported source: {value.source.file}</strong><p>{value.source.detail}</p><a className="text-button" href={`/api/faberge/file?id=${encodeURIComponent(value.source.fileId)}`}>Download original source</a></div>}<Field label="Notes" wide><textarea maxLength={300} rows={2} value={value.notes} onChange={e => change('notes', e.target.value)}/></Field>
  </div><div className="inline-note"><Info size={16}/><span>Cost per usable unit = pack price ÷ (pack quantity × yield). Case and box counts use your full purchase pack; trimmed recipe quantities use usable units.</span></div></fieldset><Footer busy={busy} close={close}/></form></FormDialog>
}

export function RecipeEditor(props: EditorProps) {
  const { state, busy, close, save, notify } = props
  const existing = state.recipes.find(r => r.id === props.id)
  const [value, setValue] = useState<Recipe>(existing ?? { id: crypto.randomUUID(), name: '', category: 'Brunch', portions: 1, sellingPrice: null, notes: '', items: [] })
  const result = costRecipe(value, state.ingredients, state.settings.targetFoodCost)
  const change = (key: keyof Recipe, v: unknown) => setValue(old => ({ ...old, [key]: v }))
  const changeItem = (index: number, key: string, v: unknown) => setValue(old => ({ ...old, items: old.items.map((item, n) => n === index ? { ...item, [key]: v } : item) }))
  function addItem() { setValue(old => ({ ...old, items: [...old.items, { id: crypto.randomUUID(), ingredientId: state.ingredients[0]?.id ?? '', quantity: null, unit: state.ingredients[0]?.baseUnit ?? 'g' }] })) }
  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = recipeSchema.safeParse(value)
    if (!parsed.success) return notify(parsed.error.issues[0].message)
    if (await save({ ...state, recipes: existing ? state.recipes.map(r => r.id === value.id ? parsed.data : r) : [...state.recipes, parsed.data] })) close()
  }
  return <FormDialog title={existing ? 'Edit recipe costing' : 'Cost a new recipe'} description="Enter usable quantities for the whole batch, then the portions produced. A purchase pack means its usable contents after yield." close={close} busy={busy}><form onSubmit={submit}><fieldset disabled={busy}><div className="form-grid">
    <Field label="Recipe name" wide><input required autoFocus maxLength={120} value={value.name} onChange={e => change('name', e.target.value)} placeholder="e.g. Monte Cristo"/></Field>
    <Field label="Category"><input maxLength={300} value={value.category} onChange={e => change('category', e.target.value)}/></Field>
    <Field label="Portions produced per batch"><input type="number" min="0.000001" step="any" value={value.portions ?? ''} onChange={e => change('portions', number(e.target.value))}/></Field>
    <Field label="Selling price per portion (CAD)" hint="Use the price before sales tax."><input type="number" min="0" step="any" value={value.sellingPrice ?? ''} onChange={e => change('sellingPrice', number(e.target.value))}/></Field>
    <div className="form-field"><span>Food cost target</span><div className="readonly-field">{state.settings.targetFoodCost}% <small>Change in Settings</small></div></div>
  </div><div className="section-mini"><h3>Batch ingredients</h3><button type="button" className="button small secondary" onClick={addItem} disabled={!state.ingredients.length || value.items.length >= 100}><Plus size={14}/>Add ingredient</button></div>
  {!state.ingredients.length && <div className="inline-note"><Info size={16}/>Add ingredients to inventory before building your recipe.</div>}
  {value.items.map((item, index) => <div className="recipe-line" key={item.id}>
    <label><span className="sr-only">Ingredient {index + 1}</span><select value={item.ingredientId} onChange={e => { const ingredient = state.ingredients.find(i => i.id === e.target.value); setValue(old => ({ ...old, items: old.items.map((i, n) => n === index ? { ...i, ingredientId: e.target.value, unit: ingredient?.baseUnit ?? 'g' } : i) })) }}><option value="" disabled>Select ingredient</option>{state.ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
    <label><span className="sr-only">Batch quantity for ingredient {index + 1}</span><input type="number" min="0.000001" step="any" placeholder="Qty" value={item.quantity ?? ''} onChange={e => changeItem(index, 'quantity', number(e.target.value))}/></label>
    <label><span className="sr-only">Unit for ingredient {index + 1}</span><select value={item.unit} onChange={e => changeItem(index, 'unit', e.target.value)}>{measureUnits.map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}</select></label>
    <span className="line-cost">{money(result.lines[index]?.cost ?? null)}</span><button className="icon-button" type="button" aria-label={`Remove ingredient ${index + 1}`} onClick={() => change('items', value.items.filter((_, n) => n !== index))}><Trash2 size={16}/></button>
  </div>)}
  <div className="cost-preview"><div><small>Batch cost</small><strong>{money(result.batchCost)}</strong></div><div><small>Cost per portion</small><strong>{money(result.portionCost)}</strong></div><div><small>Food cost</small><strong>{result.foodCost === null ? '—' : `${result.foodCost.toFixed(1)}%`}</strong></div><div><small>Price at target</small><strong>{money(result.suggestedPrice)}</strong></div></div>
  {!!result.issues.length && <div className="validation-note"><Info size={16}/><div><strong>This costing is incomplete</strong>{result.issues.map(issue => <span key={issue}>{issue}</span>)}</div></div>}
  <Field label="Recipe / preparation notes" wide><textarea maxLength={300} rows={3} value={value.notes} onChange={e => change('notes', e.target.value)}/></Field></fieldset><Footer busy={busy} close={close} label="Save recipe"/></form></FormDialog>
}

export function SupplierEditor(props: EditorProps) {
  const { state, busy, close, save, notify } = props
  const existing = state.suppliers.find(s => s.id === props.id)
  const [value, setValue] = useState<Supplier>(existing ?? { id: crypto.randomUUID(), name: '', contact: '', email: '', phone: '', deliveryDays: '', notes: '' })
  const change = (key: keyof Supplier, v: string) => setValue(old => ({ ...old, [key]: v }))
  async function submit(e: FormEvent) { e.preventDefault(); const parsed = supplierSchema.safeParse(value); if (!parsed.success) return notify(parsed.error.issues[0].message); if (await save({ ...state, suppliers: existing ? state.suppliers.map(s => s.id === value.id ? parsed.data : s) : [...state.suppliers, parsed.data] })) close() }
  return <FormDialog title={existing ? 'Edit supplier' : 'Add a supplier'} description="Keep delivery details and order contacts in one place." close={close} busy={busy}><form onSubmit={submit}><fieldset disabled={busy}><div className="form-grid">
    <Field label="Supplier name" wide><input required autoFocus maxLength={120} value={value.name} onChange={e => change('name', e.target.value)}/></Field>
    <Field label="Contact person"><input maxLength={300} value={value.contact} onChange={e => change('contact', e.target.value)}/></Field>
    <Field label="Phone"><input type="tel" maxLength={300} value={value.phone} onChange={e => change('phone', e.target.value)}/></Field>
    <Field label="Order email"><input type="email" maxLength={150} value={value.email} onChange={e => change('email', e.target.value)}/></Field>
    <Field label="Delivery days"><input maxLength={300} placeholder="e.g. Monday, Thursday" value={value.deliveryDays} onChange={e => change('deliveryDays', e.target.value)}/></Field>
    <Field label="Notes / ordering cut-off" wide><textarea maxLength={300} rows={3} value={value.notes} onChange={e => change('notes', e.target.value)}/></Field>
  </div></fieldset><Footer busy={busy} close={close}/></form></FormDialog>
}

export function PrepEditor(props: EditorProps) {
  const { state, busy, close, save, notify } = props
  const existing = state.prep.find(s => s.id === props.id)
  const [value, setValue] = useState<PrepTask>(existing ?? { id: crypto.randomUUID(), name: '', station: 'Hot line', assignee: '', quantity: '', due: kitchenDay(), priority: 'normal', status: 'todo' })
  const change = (key: keyof PrepTask, v: string) => setValue(old => ({ ...old, [key]: v }))
  async function submit(e: FormEvent) { e.preventDefault(); const parsed = prepSchema.safeParse(value); if (!parsed.success) return notify(parsed.error.issues[0].message); if (await save({ ...state, prep: existing ? state.prep.map(s => s.id === value.id ? parsed.data : s) : [...state.prep, parsed.data] })) close() }
  return <FormDialog title={existing ? 'Edit prep task' : 'Add prep task'} description="Assign a station, quantity, and due date so the team knows what to prepare." close={close} busy={busy}><form onSubmit={submit}><fieldset disabled={busy}><div className="form-grid">
    <Field label="Task" wide><input required autoFocus maxLength={120} placeholder="e.g. Make hollandaise" value={value.name} onChange={e => change('name', e.target.value)}/></Field>
    <Field label="Station"><input maxLength={300} list="prep-stations" value={value.station} onChange={e => change('station', e.target.value)}/><datalist id="prep-stations">{['Hot line','Cold prep','Pastry','Dish / prep'].map(s => <option key={s} value={s}/>)}</datalist></Field>
    <Field label="Assigned to"><input maxLength={300} placeholder="Team member" value={value.assignee} onChange={e => change('assignee', e.target.value)}/></Field>
    <Field label="Quantity / yield"><input maxLength={300} placeholder="e.g. 20 portions or 1 batch" value={value.quantity} onChange={e => change('quantity', e.target.value)}/></Field>
    <Field label="Due date (Montréal)"><input required type="date" value={value.due ?? ''} onChange={e => change('due', e.target.value)}/></Field>
    <Field label="Priority"><select value={value.priority} onChange={e => change('priority', e.target.value)}><option value="normal">Normal</option><option value="high">High priority</option></select></Field>
    <Field label="Status"><select value={value.status} onChange={e => change('status', e.target.value)}><option value="todo">To prepare</option><option value="doing">In progress</option><option value="done">Ready</option></select></Field>
  </div></fieldset><Footer busy={busy} close={close}/></form></FormDialog>
}

export function WasteEditor(props: EditorProps) {
  const { state, busy, close, save, notify } = props
  const [ingredientId, setIngredientId] = useState(state.ingredients[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('Spoilage')
  const [date, setDate] = useState(kitchenDay())
  const ingredient = state.ingredients.find(i => i.id === ingredientId)
  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      const next = logWaste(state, { id: crypto.randomUUID(), ingredientId, quantity: Number(amount), unit: ingredient!.baseUnit, reason, date })
      if (await save(next)) close()
    } catch (error) { notify(error instanceof Error ? error.message : 'Check the waste quantity.') }
  }
  return <FormDialog title="Record waste" description="This reduces available stock and records the cost at today's ingredient price." close={close} busy={busy}><form onSubmit={submit}><fieldset disabled={busy}><div className="form-grid">
    <Field label="Ingredient" wide><select required value={ingredientId} onChange={e => { setIngredientId(e.target.value); setAmount('') }}><option value="" disabled>Select an ingredient</option>{state.ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
    <Field label={`Quantity wasted (${ingredient?.baseUnit ?? 'units'})`} hint={`Available: ${quantity(ingredient?.stock ?? null, ingredient?.baseUnit)}`}><input required type="number" min="0.000001" step="any" max={ingredient?.stock ?? 0} value={amount} onChange={e => setAmount(e.target.value)}/></Field>
    <Field label="Date (Montréal)"><input required type="date" max={kitchenDay()} value={date} onChange={e => setDate(e.target.value)}/></Field>
    <Field label="Reason" wide><select value={reason} onChange={e => setReason(e.target.value)}>{['Spoilage','Overproduction','Prep / trimming loss','Dropped / damaged','Returned dish','Other'].map(r => <option key={r}>{r}</option>)}</select></Field>
  </div><div className="inline-note"><Info size={16}/>Record only loss beyond the trimming already included in your usable yield.</div></fieldset><Footer busy={busy} close={close} label="Record waste"/></form></FormDialog>
}
