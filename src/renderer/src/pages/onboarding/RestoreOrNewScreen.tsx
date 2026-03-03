import React, { useState } from 'react'
import { useTheme } from '../../store/useAppStore'

interface Props {
  onProceedSetup: () => void
}

export const RestoreOrNewScreen: React.FC<Props> = ({ onProceedSetup }) => {
  const t = useTheme()
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRestore = async () => {
    setIsRestoring(true)
    setError(null)
    try {
      const result = await window.backupApi.restore()
      if (!result.success && result.error) {
        setError(result.error)
      }
      // if success → app.relaunch() is called in main, window closes automatically
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Unexpected error')
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: t.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px', animation: 'slideUp 0.25s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: 'linear-gradient(135deg,var(--primary-light),var(--primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 8px 24px var(--primary-35)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <p style={{ color: t.text, fontWeight: 800, fontSize: '22px', letterSpacing: '-0.5px' }}>
            Easy<span style={{ color: 'var(--primary-light)' }}>POS</span>
          </p>
          <p style={{ color: t.textFaint, fontSize: '12px', marginTop: '4px' }}>
            Welcome! How would you like to get started?
          </p>
        </div>

        {/* Option cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Restore backup */}
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            style={{
              width: '100%', background: t.surface,
              border: `1.5px solid ${t.borderMid}`, borderRadius: '16px',
              padding: '20px', textAlign: 'left',
              cursor: isRestoring ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: isRestoring ? 0.7 : 1,
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'var(--primary-10)', border: '1px solid var(--primary-20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p style={{ color: t.text, fontWeight: 700, fontSize: '13px' }}>
                  {isRestoring ? 'Restoring…' : 'Restore from backup'}
                </p>
                <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '3px', lineHeight: 1.5 }}>
                  Already an EasyPOS user? Import your <strong>.mkbak</strong> file to restore all your data.
                </p>
              </div>
            </div>
          </button>

          {/* Fresh setup */}
          <button
            onClick={onProceedSetup}
            style={{
              width: '100%', background: t.surface,
              border: `1.5px solid ${t.borderMid}`, borderRadius: '16px',
              padding: '20px', textAlign: 'left', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <div>
                <p style={{ color: t.text, fontWeight: 700, fontSize: '13px' }}>Set up fresh</p>
                <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '3px', lineHeight: 1.5 }}>
                  New to EasyPOS? Create your account and configure your store from scratch.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Error */}
        {error && (
          <p style={{
            marginTop: '14px', color: '#ef4444', fontSize: '12px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '10px 14px',
          }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
