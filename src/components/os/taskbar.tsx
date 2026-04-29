'use client'

import { useState, useEffect } from 'react'

interface TaskbarProps {
  openWindows: Array<{ id: string; title: string; icon: React.ReactNode; minimized: boolean }>
  onWindowClick: (id: string) => void
  onStartClick: () => void
  startOpen: boolean
  userName: string
  onLock: () => void
}

export default function Taskbar({
  openWindows,
  onWindowClick,
  onStartClick,
  startOpen,
  userName,
  onLock,
}: TaskbarProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        height: '52px',
        background: 'rgba(15, 15, 12, 0.45)',
        backdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        zIndex: 10000,
        gap: '6px',
      }}
    >
      {/* Start button */}
      <button
        onClick={onStartClick}
        style={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          border: 'none',
          background: startOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!startOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        }}
        onMouseLeave={e => {
          if (!startOpen) e.currentTarget.style.background = 'transparent'
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #E6C875 0%, #A68B50 100%)',
            boxShadow: '0 2px 8px rgba(201, 168, 76, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
            color: '#0A0A0A',
          }}
        >
          M
        </div>
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)', margin: '0 2px', flexShrink: 0 }} />

      {/* Open windows */}
      <div style={{ display: 'flex', gap: '4px', overflow: 'hidden', padding: '0 4px' }}>
        {openWindows.map(win => (
          <button
            key={win.id}
            onClick={() => onWindowClick(win.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '10px',
              border: 'none',
              background: win.minimized ? 'transparent' : 'rgba(255,255,255,0.08)',
              boxShadow: win.minimized ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
              cursor: 'pointer',
              maxWidth: '180px',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={e =>
              (e.currentTarget.style.background = win.minimized
                ? 'transparent'
                : 'rgba(255,255,255,0.08)')
            }
          >
            <div style={{ width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {win.icon}
            </div>
            <span
              style={{
                fontSize: '12px',
                color: win.minimized ? 'rgba(255,255,255,0.6)' : '#FFF',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {win.title}
            </span>
            {/* Active indicator */}
            {!win.minimized && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 12,
                  height: 3,
                  borderRadius: 1.5,
                  background: '#C9A84C',
                  boxShadow: '0 0 6px rgba(201, 168, 76, 0.6)',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* System tray */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', flexShrink: 0 }}>
        {/* User */}
        <button
          onClick={onLock}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '10px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title="Lock screen"
        >
          <div style={{ width: 6, height: 6, borderRadius: 3, background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }}/>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontFamily: 'system-ui' }}>
            {userName}
          </span>
        </button>

        {/* Clock */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            padding: '4px 12px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#FFF',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}
          >
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
          <span
            style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 500,
            }}
          >
            {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  )
}
