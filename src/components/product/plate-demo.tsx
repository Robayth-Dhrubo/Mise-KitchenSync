'use client'
import { useState } from 'react'
import { ArrowRight,SlidersHorizontal } from 'lucide-react'
export default function PlateDemo(){
  const [cost,setCost]=useState<number|null>(6.4),[price,setPrice]=useState<number|null>(22)
  const validCost=cost!==null&&Number.isFinite(cost)&&cost>=0
  const validPrice=price!==null&&Number.isFinite(price)&&price>0
  return <div className="plate-demo"><div className="plate-demo-heading"><span><SlidersHorizontal size={18}/>Try a plate-cost scenario</span><small>Illustrative values · CAD</small></div><div className="plate-demo-fields"><label><span>Ingredient cost / portion</span><div><small>$</small><input aria-label="Ingredient cost per portion" type="number" min={0} max={9999} step="0.1" value={cost??''} onChange={e=>setCost(e.target.value===''?null:Number(e.target.value))}/></div></label><label><span>Selling price before tax</span><div><small>$</small><input aria-label="Selling price before tax" type="number" min={0.01} max={9999} step="0.01" value={price??''} onChange={e=>setPrice(e.target.value===''?null:Number(e.target.value))}/></div></label></div><div className="plate-demo-results"><div><small>Food cost</small><strong>{validCost&&validPrice?`${(cost!/price!*100).toFixed(1)}%`:'—'}</strong></div><div><small>Contribution / plate</small><strong>{validCost&&validPrice?`$${(price!-cost!).toFixed(2)}`:'—'}</strong></div><div><small>Price at a 30% target</small><strong>{validCost?`$${(cost!/.3).toFixed(2)}`:'—'}</strong></div></div><p>{!validCost||!validPrice?'Enter a nonnegative portion cost and a selling price above zero.':'Contribution is before labour, overhead and taxes. The full app costs each ingredient and batch yield.'}</p><a href="/demo?view=recipes">Try a complete recipe<ArrowRight size={15}/></a></div>
}
