import { escapeCsv, ingredientSchema, type Workspace } from './domain'

export function csv(rows: unknown[][]): string { return '\uFEFF' + rows.map(row => row.map(escapeCsv).join(',')).join('\r\n') }
export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function parseCsv(input: string): string[][] {
  const source = input.replace(/^\uFEFF/, '')
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false
  for (let n = 0; n < source.length; n++) {
    const char = source[n]
    if (char === '"') {
      if (quoted && source[n + 1] === '"') { field += '"'; n++ }
      else if (quoted || field === '') quoted = !quoted
      else throw new Error('Invalid CSV quoting.')
    } else if (char === ',' && !quoted) { row.push(field); field = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[n + 1] === '\n') n++
      row.push(field); if (row.some(v => v.trim())) rows.push(row); row = []; field = ''
    } else field += char
  }
  if (quoted) throw new Error('The CSV contains an unclosed quote.')
  row.push(field); if (row.some(v => v.trim())) rows.push(row)
  return rows
}
export const inventoryHeaders = ['name','category','purchase_pack','base_unit','pack_quantity','pack_price_cad','usable_yield_pct','stock','par','supplier','notes']
export function inventoryCsv(state: Workspace): string {
  return csv([inventoryHeaders, ...state.ingredients.map(i => [i.name,i.category,i.purchaseLabel,i.baseUnit,i.packQuantity,i.price,i.yieldPct,i.stock,i.par,state.suppliers.find(s => s.id === i.supplierId)?.name ?? '',i.notes])])
}
export function importInventory(source: string, state: Workspace, newId = () => crypto.randomUUID()): Workspace {
  const [headers, ...rows] = parseCsv(source)
  if (!headers || !rows.length) throw new Error('The CSV has no ingredient rows.')
  if (rows.length > 500) throw new Error('Import at most 500 ingredients at a time.')
  const normal = headers.map(h => h.trim().toLowerCase())
  for (const required of ['name','base_unit','pack_quantity','pack_price_cad']) if (!normal.includes(required)) throw new Error(`Missing column: ${required}. Download the CSV template first.`)
  if (new Set(normal).size !== normal.length) throw new Error('The CSV contains duplicate column names.')
  const ingredients = [...state.ingredients]
  const seen = new Set<string>()
  for (const [index, cells] of rows.entries()) {
    if (cells.length !== headers.length) throw new Error(`Row ${index + 2}: column count does not match the header.`)
    const get = (key: string) => cells[normal.indexOf(key)]?.trim() ?? ''
    const num = (key: string) => get(key) === '' ? null : Number(get(key))
    const title = get('name').toLowerCase()
    if (seen.has(title)) throw new Error(`Duplicate ingredient in CSV: ${get('name')}`)
    seen.add(title)
    const existingIndex = ingredients.findIndex(i => i.name.toLowerCase() === title)
    const existing = ingredients[existingIndex]
    const supplierName = get('supplier')
    const supplier = state.suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase())
    if (supplierName && !supplier) throw new Error(`Row ${index + 2}: add supplier "${supplierName}" before importing.`)
    if (existing && existing.baseUnit !== get('base_unit')) throw new Error(`Row ${index + 2}: the base unit for ${existing.name} cannot change during import.`)
    const result = ingredientSchema.safeParse({ id: existing?.id ?? newId(), name: get('name'), category: get('category') || 'Other', supplierId: supplier?.id ?? null, purchaseLabel: get('purchase_pack'), baseUnit: get('base_unit'), packQuantity: num('pack_quantity'), price: num('pack_price_cad'), yieldPct: num('usable_yield_pct') ?? 100, stock: num('stock'), par: num('par'), notes: get('notes') })
    if (!result.success) throw new Error(`Row ${index + 2}: ${result.error.issues[0].path.join('.')} — ${result.error.issues[0].message}`)
    if (existingIndex >= 0) ingredients[existingIndex] = result.data
    else ingredients.push(result.data)
  }
  return { ...state, ingredients }
}
