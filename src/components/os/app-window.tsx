'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface WindowState {
  id: string
  title: string
  icon: React.ReactNode
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  zIndex: number
  component: React.ReactNode
}

interface AppWindowProps {
  window: WindowState
  onClose: (id: string) => void
  onMinimize: (id: string) => void
  onMaximize: (id: string) => void
  onFocus: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, w: number, h: number) => void
}

export default function AppWindow({
  window: win,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onMove,
  onResize,
}: AppWindowProps) {
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-window-controls]')) return
      e.preventDefault()
      onFocus(win.id)
      setDragging(true)
      dragOffset.current = { x: e.clientX - win.x, y: e.clientY - win.y }
    },
    [win.id, win.x, win.y, onFocus]
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onFocus(win.id)
      setResizing(true)
      resizeStart.current = { x: e.clientX, y: e.clientY, w: win.width, h: win.height }
    },
    [win.id, win.width, win.height, onFocus]
  )

  useEffect(() => {
    if (!dragging && !resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        onMove(win.id, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y)
      }
      if (resizing) {
        const newW = Math.max(400, resizeStart.current.w + (e.clientX - resizeStart.current.x))
        const newH = Math.max(300, resizeStart.current.h + (e.clientY - resizeStart.current.y))
        onResize(win.id, newW, newH)
      }
    }

    const handleMouseUp = () => {
      setDragging(false)
      setResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, resizing, win.id, onMove, onResize])

  if (win.minimized) return null

  const isMaximized = win.maximized
  const style: React.CSSProperties = isMaximized
    ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: '48px', zIndex: win.zIndex }
    : {
        position: 'absolute',
        top: win.y,
        left: win.x,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        flexDirection: 'column',
        background: '#141414',
        border: '1px solid #262420',
        borderRadius: isMaximized ? 0 : '12px',
        overflow: 'hidden',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,${win.zIndex > 100 ? '0.15' : '0.05'})`,
        transition: dragging || resizing ? 'none' : 'box-shadow 0.2s',
      }}
      onMouseDown={() => onFocus(win.id)}
    >
      {/* Title bar */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={() => onMaximize(win.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '36px',
          padding: '0 12px',
          background: '#1A1A18',
          borderBottom: '1px solid #262420',
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {win.icon}
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#F5F0E8',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {win.title}
          </span>
        </div>

        <div data-window-controls style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { action: () => onMinimize(win.id), color: '#C9A84C', label: '−' },
            { action: () => onMaximize(win.id), color: '#8A8478', label: isMaximized ? '⧉' : '□' },
            { action: () => onClose(win.id), color: '#BF3B3B', label: '×' },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.06)',
                color: btn.color,
                fontSize: '13px',
                lineHeight: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>{win.component}</div>

      {/* Resize handle */}
      {!isMaximized && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 16,
            height: 16,
            cursor: 'nwse-resize',
          }}
        />
      )}
    </div>
  )
}
