'use client'

import { APP_REGISTRY } from './app-registry'

interface StartMenuProps {
  isOpen: boolean
  onClose: () => void
  onOpenApp: (appId: string) => void
  onLock: () => void
  onLogout: () => void
  userName: string
  userRole: string
}

export default function StartMenu({ isOpen, onClose, onOpenApp, onLock, onLogout, userName, userRole }: StartMenuProps) {
  if (!isOpen) return null

  const categories = [
    { key: 'operations' as const, label: 'Operations' },
    { key: 'productivity' as const, label: 'Productivity' },
    { key: 'system' as const, label: 'System' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      />

      {/* Menu */}
      <div
        style={{
          position: 'fixed',
          bottom: '72px', /* Lifted higher above the floating taskbar */
          left: '50%',
          transform: 'translateX(-50%)',
          width: '420px',
          maxHeight: 'calc(100vh - 120px)',
          background: 'rgba(25, 25, 23, 0.45)',
          backdropFilter: 'blur(35px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'tw-fade-in 0.2s ease-out',
        }}
      >
        {/* Search */}
        <div style={{ padding: '16px' }}>
          <div style={{ 
            position: 'relative', 
            background: 'rgba(0, 0, 0, 0.25)', 
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <span style={{ position: 'absolute', left: 14, top: 12, fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>🔍</span>
            <input
              placeholder="Search apps..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                background: 'transparent',
                border: 'none',
                color: '#FFF',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            />
          </div>
        </div>

        {/* App list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 12px' }}>
          {categories.map(cat => {
            const apps = APP_REGISTRY.filter(a => 
              a.category === cat.key && 
              (!a.allowedRoles || a.allowedRoles.includes(userRole as any))
            )
            if (apps.length === 0) return null
            return (
              <div key={cat.key} style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    padding: '8px 12px 4px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {cat.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                  {apps.map(app => (
                    <button
                      key={app.id}
                      onClick={() => {
                        onOpenApp(app.id)
                        onClose()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
                        {app.icon}
                      </div>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#FFF',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                        }}
                      >
                        {app.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer — user + power */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #E6C875, #A68B50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
              }}
            >
              👤
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', color: '#FFF', fontWeight: 500, fontFamily: 'system-ui' }}>
                {userName}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'system-ui' }}>
                Employee OS
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={onLock}
              title="Lock"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            >
              🔒
            </button>
            <button
              onClick={onLogout}
              title="Sign out"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
            >
              ⏻
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
