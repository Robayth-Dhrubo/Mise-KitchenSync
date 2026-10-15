'use client'

import { useState, useSyncExternalStore } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronRight, Compass, Search, ShieldCheck } from 'lucide-react'
import { guides, type Guide } from '@/lib/workspace/guides'
import { setupSteps } from '@/lib/workspace/readiness'
import { type Workspace } from '@/lib/workspace/domain'
import { FormDialog } from './editors'

export function GuideArticle({ guide }: { guide: Guide }) {
  return <article className="guide-article"><span className="guide-category">{guide.category}</span><h2>{guide.title}</h2><p className="guide-summary">{guide.summary}</p><ol>{guide.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>{guide.terms && <dl className="guide-definitions">{guide.terms.map(term => <div key={term.name}><dt>{term.name}</dt><dd>{term.meaning}</dd></div>)}</dl>}</article>
}
export function GuideDialog({ guide, close }: { guide: Guide; close: () => void }) { return <FormDialog title="Kitchen guide" description="A practical explanation for this workflow." busy={false} close={close}><GuideArticle guide={guide}/><div className="form-footer"><a className="text-button" href={`/help#${guide.id}`} target="_blank" rel="noreferrer">Open the full guide<ArrowUpRight size={14}/></a><button className="button primary" onClick={close}>Back to my work<ArrowRight size={15}/></button></div></FormDialog> }

function subscribeHash(listener: () => void) { window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener) }

export function HelpCentre({ navigate }: { navigate?: (view: string) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All guides')
  const [selected, setSelected] = useState<Guide | null>(null)
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => '')
  const [ignoredHash, setIgnoredHash] = useState('')
  const visibleGuide = selected ?? (hash !== ignoredHash ? guides.find(guide => guide.id === hash) : null)
  const categories = ['All guides', ...new Set(guides.map(guide => guide.category))]
  const matches = guides.filter(guide => (category === 'All guides' || guide.category === category) && `${guide.title} ${guide.summary} ${guide.steps.join(' ')} ${guide.terms?.map(term => `${term.name} ${term.meaning}`).join(' ') ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="help-centre"><section className="operation-hero"><div><span className="eyebrow">A LITTLE GUIDANCE GOES A LONG WAY</span><h2>Know what to do next.</h2><p>Short guides, clear definitions and the calculations behind your numbers.</p></div><BookOpen size={42} strokeWidth={1.4}/></section><div className="help-search-row"><label className="search-box"><Search size={17}/><span className="sr-only">Search kitchen guides</span><input type="search" value={query} placeholder="Find help with costs, shifts, imports…" onChange={event => setQuery(event.target.value)}/></label><label className="operation-select"><span className="sr-only">Guide category</span><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(value => <option key={value}>{value}</option>)}</select></label></div><div className="guide-card-grid">{matches.map(guide => <article className="panel guide-card" id={guide.id} key={guide.id}><span>{guide.category}</span><h3>{guide.title}</h3><p>{guide.summary}</p><div><button className="text-button" onClick={() => setSelected(guide)}>Read guide<ArrowRight size={14}/></button>{navigate && <button className="icon-button" aria-label={`Open workspace for ${guide.title}`} onClick={() => navigate(guide.view)}><ArrowUpRight size={16}/></button>}</div></article>)}</div>{!matches.length && <div className="panel operation-empty"><Search size={28}/><h3>No guides found</h3><p>Try a term such as pack, payroll, contribution or backup.</p><button className="text-button" onClick={() => { setQuery(''); setCategory('All guides') }}>Show all guides</button></div>}<section className="panel help-access-note"><ShieldCheck size={23}/><div><h3>Need help with your account?</h3><p>Contact the operator who provided your private workspace. Staff planning, shared account access and subscription billing are separate things.</p><a className="text-button" href="/privacy">Read the data notice<ArrowUpRight size={13}/></a></div></section>{visibleGuide && <GuideDialog guide={visibleGuide} close={() => { setSelected(null); setIgnoredHash(hash) }}/>}</div>
}

export function GettingStarted({ state, navigate, help }: { state: Workspace; navigate: (view: string) => void; help: (guide: Guide) => void }) {
  const steps = setupSteps(state)
  const complete = steps.filter(step => step.done).length
  const next = steps.find(step => !step.done)
  return <div className="operation-page"><section className="start-hero"><div><span className="eyebrow">SET UP ONCE. BUILD A DAILY HABIT.</span><h2>A kitchen system that makes sense.</h2><p>Start with one supplier and one dish. Build the rest as your records become reliable.</p><button className="button primary" onClick={() => next ? navigate(next.view) : navigate('overview')}>{next ? `Next: ${next.title}` : 'Open my daily overview'}<ArrowRight size={16}/></button></div><div className="setup-progress-ring" style={{ '--progress': `${complete / steps.length * 100}%` } as React.CSSProperties}><div><strong>{complete}<small> / {steps.length}</small></strong><span>essentials ready</span></div></div></section>
    <div className="journey-list">{steps.map((step, index) => <section className={`panel journey-step ${step.done ? 'done' : ''}`} key={step.id}><span className="journey-number">{step.done ? <Check size={18}/> : String(index + 1).padStart(2, '0')}</span><div><span className="journey-status">{step.done ? 'Inputs present' : next?.id === step.id ? 'Recommended next step' : 'To set up'}</span><h3>{step.title}</h3><p>{step.detail}</p></div><button className="button secondary" onClick={() => navigate(step.view)}>{step.done ? 'Review' : 'Set up'}<ChevronRight size={15}/></button></section>)}</div>
    <div className="operations-two-column"><section className="panel getting-started-guide"><Compass size={25}/><h3>Your first week</h3><p>A short walkthrough from purchase packs to the next service.</p><button className="text-button" onClick={() => help(guides.find(guide => guide.id === 'start')!)}>Read the getting-started guide<ArrowRight size={14}/></button></section><section className="panel getting-started-guide"><CheckCircle2 size={25}/><h3>What “ready” means</h3><p>Setup progress checks whether the required inputs are present. Confirm the records against your kitchen before relying on them.</p><button className="text-button" onClick={() => help(guides.find(guide => guide.id === 'access')!)}>See what this release includes<ArrowRight size={14}/></button></section></div></div>
}

export function QuickFind({ views, navigate, openGuide, close }: { views: { id: string; label: string; description: string }[]; navigate: (view: string) => void; openGuide: (guide: Guide) => void; close: () => void }) {
  const [query, setQuery] = useState('')
  const value = query.trim().toLowerCase()
  const pages = views.filter(view => `${view.label} ${view.description}`.toLowerCase().includes(value))
  const articles = guides.filter(guide => `${guide.title} ${guide.summary}`.toLowerCase().includes(value)).slice(0, 5)
  return <FormDialog title="Find your way around Mise" description="Jump to a workspace or open a practical guide." busy={false} close={close}><label className="quick-find-input"><Search size={19}/><span className="sr-only">Find pages and guides</span><input autoFocus type="search" placeholder="Try schedule, recipe or contribution…" value={query} onChange={event => setQuery(event.target.value)}/></label><div className="quick-find-results"><h3>Workspace</h3>{pages.map(view => <button key={view.id} onClick={() => { close(); navigate(view.id) }}><span><strong>{view.label}</strong><small>{view.description}</small></span><ArrowRight size={16}/></button>)}{!pages.length && <p>No matching workspaces.</p>}<h3>Guides</h3>{articles.map(guide => <button key={guide.id} onClick={() => { close(); openGuide(guide) }}><BookOpen size={17}/><span><strong>{guide.title}</strong><small>{guide.category}</small></span><ArrowUpRight size={15}/></button>)}{!articles.length && <p>No matching guides.</p>}</div></FormDialog>
}
