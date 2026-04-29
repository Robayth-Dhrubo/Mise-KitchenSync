'use client'

import { useState, useEffect } from 'react'

interface BootScreenProps {
  onBootComplete: () => void
}

export default function BootScreen({ onBootComplete }: BootScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'loading' | 'done'>('logo')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Phase 1: Show logo for 1.5s
    const logoTimer = setTimeout(() => setPhase('loading'), 1500)
    return () => clearTimeout(logoTimer)
  }, [])

  useEffect(() => {
    if (phase !== 'loading') return

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setPhase('done')
          setTimeout(onBootComplete, 400)
          return 100
        }
        // Simulate realistic boot — fast start, slow middle, fast end
        const step = prev < 30 ? 4 : prev < 70 ? 2 : prev < 90 ? 3 : 5
        return Math.min(prev + step, 100)
      })
    }, 60)

    return () => clearInterval(interval)
  }, [phase, onBootComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        zIndex: 9999,
        transition: 'opacity 0.5s ease',
        opacity: phase === 'done' ? 0 : 1,
      }}
    >
      {/* Mise Logo */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          opacity: phase === 'logo' ? 1 : 0.9,
          transform: phase === 'logo' ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.8s ease',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #C9A84C 0%, #8B7355 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: 800,
            color: '#0A0A0A',
            letterSpacing: '-2px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          M
        </div>

        <div
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#F5F0E8',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          MISE OS
        </div>
      </div>

      {/* Loading bar */}
      {phase !== 'logo' && (
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            opacity: phase === 'done' ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}
        >
          <div
            style={{
              width: '240px',
              height: '3px',
              background: '#1C1C1C',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #C9A84C, #D4A76A)',
                borderRadius: '2px',
                transition: 'width 0.1s ease',
              }}
            />
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#8A8478',
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '1px',
            }}
          >
            {progress < 30
              ? 'Initializing system...'
              : progress < 60
                ? 'Loading services...'
                : progress < 90
                  ? 'Preparing desktop...'
                  : 'Ready'}
          </div>
        </div>
      )}

      {/* Version */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          fontSize: '10px',
          color: '#3A3830',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        Mise OS v1.0.0
      </div>
    </div>
  )
}
