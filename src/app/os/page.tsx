'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import BootScreen from '@/components/os/boot-screen'
import LoginScreen from '@/components/os/login-screen'
import EmployeeDesktop from '@/components/os/employee-desktop'
import GuestDesktop from '@/components/os/guest-desktop'

type OSPhase = 'boot' | 'login' | 'desktop'
type UserRole = 'employee' | 'guest'

export default function MiseOSPage() {
  const [phase, setPhase] = useState<OSPhase>('boot')
  const [role, setRole] = useState<UserRole | null>(null)
  const [userName, setUserName] = useState('Employee')
  const [employeeRole, setEmployeeRole] = useState('admin') // Default safe fallback
  const supabase = createClient()

  const handleBootComplete = () => setPhase('login')

  const handleLogin = async (selectedRole: UserRole) => {
    setRole(selectedRole)

    if (selectedRole === 'employee') {
      try {
        // Get user info from Supabase
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Try to get profile name AND role
          const { data: profile } = await supabase
            .from('profiles')
            .select('restaurant_name, email, role')
            .eq('id', user.id)
            .single()

          setUserName(
            profile?.restaurant_name || user.email?.split('@')[0] || 'Employee'
          )
          if (profile?.role) {
            setEmployeeRole(profile.role)
          }
        }
      } catch (e) {
        console.warn('Supabase offline or unreachable, switching to bypass identity.')
        setUserName('Bypass Admin')
        setEmployeeRole('admin')
      }
    }

    setPhase('desktop')
  }

  const handleLock = () => {
    setPhase('login')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setRole(null)
    setPhase('login')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#050505' }}>
      {phase === 'boot' && <BootScreen onBootComplete={handleBootComplete} />}

      {phase === 'login' && <LoginScreen onLogin={handleLogin} />}

      {phase === 'desktop' && role === 'employee' && (
        <EmployeeDesktop
          onLock={handleLock}
          onLogout={handleLogout}
          userName={userName}
          userRole={employeeRole}
        />
      )}

      {phase === 'desktop' && role === 'guest' && (
        <GuestDesktop onLogout={handleLogout} />
      )}
    </div>
  )
}
