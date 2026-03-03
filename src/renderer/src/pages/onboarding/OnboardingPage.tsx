import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { trpc } from '../../trpc-client/trpc'

export const OnboardingPage: React.FC = () => {
  const t             = useAppStore((s) => s.theme)
  const setPage       = useAppStore((s) => s.setPage)
  const setOnboarding = useAppStore((s) => s.setOnboardingDone)
  const utils         = trpc.useUtils()

  const [locName,    setLocName]    = useState('')
  const [locAddress, setLocAddress] = useState('')
  const [locErr,     setLocErr]     = useState('')

  const createLoc = trpc.location.create.useMutation({
    onSuccess: () => {
      // Invalidate the location list so App.tsx picks up the new location immediately
      utils.location.list.invalidate()
      setOnboarding(true)
      setPage('dashboard')
    },
    onError: (e) => setLocErr(e.message),
  })

  const submit = () => {
    if (!locName.trim()) return setLocErr('Location name is required')
    setLocErr('')
    createLoc.mutate({ name: locName.trim(), address: locAddress.trim() || undefined })
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '10px',
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
      fontFamily: "'DM Sans', sans-serif", padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px',
        background: t.surface, border: `1px solid ${t.borderMid}`,
        borderRadius: '22px', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        animation: 'slideUp 0.25s ease',
      }}>

        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${t.borderMid}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
              background: 'linear-gradient(135deg,var(--primary-light),var(--primary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <div>
              <p style={{ color: t.text, fontWeight: 800, fontSize: '15px', letterSpacing: '-0.3px' }}>
                Easy<span style={{ color: 'var(--primary-light)' }}>POS</span> — Store Setup
              </p>
              <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '1px' }}>
                Add your store location to start selling
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 32px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '11px',
              background: 'var(--primary-10)', border: '1px solid var(--primary-20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p style={{ color: t.text, fontWeight: 700, fontSize: '14px' }}>Add your first location</p>
              <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '2px' }}>
                A location represents your store or warehouse
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={lbl}>Location Name *</label>
              <input
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                placeholder="e.g. Main Store, Branch 1"
                style={inp}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && !createLoc.isPending && submit()}
              />
            </div>
            <div>
              <label style={lbl}>Address <span style={{ color: t.textFaint, fontWeight: 400 }}>(optional)</span></label>
              <input
                value={locAddress}
                onChange={(e) => setLocAddress(e.target.value)}
                placeholder="Street, City"
                style={inp}
                onKeyDown={(e) => e.key === 'Enter' && !createLoc.isPending && submit()}
              />
            </div>
            {locErr && (
              <p style={{
                color: '#ef4444', fontSize: '11px',
                background: 'rgba(239,68,68,0.08)', borderRadius: '8px',
                padding: '7px 10px', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                {locErr}
              </p>
            )}
          </div>

          <button
            onClick={submit}
            disabled={createLoc.isPending}
            style={{
              width: '100%', marginTop: '22px', padding: '10px',
              borderRadius: '10px', border: 'none',
              background: 'var(--primary)', color: '#fff',
              fontSize: '13px', fontWeight: 700,
              cursor: createLoc.isPending ? 'not-allowed' : 'pointer',
              opacity: createLoc.isPending ? 0.7 : 1,
              fontFamily: 'inherit', transition: 'opacity 0.15s',
            }}
          >
            {createLoc.isPending ? 'Saving…' : 'Save & Start Selling'}
          </button>
        </div>
      </div>
    </div>
  )
}
