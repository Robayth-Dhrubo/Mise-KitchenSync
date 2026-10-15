'use client'

import { useEffect, type ReactNode } from 'react'
import { ArrowRight, BookOpen, Info } from 'lucide-react'

export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const navigate = (event: Event) => { if (!window.confirm('Leave this page and discard its unsaved changes?')) event.preventDefault() }
    window.addEventListener('beforeunload', unload)
    window.addEventListener('mise-before-navigate', navigate)
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('mise-before-navigate', navigate) }
  }, [dirty])
}
export function OperationStat({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="operation-stat"><span>{label}</span><strong>{value}</strong><p>{note}</p></article>
}
export function OperationEmpty({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="panel operation-empty"><span>{icon}</span><h2>{title}</h2><p>{children}</p>{action}</section>
}
export function OperationNote({ children }: { children: ReactNode }) { return <div className="operation-note"><Info size={17}/><p>{children}</p></div> }
export function HelpLink({ title, onClick }: { title: string; onClick: () => void }) { return <button type="button" className="operation-help" onClick={onClick}><BookOpen size={16}/><span>{title}</span><ArrowRight size={14}/></button> }
