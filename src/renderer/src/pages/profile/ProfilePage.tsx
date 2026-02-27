import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { trpc } from '../../trpc-client/trpc'

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:   { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
  manager: { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
  cashier: { bg: 'rgba(16,185,129,0.12)',  text: '#10b981' },
}

export const ProfilePage: React.FC = () => {
  const t = useAppStore((s) => s.theme)
  const currentUser = useAppStore((s) => s.currentUser)
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)

  // ── Name / email form ──────────────────────────────────────
  const [name, setName] = useState(currentUser?.name ?? '')
  const [infoMsg, setInfoMsg] = useState('')
  const [infoError, setInfoError] = useState('')

  useEffect(() => { setName(currentUser?.name ?? '') }, [currentUser])

  const updateUser = trpc.user.update.useMutation({
    onSuccess: (user) => {
      if (user && currentUser) {
        setCurrentUser({ ...currentUser, name: user.name })
      }
      setInfoMsg('Name updated successfully.')
      setInfoError('')
    },
    onError: (e) => { setInfoError(e.message); setInfoMsg('') },
  })

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setInfoError('Name cannot be empty.'); return }
    if (!currentUser) return
    setInfoMsg('')
    setInfoError('')
    updateUser.mutate({ id: currentUser.id, data: { name: name.trim() } })
  }

  // ── Password form ──────────────────────────────────────────
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdError, setPwdError] = useState('')

  const changePassword = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      setPwdMsg('Password changed successfully.')
      setPwdError('')
      setNewPwd('')
      setConfirmPwd('')
    },
    onError: (e) => { setPwdError(e.message); setPwdMsg('') },
  })

  const handleChangePwd = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd.length < 6) { setPwdError('Password must be at least 6 characters.'); return }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return }
    if (!currentUser) return
    setPwdMsg('')
    setPwdError('')
    changePassword.mutate({ id: currentUser.id, newPassword: newPwd })
  }

  if (!currentUser) return null

  const roleStyle = ROLE_COLORS[currentUser.role] ?? ROLE_COLORS.cashier
  const initials = currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    borderRadius: '9px', border: `1px solid ${t.inputBorder}`,
    background: t.inputBg, color: t.text,
    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', color: t.textMuted,
    fontSize: '11px', fontWeight: 600, marginBottom: '5px',
  }

  const sectionStyle: React.CSSProperties = {
    background: t.surface, border: `1px solid ${t.borderMid}`,
    borderRadius: '14px', padding: '20px 22px',
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100%' }}>
    <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Avatar card ── */}
      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,var(--primary-light),var(--primary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '20px', fontWeight: 800,
          boxShadow: '0 6px 20px var(--primary-40)',
        }}>
          {initials}
        </div>
        <div>
          <p style={{ color: t.text, fontWeight: 700, fontSize: '16px' }}>{currentUser.name}</p>
          <p style={{ color: t.textFaint, fontSize: '12px', marginTop: '2px' }}>{currentUser.email}</p>
          <span style={{
            display: 'inline-block', marginTop: '6px',
            padding: '2px 10px', borderRadius: '20px',
            background: roleStyle.bg, color: roleStyle.text,
            fontSize: '10px', fontWeight: 700, textTransform: 'capitalize',
          }}>
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* ── Edit name ── */}
      <div style={sectionStyle}>
        <p style={{ color: t.text, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>Account Info</p>
        <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="Your name"
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              value={currentUser.email}
              readOnly
              style={{ ...inputStyle, opacity: 0.55, cursor: 'not-allowed' }}
            />
          </div>
          {infoMsg && <p style={{ color: '#10b981', fontSize: '11px', fontWeight: 500 }}>{infoMsg}</p>}
          {infoError && <p style={{ color: '#ef4444', fontSize: '11px', fontWeight: 500 }}>{infoError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={updateUser.isPending || name.trim() === currentUser.name}
              style={{
                padding: '8px 20px', borderRadius: '9px', border: 'none',
                background: 'var(--primary)', color: '#fff',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                opacity: (updateUser.isPending || name.trim() === currentUser.name) ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              {updateUser.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change password ── */}
      <div style={sectionStyle}>
        <p style={{ color: t.text, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>Change Password</p>
        <form onSubmit={handleChangePwd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="At least 6 characters"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Repeat password"
              style={inputStyle}
            />
          </div>
          {pwdMsg && <p style={{ color: '#10b981', fontSize: '11px', fontWeight: 500 }}>{pwdMsg}</p>}
          {pwdError && <p style={{ color: '#ef4444', fontSize: '11px', fontWeight: 500 }}>{pwdError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={changePassword.isPending || !newPwd}
              style={{
                padding: '8px 20px', borderRadius: '9px',
                background: t.inputBg, color: t.text,
                border: `1px solid ${t.inputBorder}`,
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                opacity: (changePassword.isPending || !newPwd) ? 0.5 : 1,
                fontFamily: 'inherit',
              } as React.CSSProperties}
            >
              {changePassword.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

    </div>
    </div>
  )
}
