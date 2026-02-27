import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { trpc } from '../../trpc-client/trpc'

interface Props {
  onDone: () => void  // called after admin created so App re-checks hasAny
}

export const SetupPage: React.FC<Props> = ({ onDone }) => {
  const t = useAppStore((s) => s.theme)
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)

  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')

  const setup = trpc.user.setupAdmin.useMutation({
    onSuccess: (user) => {
      setCurrentUser({
        id: user!.id,
        name: user!.name,
        email: user!.email,
        role: user!.role as 'admin' | 'manager' | 'cashier',
      })
      onDone()
    },
    onError: (err) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim())            return setError('Name is required')
    if (!email.trim())           return setError('Email is required')
    if (password.length < 6)     return setError('Password must be at least 6 characters')
    if (password !== confirm)    return setError('Passwords do not match')
    setup.mutate({ name: name.trim(), email: email.trim(), password })
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: `1px solid ${t.inputBorder}`, background: t.inputBg,
    color: t.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    color: t.textMuted, fontSize: '11px', fontWeight: 600,
    display: 'block', marginBottom: '5px',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: t.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', margin: '0 20px',
        background: t.surface, border: `1px solid ${t.borderMid}`,
        borderRadius: '20px', padding: '36px 32px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Logo + heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
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
            <p style={{ color: t.textFaint, fontSize: '10px', marginTop: '2px' }}>First-time setup</p>
          </div>
        </div>

        <div style={{
          marginBottom: '24px', marginTop: '16px',
          padding: '12px 14px', borderRadius: '10px',
          background: 'var(--primary-10)', border: '1px solid var(--primary-20)',
        }}>
          <p style={{ color: 'var(--primary-light)', fontSize: '12px', fontWeight: 600 }}>
            No accounts found
          </p>
          <p style={{ color: t.textMuted, fontSize: '11px', marginTop: '3px' }}>
            Create your admin account to get started. You can add more users from the Users page later.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Full Name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name" autoFocus style={inp}
            />
          </div>

          <div>
            <label style={lbl}>Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com" style={inp}
            />
          </div>

          <div>
            <label style={lbl}>Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters" style={inp}
            />
          </div>

          <div>
            <label style={lbl}>Confirm Password</label>
            <input
              type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password" style={inp}
            />
          </div>

          {error && (
            <p style={{
              color: '#ef4444', fontSize: '11px', fontWeight: 500,
              background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '8px 12px',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={setup.isPending}
            style={{
              marginTop: '4px', width: '100%', padding: '11px',
              borderRadius: '10px', border: 'none',
              background: 'var(--primary)', color: '#fff',
              fontSize: '13px', fontWeight: 700,
              cursor: setup.isPending ? 'not-allowed' : 'pointer',
              opacity: setup.isPending ? 0.7 : 1,
              fontFamily: 'inherit', transition: 'opacity 0.15s',
            }}
          >
            {setup.isPending ? 'Creating account…' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
