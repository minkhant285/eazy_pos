import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { CURRENCIES } from '../../constants/currencies'
import { LANG_OPTIONS } from '../../constants/translations'
import { PRIMARY_PRESETS, FONT_SCALES } from '../../constants/primaryPresets'
import { trpc } from '../../trpc-client/trpc'

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
  const lowStockThreshold    = useAppStore((s) => s.lowStockThreshold)
  const setLowStockThreshold = useAppStore((s) => s.setLowStockThreshold)
  const primaryPresetId      = useAppStore((s) => s.primaryPresetId)
  const setPrimaryPresetId   = useAppStore((s) => s.setPrimaryPresetId)
  const fontScale            = useAppStore((s) => s.fontScale)
  const setFontScale         = useAppStore((s) => s.setFontScale)
  const currentUser          = useAppStore((s) => s.currentUser)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupMsg,   setBackupMsg]   = useState<string | null>(null)

  // License
  const [licenseKey, setLicenseKey]   = useState('')
  const [licenseMsg, setLicenseMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [midCopied,  setMidCopied]    = useState(false)
  const { data: licenseData, refetch: refetchLicense } = trpc.license.check.useQuery(
    undefined, { refetchOnWindowFocus: false, staleTime: 30_000 }
  )
  const activateMut = trpc.license.activate.useMutation({
    onSuccess: (data) => {
      if (data?.success) {
        setLicenseMsg({ ok: true, text: 'License activated successfully!' })
        setLicenseKey('')
        refetchLicense()
      } else {
        setLicenseMsg({ ok: false, text: data?.error ?? 'Activation failed' })
      }
    },
    onError: () => setLicenseMsg({ ok: false, text: 'Network error — please try again' }),
  })

  const handleBackup = async () => {
    setIsBackingUp(true)
    setBackupMsg(null)
    const result = await window.backupApi.save()
    setIsBackingUp(false)
    if (result.success) {
      setBackupMsg(`Backup saved to ${result.path}`)
    } else if (result.error) {
      setBackupMsg(`Error: ${result.error}`)
    }
  }

  const optionBtn = (active: boolean): React.CSSProperties => ({
    padding: '10px 16px',
    borderRadius: '10px',
    border: `1.5px solid ${active ? 'var(--primary)' : t.border}`,
    background: active ? 'var(--primary-08)' : t.inputBg,
    color: active ? 'var(--primary)' : t.text,
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
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: isDark ? 700 : 500, transition: 'all 0.15s', background: isDark ? (t.surface) : 'transparent', color: isDark ? 'var(--primary)' : t.textMuted, boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.18)' : 'none' }}
              >
                <Icon name="moon" size={13} style={{ color: isDark ? 'var(--primary)' : t.textFaint }} />
                Dark
              </button>
              <button
                onClick={() => isDark && toggleTheme()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: !isDark ? 700 : 500, transition: 'all 0.15s', background: !isDark ? (t.surface) : 'transparent', color: !isDark ? 'var(--primary)' : t.textMuted, boxShadow: !isDark ? '0 1px 4px rgba(0,0,0,0.18)' : 'none' }}
              >
                <Icon name="sun" size={13} style={{ color: !isDark ? 'var(--primary)' : t.textFaint }} />
                Light
              </button>
            </div>
          </Section>

          <Section title="Accent Color" description="Choose the primary accent color used throughout the app" t={t}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {PRIMARY_PRESETS.map((preset) => {
                const active = primaryPresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    title={preset.label}
                    onClick={() => setPrimaryPresetId(preset.id)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      border: active ? `3px solid ${preset.color}` : `3px solid transparent`,
                      padding: '3px',
                      background: 'transparent',
                      cursor: 'pointer',
                      outline: active ? `2px solid ${preset.color}` : '2px solid transparent',
                      outlineOffset: '2px',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: preset.color,
                    }} />
                  </button>
                )
              })}
            </div>
            <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '10px' }}>
              Current: <strong style={{ color: t.text }}>{PRIMARY_PRESETS.find((p) => p.id === primaryPresetId)?.label ?? 'Violet'}</strong>
            </p>
          </Section>

          <Section title="Font Size" description="Adjust the overall text size across the app" t={t}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {FONT_SCALES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFontScale(value)}
                  style={{
                    flex: 1, padding: '12px 10px', borderRadius: '10px',
                    border: `1.5px solid ${fontScale === value ? 'var(--primary)' : t.border}`,
                    background: fontScale === value ? 'var(--primary-08)' : t.inputBg,
                    color: fontScale === value ? 'var(--primary)' : t.text,
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: fontScale === value ? 700 : 500,
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}
                >
                  <span style={{ fontSize: value === 'sm' ? '13px' : value === 'md' ? '17px' : '21px', lineHeight: 1 }}>A</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>{label}</span>
                </button>
              ))}
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
        {currentUser?.role !== 'cashier' && <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                      border: `1.5px solid ${active ? 'var(--primary)' : t.border}`,
                      background: active ? 'var(--primary-08)' : t.inputBg,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: active ? 'var(--primary)' : t.text, lineHeight: 1 }}>
                        {c.symbol}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: active ? 'var(--primary)' : t.textMuted }}>
                        {c.code}
                      </span>
                    </div>
                    <p style={{ fontSize: '10px', color: t.textFaint, marginTop: '2px' }}>{c.name}</p>
                  </button>
                )
              })}
            </div>
          </Section>
        </div>}

        {/* ── GROUP: Inventory ───────────────────────────────── */}
        {currentUser?.role !== 'cashier' && <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <GroupLabel label="Inventory" t={t} />
          <Section title="Low Stock Warning" description="Flag products with quantity at or below this number" t={t}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: t.text, fontSize: '13px', fontWeight: 600 }}>Low Stock Threshold</p>
                <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '3px' }}>
                  Products with qty on hand at or below this number will be flagged as low stock.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => setLowStockThreshold(Math.max(0, lowStockThreshold - 1))}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                >−</button>
                <input
                  type="number" min="0"
                  value={lowStockThreshold}
                  onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n) && n >= 0) setLowStockThreshold(n); }}
                  style={{ width: '64px', textAlign: 'center', background: t.inputBg, border: `1.5px solid var(--primary)`, borderRadius: '10px', padding: '7px 10px', color: t.text, fontSize: '16px', fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
                />
                <button
                  onClick={() => setLowStockThreshold(lowStockThreshold + 1)}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                >+</button>
              </div>
            </div>
            <div style={{ marginTop: '12px', padding: '10px 14px', background: t.inputBg, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
              <p style={{ color: t.textMuted, fontSize: '12px' }}>
                Products with <strong style={{ color: t.text }}>{lowStockThreshold}</strong> or fewer units will show a{' '}
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: '4px' }}>LOW</span>{' '}
                badge and count toward the dashboard alert.
              </p>
            </div>
          </Section>
        </div>}

        {/* ── GROUP: Data ────────────────────────────────────── */}
        {currentUser?.role !== 'cashier' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <GroupLabel label="Data" t={t} />
            <Section title="Backup" description="Save an encrypted copy of all your data" t={t}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: t.text, fontSize: '13px', fontWeight: 600 }}>Export backup file</p>
                  <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '3px' }}>
                    Downloads a <strong style={{ color: t.textMuted }}>.mkbak</strong> file with all your store data, encrypted.
                  </p>
                </div>
                <button
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  style={{
                    padding: '9px 18px', borderRadius: '10px', border: 'none',
                    background: 'var(--primary)', color: '#fff',
                    fontSize: '12px', fontWeight: 700,
                    cursor: isBackingUp ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: isBackingUp ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <Icon name="download" size={13} />
                  {isBackingUp ? 'Exporting…' : 'Export Backup'}
                </button>
              </div>
              {backupMsg && (
                <p style={{
                  marginTop: '12px', fontSize: '12px',
                  color: backupMsg.startsWith('Error') ? '#ef4444' : '#10b981',
                  background: backupMsg.startsWith('Error') ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                  border: `1px solid ${backupMsg.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  borderRadius: '8px', padding: '8px 12px',
                }}>
                  {backupMsg.startsWith('Error') ? backupMsg : `✅ ${backupMsg}`}
                </p>
              )}
            </Section>
          </div>
        )}

        {/* ── GROUP: License ─────────────────────────────────── */}
        {currentUser?.role !== 'cashier' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <GroupLabel label="License" t={t} />
            <Section title="Product Activation" description="Manage your Easy POS license" t={t}>
              {licenseData ? (() => {
                const s = licenseData.status
                const isActive  = s === 'active'
                const isTrial   = s === 'trial'
                const isExpired = s === 'trial_expired' || s === 'key_expired'

                const statusColor = isActive ? '#10b981' : isTrial ? '#d97706' : '#ef4444'
                const statusBg    = isActive ? 'rgba(16,185,129,0.1)' : isTrial ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
                const statusLabel = isActive ? 'Activated' : isTrial ? 'Trial' : s === 'key_expired' ? 'Key Expired' : 'Trial Expired'
                const statusIcon  = isActive ? '✓' : isTrial ? '◷' : '✕'

                const midDisplay = licenseData.machineId.match(/.{1,8}/g)?.join('-') ?? licenseData.machineId

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Status card */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 16px',
                      background: statusBg,
                      border: `1px solid ${statusColor}30`,
                      borderRadius: '12px',
                    }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                        background: statusColor + '20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', color: statusColor, fontWeight: 800,
                      }}>
                        {statusIcon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>
                            {isActive ? 'License Active' : isTrial ? 'Free Trial' : 'License Expired'}
                          </span>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                            borderRadius: '20px', background: statusBg,
                            color: statusColor, border: `1px solid ${statusColor}40`,
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                        <p style={{ color: t.textMuted, fontSize: '11.5px', marginTop: '3px' }}>
                          {isActive && licenseData.daysLeft !== undefined &&
                            `Expires in ${licenseData.daysLeft} day${licenseData.daysLeft !== 1 ? 's' : ''}` +
                            (licenseData.expiresAt ? ` · ${new Date(licenseData.expiresAt).toLocaleDateString()}` : '')}
                          {isTrial && licenseData.daysLeft !== undefined &&
                            `${licenseData.daysLeft} day${licenseData.daysLeft !== 1 ? 's' : ''} remaining in free trial`}
                          {isExpired && 'Your license has expired. Enter a key below to continue.'}
                        </p>
                      </div>
                      {/* Days pill for trial/active */}
                      {(isActive || isTrial) && licenseData.daysLeft !== undefined && (
                        <div style={{
                          flexShrink: 0, textAlign: 'center',
                          padding: '8px 14px',
                          background: t.surface,
                          border: `1px solid ${t.border}`,
                          borderRadius: '10px',
                        }}>
                          <div style={{ color: statusColor, fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>
                            {licenseData.daysLeft}
                          </div>
                          <div style={{ color: t.textFaint, fontSize: '10px', marginTop: '2px' }}>
                            day{licenseData.daysLeft !== 1 ? 's' : ''} left
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Machine ID */}
                    <div>
                      <p style={{ color: t.textMuted, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        Machine ID
                      </p>
                      <div style={{
                        display: 'flex', gap: '8px', alignItems: 'center',
                        background: t.inputBg, border: `1px solid ${t.border}`,
                        borderRadius: '10px', padding: '9px 12px',
                      }}>
                        <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '10.5px', color: t.textSubtle, letterSpacing: '0.3px', wordBreak: 'break-all' }}>
                          {midDisplay}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(licenseData.machineId)
                            setMidCopied(true)
                            setTimeout(() => setMidCopied(false), 2000)
                          }}
                          style={{
                            flexShrink: 0, padding: '4px 10px', borderRadius: '7px',
                            border: `1px solid ${t.inputBorder}`,
                            background: midCopied ? 'rgba(16,185,129,0.1)' : t.surface,
                            color: midCopied ? '#10b981' : t.textMuted,
                            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s',
                          }}
                        >
                          {midCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '5px' }}>
                        Share this ID with your software provider to get a license key.
                      </p>
                    </div>

                    {/* Activation key input */}
                    <div>
                      <p style={{ color: t.textMuted, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        {isActive ? 'Update License Key' : 'Enter Activation Key'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          value={licenseKey}
                          onChange={(e) => { setLicenseKey(e.target.value); setLicenseMsg(null) }}
                          onKeyDown={(e) => e.key === 'Enter' && licenseKey.trim() && activateMut.mutate({ key: licenseKey.trim() })}
                          placeholder="MKJRNL-…"
                          spellCheck={false}
                          style={{
                            flex: 1,
                            background: t.inputBg,
                            border: `1px solid ${licenseMsg && !licenseMsg.ok ? '#ef4444' : t.inputBorder}`,
                            borderRadius: '10px', padding: '10px 13px',
                            color: t.text, fontSize: '12px', fontFamily: 'monospace',
                            outline: 'none', boxSizing: 'border-box' as const,
                            letterSpacing: '0.3px', transition: 'border-color 0.15s',
                          }}
                        />
                        <button
                          onClick={() => licenseKey.trim() && activateMut.mutate({ key: licenseKey.trim() })}
                          disabled={!licenseKey.trim() || activateMut.isPending}
                          style={{
                            flexShrink: 0, padding: '10px 16px', borderRadius: '10px',
                            border: 'none', background: 'var(--primary)', color: '#fff',
                            fontSize: '12px', fontWeight: 700, cursor: !licenseKey.trim() || activateMut.isPending ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                            opacity: !licenseKey.trim() || activateMut.isPending ? 0.6 : 1,
                            transition: 'opacity 0.15s', whiteSpace: 'nowrap',
                          }}
                        >
                          {activateMut.isPending ? 'Verifying…' : 'Activate'}
                        </button>
                      </div>
                      {licenseMsg && (
                        <p style={{
                          marginTop: '8px', fontSize: '12px',
                          color: licenseMsg.ok ? '#10b981' : '#ef4444',
                          background: licenseMsg.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                          border: `1px solid ${licenseMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                          borderRadius: '8px', padding: '7px 11px',
                        }}>
                          {licenseMsg.ok ? '✅ ' : '❌ '}{licenseMsg.text}
                        </p>
                      )}
                    </div>

                  </div>
                )
              })() : (
                <p style={{ color: t.textFaint, fontSize: '13px' }}>Loading license info…</p>
              )}
            </Section>
          </div>
        )}

        {/* ── GROUP: About ───────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <GroupLabel label="About" t={t} />

          <Section title="Application" t={t}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
                background: 'linear-gradient(135deg,var(--primary-light),var(--primary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 20px var(--primary-35)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
              </div>
              <div>
                <p style={{ color: t.text, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                  Easy<span style={{ color: 'var(--primary-light)' }}>POS</span>
                </p>
                <p style={{ color: t.textMuted, fontSize: '12px', marginTop: '2px' }}>Version {APP_VERSION}</p>
              </div>
            </div>
          </Section>
        </div>

      </div>
    </div>
  )
}
