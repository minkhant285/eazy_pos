import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { CURRENCIES } from '../../constants/currencies'
import { LANG_OPTIONS } from '../../constants/translations'

const APP_VERSION = '1.0.0'

// ── Section card ──────────────────────────────────────────────

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode; t: any }> = ({
  title, description, children, t,
}) => (
  <div style={{
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: '16px',
    overflow: 'hidden',
  }}>
    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.borderMid}` }}>
      <p style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>{title}</p>
      {description && (
        <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '2px' }}>{description}</p>
      )}
    </div>
    <div style={{ padding: '18px 20px' }}>
      {children}
    </div>
  </div>
)

// ── Group label ───────────────────────────────────────────────

const GroupLabel: React.FC<{ label: string; t: any }> = ({ label, t }) => (
  <p style={{
    color: t.textFaint, fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.8px',
    paddingLeft: '2px',
  }}>{label}</p>
)

// ── Component ─────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const t                   = useAppStore((s) => s.theme)
  const isDark              = useAppStore((s) => s.isDark)
  const toggleTheme         = useAppStore((s) => s.toggleTheme)
  const lang                = useAppStore((s) => s.lang)
  const setLang             = useAppStore((s) => s.setLang)
  const currency            = useAppStore((s) => s.currency)
  const setCurrency         = useAppStore((s) => s.setCurrency)
  const lowStockThreshold   = useAppStore((s) => s.lowStockThreshold)
  const setLowStockThreshold = useAppStore((s) => s.setLowStockThreshold)

  const [thresholdInput, setThresholdInput] = useState(String(lowStockThreshold))

  const handleThresholdBlur = () => {
    const n = parseInt(thresholdInput, 10)
    if (!isNaN(n) && n >= 0) {
      setLowStockThreshold(n)
      setThresholdInput(String(n))
    } else {
      setThresholdInput(String(lowStockThreshold))
    }
  }

  const optionBtn = (active: boolean): React.CSSProperties => ({
    padding: '10px 16px',
    borderRadius: '10px',
    border: `1.5px solid ${active ? '#7c3aed' : t.border}`,
    background: active ? 'rgba(124,58,237,0.08)' : t.inputBg,
    color: active ? '#7c3aed' : t.text,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: active ? 700 : 400,
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'center', animation: 'slideUp 0.2s ease' }}>
      <div style={{ width: '100%', maxWidth: '620px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Page title */}
        <div>
          <h1 style={{ color: t.text, fontSize: '21px', fontWeight: 800, letterSpacing: '-0.5px' }}>Settings</h1>
          <p style={{ color: t.textMuted, fontSize: '12px', marginTop: '2px' }}>Manage your app preferences</p>
        </div>

        {/* ── GROUP: Display ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <GroupLabel label="Display" t={t} />

          <Section title="Theme" description="Choose between dark and light interface" t={t}>
            {/* Compact pill toggle */}
            <div style={{ display: 'inline-flex', background: t.inputBg, borderRadius: '10px', padding: '3px', border: `1px solid ${t.border}` }}>
              <button
                onClick={() => !isDark && toggleTheme()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: isDark ? 700 : 500, transition: 'all 0.15s', background: isDark ? (t.surface) : 'transparent', color: isDark ? '#7c3aed' : t.textMuted, boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.18)' : 'none' }}
              >
                <Icon name="moon" size={13} style={{ color: isDark ? '#7c3aed' : t.textFaint }} />
                Dark
              </button>
              <button
                onClick={() => isDark && toggleTheme()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: !isDark ? 700 : 500, transition: 'all 0.15s', background: !isDark ? (t.surface) : 'transparent', color: !isDark ? '#7c3aed' : t.textMuted, boxShadow: !isDark ? '0 1px 4px rgba(0,0,0,0.18)' : 'none' }}
              >
                <Icon name="sun" size={13} style={{ color: !isDark ? '#7c3aed' : t.textFaint }} />
                Light
              </button>
            </div>
          </Section>

          <Section title="Language" description="Select your preferred display language" t={t}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLang(opt.code)}
                  style={{ ...optionBtn(lang === opt.code), minWidth: '130px', flex: 1 }}
                >
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{opt.flag}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* ── GROUP: Regional ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <GroupLabel label="Regional" t={t} />

          <Section title="Currency" description="Used for all prices and totals across the app" t={t}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {CURRENCIES.map((c) => {
                const active = currency.code === c.code
                return (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: `1.5px solid ${active ? '#7c3aed' : t.border}`,
                      background: active ? 'rgba(124,58,237,0.08)' : t.inputBg,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: active ? '#7c3aed' : t.text, lineHeight: 1 }}>
                        {c.symbol}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: active ? '#7c3aed' : t.textMuted }}>
                        {c.code}
                      </span>
                    </div>
                    <p style={{ fontSize: '10px', color: t.textFaint, marginTop: '2px' }}>{c.name}</p>
                  </button>
                )
              })}
            </div>
          </Section>
        </div>

        {/* ── GROUP: Inventory ───────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <GroupLabel label="Inventory" t={t} />

          <Section title="Stock Alerts" description="Configure thresholds for inventory warnings" t={t}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: t.text, fontSize: '13px', fontWeight: 600 }}>Low Stock Threshold</p>
                <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '3px' }}>
                  Products with available quantity at or below this number will be flagged as low stock.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    const n = Math.max(0, lowStockThreshold - 1)
                    setLowStockThreshold(n)
                    setThresholdInput(String(n))
                  }}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  onBlur={handleThresholdBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleThresholdBlur()}
                  style={{
                    width: '64px', textAlign: 'center',
                    background: t.inputBg, border: `1.5px solid #7c3aed`,
                    borderRadius: '10px', padding: '7px 10px',
                    color: t.text, fontSize: '16px', fontWeight: 700,
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => {
                    const n = lowStockThreshold + 1
                    setLowStockThreshold(n)
                    setThresholdInput(String(n))
                  }}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Preview badge */}
            <div style={{ marginTop: '14px', padding: '10px 14px', background: t.inputBg, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
              <p style={{ color: t.textMuted, fontSize: '12px' }}>
                Products with <strong style={{ color: t.text }}>{lowStockThreshold}</strong> or fewer units available will show a{' '}
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: '4px' }}>LOW</span>{' '}
                badge in the stock page.
              </p>
            </div>
          </Section>
        </div>

        {/* ── GROUP: About ───────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <GroupLabel label="About" t={t} />

          <Section title="Application" t={t}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
                background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(124,58,237,0.35)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
              </div>
              <div>
                <p style={{ color: t.text, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                  MK<span style={{ color: '#8b5cf6' }}>POS</span>
                </p>
                <p style={{ color: t.textMuted, fontSize: '12px', marginTop: '2px' }}>Version {APP_VERSION}</p>
                <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '4px' }}>
                  Electron · React 19 · tRPC · SQLite
                </p>
              </div>
            </div>
          </Section>
        </div>

      </div>
    </div>
  )
}
