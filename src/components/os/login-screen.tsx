'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LoginScreenProps {
  onLogin: (role: 'employee' | 'guest') => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'select' | 'employee-login'>('select')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [time, setTime] = useState(new Date())
  const [autoChecking, setAutoChecking] = useState(true)
  const emailRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        onLogin('employee')
      }
      setAutoChecking(false)
    }
    checkSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (mode === 'employee-login' && emailRef.current) {
      emailRef.current.focus()
    }
  }, [mode])

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Temporary Demo Bypass!
    if (email === 'bypass' || password === 'bypass') {
      setLoading(false)
      onLogin('employee')
      return
    }

    if (!email || !password) {
      setError('Please enter credentials')
      setLoading(false)
      return
    }

    // Real Supabase auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onLogin('employee')
  }

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#F5F0E8',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'border-color 0.2s',
  }

  const buttonStyle: React.CSSProperties = {
    padding: '12px 32px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  // Show nothing while checking session
  if (autoChecking) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#050505', zIndex: 9998,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '10px',
          background: 'linear-gradient(135deg, #C9A84C 0%, #8B7355 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 800, color: '#0A0A0A',
        }}>M</div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #080808 0%, #0D0D0A 50%, #0A0A0A 100%)',
        zIndex: 9998,
      }}
    >
      {/* Clock (top) */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            fontWeight: 200,
            color: '#F5F0E8',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-2px',
          }}
        >
          {formatTime(time)}
        </div>
        <div
          style={{
            fontSize: '16px',
            color: '#8A8478',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {formatDate(time)}
        </div>
      </div>

      {/* Login area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          minWidth: '320px',
        }}
      >
        {mode === 'select' ? (
          <>
            <div
              style={{
                fontSize: '14px',
                color: '#8A8478',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Select Profile
            </div>

            <div style={{ display: 'flex', gap: '32px' }}>
              {/* Employee */}
              <button
                onClick={() => setMode('employee-login')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px 32px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(201,168,76,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #C9A84C 0%, #8B7355 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                  }}
                >
                  👤
                </div>
                <span
                  style={{
                    color: '#F5F0E8',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  Employee
                </span>
              </button>

              {/* Guest */}
              <button
                onClick={() => onLogin('guest')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px 32px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(201,168,76,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3A3830 0%, #262420 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                  }}
                >
                  🍽️
                </div>
                <span
                  style={{
                    color: '#F5F0E8',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  Guest
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => { setMode('select'); setError('') }}
              style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                background: 'transparent',
                border: 'none',
                color: '#8A8478',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ← Back
            </button>

            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #C9A84C 0%, #8B7355 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              👤
            </div>

            <form
              onSubmit={handleEmployeeLogin}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '280px',
              }}
            >
              <input
                ref={emailRef}
                type="text"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />

              {error && (
                <div style={{ color: '#BF3B3B', fontSize: '12px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...buttonStyle,
                  background: loading
                    ? '#3A3830'
                    : 'linear-gradient(135deg, #C9A84C 0%, #8B7355 100%)',
                  color: '#0A0A0A',
                  marginTop: '4px',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Bottom branding */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: '#3A3830',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '4px',
            background: 'linear-gradient(135deg, #C9A84C 0%, #8B7355 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            fontWeight: 800,
            color: '#0A0A0A',
          }}
        >
          M
        </div>
        Mise OS
      </div>
    </div>
  )
}
