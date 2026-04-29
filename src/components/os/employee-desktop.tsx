'use client'

import { useState, useCallback } from 'react'
import AppWindow, { type WindowState } from './app-window'
import Taskbar from './taskbar'
import StartMenu from './start-menu'
import { APP_REGISTRY, getApp } from './app-registry'

interface EmployeeDesktopProps {
  onLock: () => void
  onLogout: () => void
  userName: string
  userRole: string
}

export default function EmployeeDesktop({ onLock, onLogout, userName, userRole }: EmployeeDesktopProps) {
  const [windows, setWindows] = useState<WindowState[]>([])
  const [startOpen, setStartOpen] = useState(false)
  const [nextZ, setNextZ] = useState(100)

  const openApp = useCallback(
    (appId: string) => {
      // If already open, focus it
      const existing = windows.find(w => w.id === appId)
      if (existing) {
        setWindows(prev =>
          prev.map(w =>
            w.id === appId
              ? { ...w, minimized: false, zIndex: nextZ }
              : w
          )
        )
        setNextZ(z => z + 1)
        return
      }

      const app = getApp(appId)
      if (!app) return

      // Stagger position for new windows
      const offset = (windows.length % 8) * 30
      const newWindow: WindowState = {
        id: app.id,
        title: app.title,
        icon: app.icon,
        x: 80 + offset,
        y: 40 + offset,
        width: app.defaultWidth,
        height: app.defaultHeight,
        minimized: false,
        maximized: false,
        zIndex: nextZ,
        component: app.component(),
      }

      setWindows(prev => [...prev, newWindow])
      setNextZ(z => z + 1)
    },
    [windows, nextZ]
  )

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, minimized: true } : w)))
  }, [])

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, maximized: !w.maximized } : w))
    )
  }, [])

  const focusWindow = useCallback(
    (id: string) => {
      setWindows(prev => prev.map(w => (w.id === id ? { ...w, zIndex: nextZ } : w)))
      setNextZ(z => z + 1)
    },
    [nextZ]
  )

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, x, y } : w)))
  }, [])

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, width, height } : w)))
  }, [])

  const handleTaskbarWindowClick = useCallback(
    (id: string) => {
      const win = windows.find(w => w.id === id)
      if (!win) return
      if (win.minimized) {
        setWindows(prev =>
          prev.map(w => (w.id === id ? { ...w, minimized: false, zIndex: nextZ } : w))
        )
        setNextZ(z => z + 1)
      } else {
        // If it's already the top window, minimize. Otherwise focus.
        const maxZ = Math.max(...windows.map(w => w.zIndex))
        if (win.zIndex === maxZ) {
          minimizeWindow(id)
        } else {
          focusWindow(id)
        }
      }
    },
    [windows, nextZ, minimizeWindow, focusWindow]
  )

  // Desktop icons — show operations category only on desktop, filtered by role
  const desktopApps = APP_REGISTRY.filter(a => 
    a.category === 'operations' && 
    (!a.allowedRoles || a.allowedRoles.includes(userRole as any))
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0A0A',
        overflow: 'hidden',
      }}
    >
      {/* Wallpaper — Deep Premium Glassmorphic Mesh Gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 15% 50%, rgba(201,168,76,0.12), transparent 45%), radial-gradient(circle at 85% 30%, rgba(139,115,85,0.08), transparent 50%), radial-gradient(circle at 50% 120%, rgba(201,168,76,0.15), transparent 60%), linear-gradient(180deg, #0A0A0A 0%, #151515 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Desktop icons */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 80px)',
          gap: '4px',
          zIndex: 1,
        }}
      >
        {desktopApps.map(app => (
          <button
            key={app.id}
            onDoubleClick={() => openApp(app.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 4px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {app.icon}
            </div>
            <span
              style={{
                fontSize: '10px',
                color: '#F5F0E8',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textAlign: 'center',
                lineHeight: 1.3,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                maxWidth: '72px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {app.title}
            </span>
          </button>
        ))}
      </div>

      {/* Screen watermark (security) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 9990,
          opacity: 0.03,
          fontSize: '14px',
          fontFamily: 'ui-monospace, monospace',
          color: '#F5F0E8',
          transform: 'rotate(-25deg)',
          letterSpacing: '4px',
          userSelect: 'none',
        }}
      >
        {userName} • MISE OS • CONFIDENTIAL
      </div>

      {/* Windows */}
      {windows.map(win => (
        <AppWindow
          key={win.id}
          window={win}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          onMaximize={maximizeWindow}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
        />
      ))}

      {/* Start Menu */}
      <StartMenu
        isOpen={startOpen}
        onClose={() => setStartOpen(false)}
        onOpenApp={openApp}
        onLock={onLock}
        onLogout={onLogout}
        userName={userName}
        userRole={userRole}
      />

      {/* Taskbar */}
      <Taskbar
        openWindows={windows.map(w => ({
          id: w.id,
          title: w.title,
          icon: w.icon,
          minimized: w.minimized,
        }))}
        onWindowClick={handleTaskbarWindowClick}
        onStartClick={() => setStartOpen(prev => !prev)}
        startOpen={startOpen}
        userName={userName}
        onLock={onLock}
      />
    </div>
  )
}
