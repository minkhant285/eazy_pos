import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { trpc } from '../../trpc-client/trpc'

type Step = 1 | 2 | 3

interface Done { id: string; name: string }

// ── small helper ─────────────────────────────────────────────
const slugify = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12) + '-' + Math.floor(Math.random() * 1000)

export const OnboardingPage: React.FC = () => {
  const t               = useAppStore((s) => s.theme)
  const setPage         = useAppStore((s) => s.setPage)
  const setOnboarding   = useAppStore((s) => s.setOnboardingDone)

  const [step, setStep] = useState<Step>(1)

  // per-step done state
  const [locDone,  setLocDone]  = useState<Done | null>(null)
  const [catDone,  setCatDone]  = useState<Done | null>(null)
  const [prodDone, setProdDone] = useState<Done | null>(null)

  // Step 1 — Location
  const [locName,    setLocName]    = useState('')
  const [locAddress, setLocAddress] = useState('')
  const [locErr,     setLocErr]     = useState('')

  // Step 2 — Category
  const [catName, setCatName] = useState('')
  const [catErr,  setCatErr]  = useState('')

  // Step 3 — Product
  const [prodName,    setProdName]    = useState('')
  const [prodCost,    setProdCost]    = useState('')
  const [prodSell,    setProdSell]    = useState('')
  const [prodErr,     setProdErr]     = useState('')

  // ── Mutations ────────────────────────────────────────────────
  const createLoc = trpc.location.create.useMutation({
    onSuccess: (loc) => {
      setLocDone({ id: loc!.id, name: loc!.name })
      setStep(2)
    },
    onError: (e) => setLocErr(e.message),
  })

  const createCat = trpc.category.create.useMutation({
    onSuccess: (cat) => {
      setCatDone({ id: cat!.id, name: cat!.name })
      setStep(3)
    },
    onError: (e) => setCatErr(e.message),
  })

  const createProd = trpc.product.create.useMutation({
    onSuccess: (p) => {
      setProdDone({ id: p!.id, name: p!.name })
      finish()
    },
    onError: (e) => setProdErr(e.message),
  })

  // ── Handlers ─────────────────────────────────────────────────
  const finish = () => {
    setOnboarding(true)
    setPage('dashboard')
  }

  const submitLocation = () => {
    setLocErr('')
    if (!locName.trim()) return setLocErr('Location name is required')
    createLoc.mutate({ name: locName.trim(), address: locAddress.trim() || undefined })
  }

  const submitCategory = () => {
    setCatErr('')
    if (!catName.trim()) return setCatErr('Category name is required')
    createCat.mutate({ name: catName.trim() })
  }

  const submitProduct = () => {
    setProdErr('')
    if (!prodName.trim())       return setProdErr('Product name is required')
    const cost = parseFloat(prodCost)
    const sell = parseFloat(prodSell)
    if (isNaN(cost) || cost < 0) return setProdErr('Valid cost price is required')
    if (isNaN(sell) || sell <= 0) return setProdErr('Valid selling price is required')
    createProd.mutate({
      name: prodName.trim(),
      sku: slugify(prodName.trim()),
      costPrice: cost,
      sellingPrice: sell,
      categoryId: catDone?.id || undefined,
    })
  }

  // ── Styles ───────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '10px',
    border: `1px solid ${t.inputBorder}`, background: t.inputBg,
    color: t.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    color: t.textMuted, fontSize: '11px', fontWeight: 600,
    display: 'block', marginBottom: '5px',
  }

  const stepsConfig = [
    { n: 1 as Step, label: 'Add Location',  done: !!locDone,  icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    { n: 2 as Step, label: 'Add Category',  done: !!catDone,  icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { n: 3 as Step, label: 'Add Product',   done: !!prodDone, icon: 'M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: t.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '500px',
        background: t.surface, border: `1px solid ${t.borderMid}`,
        borderRadius: '22px', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        animation: 'slideUp 0.25s ease',
      }}>

        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${t.borderMid}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
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
                Complete these steps to start selling
              </p>
            </div>
          </div>

          {/* Step indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {stepsConfig.map((s, i) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700,
                    background: s.done
                      ? '#10b981'
                      : step === s.n
                        ? 'var(--primary)'
                        : t.inputBg,
                    color: s.done || step === s.n ? '#fff' : t.textFaint,
                    border: `2px solid ${s.done ? '#10b981' : step === s.n ? 'var(--primary)' : t.inputBorder}`,
                    transition: 'all 0.2s',
                  }}>
                    {s.done
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : s.n}
                  </div>
                  <span style={{ color: step === s.n ? t.text : t.textFaint, fontSize: '11px', fontWeight: step === s.n ? 700 : 500, whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                {i < stepsConfig.length - 1 && (
                  <div style={{ flex: '0 0 24px', height: '2px', background: stepsConfig[i].done ? '#10b981' : t.borderMid, margin: '0 4px', borderRadius: '1px', transition: 'background 0.2s' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div style={{ padding: '24px 32px' }}>

          {/* ── STEP 1: Location ── */}
          {step === 1 && (
            <div style={{ animation: 'slideUp 0.2s ease' }}>
              <StepTitle icon={stepsConfig[0].icon} title="Add your first location" subtitle="A location represents your store or warehouse" t={t} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
                <div>
                  <label style={lbl}>Location Name *</label>
                  <input value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="e.g. Main Store, Branch 1" style={inp} autoFocus />
                </div>
                <div>
                  <label style={lbl}>Address <span style={{ color: t.textFaint, fontWeight: 400 }}>(optional)</span></label>
                  <input value={locAddress} onChange={(e) => setLocAddress(e.target.value)} placeholder="Street, City" style={inp} />
                </div>
                {locErr && <ErrBox msg={locErr} />}
              </div>
              <StepActions
                onNext={submitLocation} nextLabel="Save & Continue"
                onSkip={() => setStep(2)} skipLabel="Skip for now"
                pending={createLoc.isPending}
                onFinishLater={finish} t={t}
              />
            </div>
          )}

          {/* ── STEP 2: Category ── */}
          {step === 2 && (
            <div style={{ animation: 'slideUp 0.2s ease' }}>
              <StepTitle icon={stepsConfig[1].icon} title="Add a product category" subtitle="Categories help organize your products" t={t} />
              {locDone && <DoneBadge label={`Location: ${locDone.name}`} t={t} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
                <div>
                  <label style={lbl}>Category Name *</label>
                  <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Beverages, Electronics" style={inp} autoFocus />
                </div>
                {catErr && <ErrBox msg={catErr} />}
              </div>
              <StepActions
                onNext={submitCategory} nextLabel="Save & Continue"
                onSkip={() => setStep(3)} skipLabel="Skip for now"
                pending={createCat.isPending}
                onFinishLater={finish} t={t}
              />
            </div>
          )}

          {/* ── STEP 3: Product ── */}
          {step === 3 && (
            <div style={{ animation: 'slideUp 0.2s ease' }}>
              <StepTitle icon={stepsConfig[2].icon} title="Add your first product" subtitle="Add at least one product to start selling" t={t} />
              {locDone && <DoneBadge label={`Location: ${locDone.name}`} t={t} />}
              {catDone && <DoneBadge label={`Category: ${catDone.name}`} t={t} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
                <div>
                  <label style={lbl}>Product Name *</label>
                  <input value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="e.g. Coca-Cola 330ml" style={inp} autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={lbl}>Cost Price *</label>
                    <input type="number" min="0" step="0.01" value={prodCost} onChange={(e) => setProdCost(e.target.value)} placeholder="0.00" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Selling Price *</label>
                    <input type="number" min="0.01" step="0.01" value={prodSell} onChange={(e) => setProdSell(e.target.value)} placeholder="0.00" style={inp} />
                  </div>
                </div>
                {prodErr && <ErrBox msg={prodErr} />}
              </div>
              <StepActions
                onNext={submitProduct} nextLabel="Save & Finish"
                onSkip={finish} skipLabel="Skip for now"
                pending={createProd.isPending}
                isLast
                t={t}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 32px 20px', borderTop: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={finish}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textFaint, fontSize: '11px', fontFamily: 'inherit', textDecoration: 'underline' }}
          >
            I'll complete setup later
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────

const StepTitle: React.FC<{ icon: string; title: string; subtitle: string; t: any }> = ({ icon, title, subtitle, t }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
    <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'var(--primary-10)', border: '1px solid var(--primary-20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
    </div>
    <div>
      <p style={{ color: t.text, fontWeight: 700, fontSize: '14px' }}>{title}</p>
      <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '2px' }}>{subtitle}</p>
    </div>
  </div>
)

const DoneBadge: React.FC<{ label: string; t: any }> = ({ label, t }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '8px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600 }}>{label}</span>
  </div>
)

const ErrBox: React.FC<{ msg: string }> = ({ msg }) => (
  <p style={{ color: '#ef4444', fontSize: '11px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '7px 10px', border: '1px solid rgba(239,68,68,0.2)' }}>
    {msg}
  </p>
)

interface StepActionsProps {
  onNext: () => void; nextLabel: string
  onSkip: () => void; skipLabel: string
  pending: boolean
  isLast?: boolean
  onFinishLater?: () => void
  t: any
}

const StepActions: React.FC<StepActionsProps> = ({ onNext, nextLabel, onSkip, skipLabel, pending, t }) => (
  <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
    <button
      onClick={onSkip}
      style={{ flex: '0 0 auto', padding: '9px 16px', borderRadius: '10px', border: `1px solid ${t.inputBorder}`, background: 'transparent', color: t.textMuted, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      {skipLabel}
    </button>
    <button
      onClick={onNext}
      disabled={pending}
      style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1, fontFamily: 'inherit', transition: 'opacity 0.15s' }}
    >
      {pending ? 'Saving…' : nextLabel}
    </button>
  </div>
)
