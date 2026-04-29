'use client'

import React, { useState, useEffect, useRef } from 'react'

import {
  LayoutDashboard, CreditCard, Package, ChefHat, BookOpen, TrendingUp, 
  ShoppingCart, FileScan, Map, Link2, Globe, Sparkles, PenLine, 
  CalendarDays, Calculator, Settings
} from 'lucide-react'

// App registry — maps each app to its icon, title, category, and content
export interface AppDefinition {
  id: string
  title: string
  icon: React.ReactNode
  category: 'operations' | 'productivity' | 'system'
  defaultWidth: number
  defaultHeight: number
  allowedRoles?: ('admin' | 'owner' | 'chef' | 'foh')[] // Gated permissions
  component: () => React.ReactNode
}

// Placeholder app content — wraps existing routes in an iframe or renders inline
function IframeApp({ src }: { src: string }) {
  // Append os_iframe=true so middleware can distinguish these from naked window routes
  const embedSrc = src.includes('?') ? `${src}&os_iframe=true` : `${src}?os_iframe=true`
  return (
    <iframe
      src={embedSrc}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'transparent',
      }}
      title="app"
    />
  )
}

function SimpleApp({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        background: 'transparent',
        color: '#F5F0E8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'auto',
      }}
    >
      {children}
    </div>
  )
}

// Built-in browser
function BrowserApp() {
  const [url, setUrl] = useState('https://en.wikipedia.org/wiki/Main_Page')
  const [inputUrl, setInputUrl] = useState('https://en.wikipedia.org/wiki/Main_Page')

  const handleNav = (e: React.FormEvent) => {
    e.preventDefault()
    let finalUrl = inputUrl
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }
    setUrl(finalUrl)
    setInputUrl(finalUrl)
  }

  return (
    <SimpleApp>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <form
          onSubmit={handleNav}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(26,26,24,0.6)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#F5F0E8',
              outline: 'none'
            }}
          />
        </form>
        <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
          <iframe
            src={url}
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
            title="Browser"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </SimpleApp>
  )
}

// Calculator
function CalculatorApp() {
  const [display, setDisplay] = useState('0')
  const [equation, setEquation] = useState('')
  const [operand, setOperand] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waitingForNewValue, setWaitingForNewValue] = useState(false)

  const handleNum = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num)
      setWaitingForNewValue(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }

  const handleOp = (op: string) => {
    const inputValue = parseFloat(display)
    if (operand === null) {
      setOperand(inputValue)
      setEquation(`${inputValue} ${op}`)
    } else if (operator && !waitingForNewValue) {
      let res = inputValue
      if (operator === '+') res = operand + inputValue
      else if (operator === '-') res = operand - inputValue
      else if (operator === '×') res = operand * inputValue
      else if (operator === '÷') res = operand / inputValue
      setOperand(res)
      setDisplay(String(res))
      setEquation(`${res} ${op}`)
    } else {
      setEquation(`${operand} ${op}`)
    }
    setOperator(op)
    setWaitingForNewValue(true)
  }

  const handleEqual = () => {
    if (!operator || operand === null) return
    const inputValue = parseFloat(display)
    let res = inputValue
    if (operator === '+') res = operand + inputValue
    else if (operator === '-') res = operand - inputValue
    else if (operator === '×') res = operand * inputValue
    else if (operator === '÷') res = operand / inputValue
    
    setDisplay(String(res))
    setEquation('')
    setOperand(null)
    setOperator(null)
    setWaitingForNewValue(true)
  }

  const handleAction = (act: string) => {
    if (act === 'C') {
      setDisplay('0')
      setOperand(null)
      setOperator(null)
      setEquation('')
      setWaitingForNewValue(false)
    } else if (act === '±') {
      setDisplay(String(parseFloat(display) * -1))
    } else if (act === '%') {
      setDisplay(String(parseFloat(display) / 100))
    } else if (act === '.') {
      if (!display.includes('.')) setDisplay(display + '.')
    }
  }

  return (
    <SimpleApp>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', justifyContent: 'flex-end' }}>
        <div
          style={{
            background: 'rgba(26,26,24,0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'right',
            color: '#F5F0E8',
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ fontSize: '14px', color: '#8A8478', minHeight: '20px' }}>{equation}</div>
          <div style={{ fontSize: '32px', fontFamily: 'ui-monospace, monospace' }}>{display}</div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          {['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map(
            (key, i) => (
              <button
                key={i}
                onClick={() => {
                  if (['÷', '×', '-', '+'].includes(key)) handleOp(key)
                  else if (key === '=') handleEqual()
                  else if (['C', '±', '%', '.'].includes(key)) handleAction(key)
                  else handleNum(key)
                }}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background:
                    ['÷', '×', '-', '+', '='].includes(key)
                      ? 'rgba(201, 168, 76, 0.9)'
                      : ['C', '±', '%'].includes(key)
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(255,255,255,0.05)',
                  color: ['÷', '×', '-', '+', '='].includes(key) ? '#0A0A0A' : '#F5F0E8',
                  fontSize: '18px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'system-ui',
                  gridColumn: key === '0' ? 'span 2' : 'span 1'
                }}
              >
                {key}
              </button>
            )
          )}
        </div>
      </div>
    </SimpleApp>
  )
}

// Notes
function NotesApp() {
  const [note, setNote] = useState('')
  const [title, setTitle] = useState('Untitled Note')

  useEffect(() => {
    const savedNote = localStorage.getItem('mise_os_note')
    const savedTitle = localStorage.getItem('mise_os_note_title')
    if (savedNote) setNote(savedNote)
    if (savedTitle) setTitle(savedTitle)
  }, [])

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value)
    localStorage.setItem('mise_os_note', e.target.value)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    localStorage.setItem('mise_os_note_title', e.target.value)
  }

  return (
    <SimpleApp>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(26,26,24,0.6)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <input 
            value={title}
            onChange={handleTitleChange}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#C9A84C',
              fontSize: '14px',
              fontWeight: 600,
              outline: 'none',
              width: '100%'
            }}
          />
        </div>
        <textarea
          value={note}
          onChange={handleNoteChange}
          placeholder="Start typing..."
          style={{
            flex: 1,
            padding: '16px',
            background: 'transparent',
            border: 'none',
            color: '#F5F0E8',
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            resize: 'none',
            outline: 'none',
            lineHeight: 1.7,
          }}
        />
      </div>
    </SimpleApp>
  )
}

// AI Assistant
function AIAssistantApp() {
  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string}[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const newMsgs = [...messages, { role: 'user' as const, text: input }]
    setMessages(newMsgs)
    setInput('')
    
    // Simulate AI response
    setTimeout(() => {
      const lower = input.toLowerCase()
      let response = "I'm your Mise AI assistant. How can I help optimize your kitchen today?"
      
      if (lower.includes('cost') || lower.includes('margin')) {
        response = "Based on recent inventory data, your food costs have risen 2.4% this week. I recommend reviewing your salmon and avocado supplier prices."
      } else if (lower.includes('recipe')) {
        response = "I can help you scale recipes or substitute ingredients. For instance, swapping your current butter for clarified butter could improve the yield of your Hollandaise."
      } else if (lower.includes('inventory') || lower.includes('stock')) {
        response = "You are currently running low on: Olive Oil, Saffron, and White Onions. Should I prepare a draft purchase order for your preferred vendors?"
      } else if (lower.includes('schedule') || lower.includes('staff')) {
        response = "Based on historical sales data, you may be overstaffed by 1 prep cook for tomorrow's lunch service."
      }

      setMessages([...newMsgs, { role: 'assistant', text: response }])
    }, 800)
  }

  return (
    <SimpleApp>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            flex: 1,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto'
          }}
        >
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{ fontSize: '48px' }}>🤖</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#F5F0E8' }}>Mise AI</div>
              <div style={{ fontSize: '12px', color: '#8A8478', textAlign: 'center', maxWidth: 300 }}>
                Recipe suggestions, cost optimization, menu development. Ask anything about your kitchen operations.
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#C9A84C' : 'rgba(255,255,255,0.1)',
                color: msg.role === 'user' ? '#0A0A0A' : '#F5F0E8',
                padding: '10px 14px',
                borderRadius: '12px',
                maxWidth: '80%',
                fontSize: '13px',
                lineHeight: 1.5
              }}>
                {msg.role === 'assistant' && <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '4px', fontWeight: 'bold' }}>Mise AI</div>}
                {msg.text}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px',
            background: 'rgba(26,26,24,0.6)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Mise AI..."
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#F5F0E8',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'system-ui',
            }}
          />
          <button
            onClick={handleSend}
            style={{
              padding: '10px 16px',
              background: '#C9A84C',
              color: '#0A0A0A',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </SimpleApp>
  )
}

export const APP_REGISTRY: AppDefinition[] = [
  // Operations
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <LayoutDashboard className="w-full h-full text-[#C9A84C]" />,
    category: 'operations',
    defaultWidth: 1000,
    defaultHeight: 700,
    allowedRoles: ['admin', 'owner', 'chef', 'foh'],
    component: () => <IframeApp src="/dashboard" />,
  },
  {
    id: 'pos',
    title: 'POS Terminal',
    icon: <CreditCard className="w-full h-full text-blue-400" />,
    category: 'operations',
    defaultWidth: 1100,
    defaultHeight: 750,
    allowedRoles: ['admin', 'owner', 'foh'],
    component: () => <IframeApp src="/pos/terminal" />,
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: <Package className="w-full h-full text-orange-400" />,
    category: 'operations',
    defaultWidth: 900,
    defaultHeight: 650,
    allowedRoles: ['admin', 'owner', 'chef', 'foh'],
    component: () => <IframeApp src="/inventory" />,
  },
  {
    id: 'kitchen',
    title: 'Kitchen Display',
    icon: <ChefHat className="w-full h-full text-red-500" />,
    category: 'operations',
    defaultWidth: 1000,
    defaultHeight: 700,
    allowedRoles: ['admin', 'owner', 'chef'],
    component: () => <IframeApp src="/kitchen-manager" />,
  },
  {
    id: 'recipes',
    title: 'Recipes & Menu',
    icon: <BookOpen className="w-full h-full text-purple-400" />,
    category: 'operations',
    defaultWidth: 900,
    defaultHeight: 650,
    allowedRoles: ['admin', 'owner', 'chef'],
    component: () => <IframeApp src="/recipes" />,
  },
  {
    id: 'finance',
    title: 'Margin Guard',
    icon: <TrendingUp className="w-full h-full text-green-500" />,
    category: 'operations',
    defaultWidth: 900,
    defaultHeight: 650,
    allowedRoles: ['admin', 'owner'],
    component: () => <IframeApp src="/finance" />,
  },
  {
    id: 'smart-order',
    title: 'Smart Order',
    icon: <ShoppingCart className="w-full h-full text-amber-500" />,
    category: 'operations',
    defaultWidth: 900,
    defaultHeight: 650,
    allowedRoles: ['admin', 'owner', 'chef'],
    component: () => <IframeApp src="/smart-order" />,
  },
  {
    id: 'scanner',
    title: 'Invoice Scanner',
    icon: <FileScan className="w-full h-full text-indigo-400" />,
    category: 'operations',
    defaultWidth: 800,
    defaultHeight: 600,
    allowedRoles: ['admin', 'owner', 'chef'],
    component: () => <IframeApp src="/inventory/scanner" />,
  },
  {
    id: 'floor-map',
    title: 'Floor Map',
    icon: <Map className="w-full h-full text-emerald-400" />,
    category: 'operations',
    defaultWidth: 1100,
    defaultHeight: 750,
    allowedRoles: ['admin', 'owner', 'foh'],
    component: () => <IframeApp src="/floor-map" />,
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: <Link2 className="w-full h-full text-gray-400" />,
    category: 'operations',
    defaultWidth: 900,
    defaultHeight: 650,
    allowedRoles: ['admin', 'owner'],
    component: () => <IframeApp src="/integrations" />,
  },

  // Productivity
  {
    id: 'browser',
    title: 'Web Browser',
    icon: <Globe className="w-full h-full text-sky-400" />,
    category: 'productivity',
    defaultWidth: 1000,
    defaultHeight: 700,
    allowedRoles: ['admin', 'owner', 'chef', 'foh'],
    component: () => <BrowserApp />,
  },
  {
    id: 'ai',
    title: 'Mise AI',
    icon: <Sparkles className="w-full h-full text-yellow-400" />,
    category: 'productivity',
    defaultWidth: 500,
    defaultHeight: 600,
    allowedRoles: ['admin', 'owner', 'chef', 'foh'],
    component: () => <AIAssistantApp />,
  },
  {
    id: 'notes',
    title: 'Notes',
    icon: <PenLine className="w-full h-full text-yellow-200" />,
    category: 'productivity',
    defaultWidth: 500,
    defaultHeight: 500,
    allowedRoles: ['admin', 'owner', 'chef', 'foh'],
    component: () => <NotesApp />,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    icon: <CalendarDays className="w-full h-full text-red-400" />,
    category: 'productivity',
    defaultWidth: 800,
    defaultHeight: 600,
    allowedRoles: ['admin', 'owner', 'chef', 'foh'],
    component: () => <IframeApp src="/weekly-schedule" />,
  },

  // System
  {
    id: 'calculator',
    title: 'Calculator',
    icon: <Calculator className="w-full h-full text-slate-300" />,
    category: 'system',
    defaultWidth: 320,
    defaultHeight: 480,
    allowedRoles: ['admin', 'owner', 'chef', 'foh'],
    component: () => <CalculatorApp />,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: <Settings className="w-full h-full text-zinc-400" />,
    category: 'system',
    defaultWidth: 800,
    defaultHeight: 600,
    allowedRoles: ['admin', 'owner'],
    component: () => <IframeApp src="/settings" />,
  },
]

export function getApp(id: string): AppDefinition | undefined {
  return APP_REGISTRY.find(app => app.id === id)
}
