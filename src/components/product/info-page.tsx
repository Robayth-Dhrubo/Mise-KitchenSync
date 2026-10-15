import type { ReactNode } from 'react'
import { ArrowLeft,ArrowUpRight,ChefHat } from 'lucide-react'
import '@/app/product/product.css'
import './info-page.css'
export default function InfoPage({eyebrow,title,intro,children}:{eyebrow:string;title:string;intro:string;children:ReactNode}){
  return <div className="mise-product info-page"><header className="product-nav"><a href="/product" className="product-logo"><span><ChefHat size={22}/></span>mise<b>.</b></a><a href="/" className="product-nav-button">Open workspace<ArrowUpRight size={14}/></a></header><main className="info-main"><a href="/product" className="info-back"><ArrowLeft size={14}/>About Mise</a><span className="product-eyebrow">{eyebrow}</span><h1>{title}</h1><p className="info-intro">{intro}</p><div className="info-content">{children}</div></main><footer className="product-footer"><a href="/product" className="product-logo">mise<b>.</b></a><nav><a href="/help">Help</a><a href="/privacy">Data notice</a><a href="/terms">Pilot terms</a></nav></footer></div>
}
