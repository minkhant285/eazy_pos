import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { trpc } from '../../trpc-client/trpc'

export const LoginPage: React.FC = () => {
  const t = useAppStore((s) => s.theme)
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const setPage = useAppStore((s) => s.setPage)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const login = trpc.user.login.useMutation({
    onSuccess: (user) => {
      const role = user.role as 'admin' | 'manager' | 'cashier'
      setCurrentUser({ id: user.id, name: user.name, email: user.email, role })
      setPage(role === 'cashier' ? 'sales' : 'dashboard')
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }
    setError('')
    login.mutate({ email, password })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: `1px solid ${t.inputBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: t.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '100%', maxWidth: '380px', margin: '0 20px',
          background: t.surface,
          border: `1px solid ${t.borderMid}`,
          borderRadius: '20px',
          padding: '36px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg,var(--primary-light),var(--primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px var(--primary-40)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <div>
            <p style={{ color: t.text, fontWeight: 800, fontSize: '16px', letterSpacing: '-0.3px', lineHeight: 1 }}>
              Easy<span style={{ color: 'var(--primary-light)' }}>POS</span>
            </p>
            <p style={{ color: t.textFaint, fontSize: '10px', marginTop: '2px' }}>Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Email */}
          <div>
            <label style={{ color: t.textMuted, fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ color: t.textMuted, fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{
              color: '#ef4444', fontSize: '11px', fontWeight: 500,
              background: 'rgba(239,68,68,0.1)', borderRadius: '8px',
              padding: '8px 12px',
            }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={login.isPending}
            style={{
              marginTop: '4px',
              width: '100%', padding: '11px',
              borderRadius: '10px', border: 'none',
              background: 'var(--primary)', color: '#fff',
              fontSize: '13px', fontWeight: 700,
              cursor: login.isPending ? 'not-allowed' : 'pointer',
              opacity: login.isPending ? 0.7 : 1,
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
          >
            {login.isPending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
