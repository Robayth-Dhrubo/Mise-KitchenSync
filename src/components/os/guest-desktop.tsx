'use client'

interface GuestDesktopProps {
  onLogout: () => void
  roomId?: string
}

export default function GuestDesktop({ onLogout, roomId }: GuestDesktopProps) {
  const tiles = [
    { id: 'menu', icon: '🍽️', label: 'View Menu', desc: 'Browse our dishes', color: '#C9A84C' },
    { id: 'order', icon: '🛎️', label: 'Place Order', desc: 'Order to your table', color: '#8B7355' },
    { id: 'call', icon: '📞', label: 'Call Staff', desc: 'Request assistance', color: '#6B7355' },
    { id: 'feedback', icon: '💬', label: 'Feedback', desc: 'Rate your experience', color: '#7B6355' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at top, #111 0%, #050505 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Background Ambient Glow */}
      <div style={{
          position: 'absolute',
          top: '20%', left: '30%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(201,168,76,0.05), transparent 60%)',
          filter: 'blur(60px)', pointerEvents: 'none'
      }} />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #E6C875 0%, #A68B50 100%)',
            boxShadow: '0 8px 24px rgba(201,168,76,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 800,
            color: '#0A0A0A',
          }}
        >
          M
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
          Welcome{roomId ? ` • ${roomId}` : ''}
        </div>
      </div>

      {/* App tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          padding: '32px',
          maxWidth: '520px',
          width: '100%',
          zIndex: 10,
        }}
      >
        {tiles.map(tile => (
          <button
            key={tile.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              padding: '40px 24px',
              borderRadius: '24px',
              border: `1px solid rgba(255, 255, 255, 0.05)`,
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(2px) scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          >
            <span style={{ fontSize: '48px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>{tile.icon}</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#FFF', letterSpacing: '0.3px' }}>{tile.label}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{tile.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom dock */}
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          display: 'flex',
          gap: '24px',
          alignItems: 'center',
        }}
      >
        <button
          onClick={onLogout}
          style={{
            padding: '12px 28px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'system-ui',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#FFF'
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
            e.currentTarget.style.background = 'rgba(0,0,0,0.5)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          }}
        >
          Exit Kiosk Mode
        </button>
      </div>
    </div>
  )
}
