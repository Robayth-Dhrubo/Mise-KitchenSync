export const measureUnits = ['g', 'kg', 'mg', 'oz', 'lb', 'ml', 'L', 'fl_oz_us', 'fl_oz_imp', 'gal_us', 'gal_imp', 'qt_us', 'pt_us', 'tsp_us', 'tbsp_us', 'each', 'pack'] as const
export type MeasureUnit = typeof measureUnits[number]
export type BaseUnit = 'g' | 'ml' | 'each'
type Dimension = 'weight' | 'volume' | 'count'
const definitions: Record<Exclude<MeasureUnit, 'pack'>, { dimension: Dimension; factor: number; label: string }> = {
  g: { dimension: 'weight', factor: 1, label: 'g' }, kg: { dimension: 'weight', factor: 1000, label: 'kg' }, mg: { dimension: 'weight', factor: .001, label: 'mg' },
  oz: { dimension: 'weight', factor: 28.349523125, label: 'oz (weight)' }, lb: { dimension: 'weight', factor: 453.59237, label: 'lb' },
  ml: { dimension: 'volume', factor: 1, label: 'ml' }, L: { dimension: 'volume', factor: 1000, label: 'L' },
  fl_oz_us: { dimension: 'volume', factor: 29.5735295625, label: 'US fl oz' }, fl_oz_imp: { dimension: 'volume', factor: 28.4130625, label: 'Imperial fl oz' },
  gal_us: { dimension: 'volume', factor: 3785.411784, label: 'US gallon' }, gal_imp: { dimension: 'volume', factor: 4546.09, label: 'Imperial gallon' },
  qt_us: { dimension: 'volume', factor: 946.352946, label: 'US quart' }, pt_us: { dimension: 'volume', factor: 473.176473, label: 'US pint' },
  tsp_us: { dimension: 'volume', factor: 4.92892159375, label: 'US teaspoon' }, tbsp_us: { dimension: 'volume', factor: 14.78676478125, label: 'US tablespoon' },
  each: { dimension: 'count', factor: 1, label: 'pieces' },
}
export function unitLabel(unit: string): string { return unit === 'pack' ? 'purchase packs (usable contents)' : definitions[unit as Exclude<MeasureUnit, 'pack'>]?.label ?? unit }
export function convertMeasure(value: number, from: string, to: string, densityGPerMl?: number | null): number | null {
  if (!Number.isFinite(value)) return null
  const source = definitions[from as Exclude<MeasureUnit, 'pack'>], target = definitions[to as Exclude<MeasureUnit, 'pack'>]
  if (!source || !target) return null
  if (source.dimension === target.dimension) return value * source.factor / target.factor
  if (!densityGPerMl || !Number.isFinite(densityGPerMl) || densityGPerMl <= 0 || source.dimension === 'count' || target.dimension === 'count') return null
  const base = value * source.factor
  return source.dimension === 'volume' ? base * densityGPerMl / target.factor : base / densityGPerMl / target.factor
}
export function ingredientQuantity(value: number, from: string, ingredient: { baseUnit: BaseUnit; packQuantity: number | null; yieldPct: number; densityGPerMl?: number | null }): number | null {
  if (!Number.isFinite(value)) return null
  if (from !== 'pack') return convertMeasure(value, from, ingredient.baseUnit, ingredient.densityGPerMl)
  return ingredient.packQuantity !== null && ingredient.packQuantity > 0 && ingredient.yieldPct > 0 ? value * ingredient.packQuantity * ingredient.yieldPct / 100 : null
}
export function purchaseUnits(base: BaseUnit): MeasureUnit[] { return measureUnits.filter(unit => unit !== 'pack' && convertMeasure(1, unit, base) !== null) }
