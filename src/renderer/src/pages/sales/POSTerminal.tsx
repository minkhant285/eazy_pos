import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { trpc } from '../../trpc-client/trpc'
import type { SaleDetail } from './VoucherView'

// ── Types ─────────────────────────────────────────────────────

type CartLine = {
  productId: string
  name: string
  sku: string
  qty: number
  unitPrice: number
  taxRate: number
  discountAmount: number
}

type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'qr_code' | 'store_credit'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Card' },
  { value: 'debit_card', label: 'Debit' },
  { value: 'qr_code', label: 'QR' },
  { value: 'store_credit', label: 'Credit' },
]

interface Props {
  onComplete: (sale: SaleDetail) => void
}

// ── Component ─────────────────────────────────────────────────

export const POSTerminal: React.FC<Props> = ({ onComplete }) => {
  const t = useAppStore((s) => s.theme)

  // ── Setup ──
  const [locationId, setLocationId] = useState('')
  const [cashierId, setCashierId] = useState('')

  // ── Cart ──
  const [cart, setCart] = useState<CartLine[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [headerDiscount, setHeaderDiscount] = useState('')
  const [notes, setNotes] = useState('')

  // ── Customer ──
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [selectedCustomerName, setSelectedCustomerName] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDrop, setShowCustomerDrop] = useState(false)

  // ── Payment ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')

  // ── Queries ──
  const { data: locData } = trpc.location.list.useQuery({ pageSize: 100, isActive: true })
  const { data: usrData } = trpc.user.list.useQuery({ pageSize: 100, isActive: true })
  const { data: prodData } = trpc.product.list.useQuery(
    { search: productSearch || undefined, pageSize: 24, isActive: true },
  )
  const { data: custData } = trpc.customer.list.useQuery(
    { search: customerSearch, pageSize: 8, isActive: true },
    { enabled: customerSearch.length >= 2 },
  )

  const locations = locData?.data ?? []
  const users = usrData?.data ?? []
  const products = prodData?.data ?? []
  const customers = custData?.data ?? []

  // ── Computed totals ──
  const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const discountNum = Math.max(0, Number(headerDiscount) || 0)
  const taxTotal = cart.reduce((s, l) => s + (l.qty * l.unitPrice - l.discountAmount) * l.taxRate, 0)
  const grandTotal = Math.max(0, subtotal - discountNum + taxTotal)
  const receivedNum = Number(cashReceived) || 0
  const change = paymentMethod === 'cash' ? receivedNum - grandTotal : 0

  // ── Cart actions ──
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        return prev.map((l) => l.productId === product.id ? { ...l, qty: l.qty + 1 } : l)
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        qty: 1,
        unitPrice: Number(product.sellingPrice),
        taxRate: Number(product.taxRate ?? 0),
        discountAmount: 0,
      }]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.productId !== productId))
    } else {
      setCart((prev) => prev.map((l) => l.productId === productId ? { ...l, qty } : l))
    }
  }

  const resetCart = () => {
    setCart([])
    setHeaderDiscount('')
    setNotes('')
    setCashReceived('')
    setCustomerId(null)
    setSelectedCustomerName('')
    setCustomerSearch('')
  }

  // ── Mutation ──
  const createSale = trpc.sale.create.useMutation({
    onSuccess: (data) => {
      if (data) {
        resetCart()
        onComplete(data as unknown as SaleDetail)
      }
    },
  })

  const handleCharge = () => {
    if (!locationId || !cashierId) { alert('Please select a location and cashier first.'); return }
    if (cart.length === 0) { alert('Cart is empty.'); return }
    if (paymentMethod === 'cash' && receivedNum < grandTotal) { alert('Cash received is less than the total amount.'); return }

    const paymentAmount = paymentMethod === 'cash' ? receivedNum : grandTotal
    createSale.mutate({
      locationId,
      cashierId,
      customerId: customerId ?? undefined,
      items: cart.map((l) => ({
        productId: l.productId,
        qty: l.qty,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount || undefined,
      })),
      payments: [{ method: paymentMethod, amount: paymentAmount }],
      discountAmount: discountNum || undefined,
      notes: notes || undefined,
    })
  }

  const isSetupDone = locationId && cashierId
  const canCharge = Boolean(
    isSetupDone &&
    cart.length > 0 &&
    !createSale.isPending &&
    (paymentMethod !== 'cash' || receivedNum >= grandTotal)
  )

  // ── Shared styles ──
  const inputStyle: React.CSSProperties = {
    background: t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: '10px',
    padding: '8px 12px',
    color: t.text,
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  }

  const smInputStyle: React.CSSProperties = {
    ...inputStyle,
    padding: '5px 8px',
    fontSize: '12px',
    textAlign: 'right',
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Setup bar ── */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '12px 16px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
          <span style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>Location</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={{ ...selectStyle }}>
            <option value="">Select...</option>
            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
          <span style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>Cashier</span>
          <select value={cashierId} onChange={(e) => setCashierId(e.target.value)} style={{ ...selectStyle }}>
            <option value="">Select...</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {!isSetupDone && (
          <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600 }}>
            ⚠ Select location & cashier to begin
          </span>
        )}
        {isSetupDone && (
          <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600, marginLeft: 'auto' }}>
            ✓ Ready
          </span>
        )}
      </div>

      {/* ── Main POS area ── */}
      <div style={{ display: 'flex', gap: '14px' }}>

        {/* ── Left: Product grid ── */}
        <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search products by name or SKU..."
            style={inputStyle}
          />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))',
            gap: '8px',
            maxHeight: '58vh',
            overflowY: 'auto',
            alignContent: 'start',
            paddingBottom: '4px',
          }}>
            {products.map((p: any) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: '12px',
                  padding: '12px 11px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = t.surfaceHover }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.surface }}
              >
                <p style={{ color: t.text, fontSize: '12px', fontWeight: 600, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <p style={{ color: t.textFaint, fontSize: '10px', marginBottom: '7px' }}>{p.sku}</p>
                <p style={{ color: '#7c3aed', fontSize: '14px', fontWeight: 800 }}>฿{Number(p.sellingPrice).toLocaleString()}</p>
              </button>
            ))}
            {products.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>
                {productSearch ? 'No products found' : 'Loading...'}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart + Payment ── */}
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Customer */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '12px 14px' }}>
            <p style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Customer</p>
            <div style={{ position: 'relative' }}>
              {customerId ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: t.inputBg, borderRadius: '10px', border: `1px solid ${t.inputBorder}` }}>
                  <span style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{selectedCustomerName}</span>
                  <button
                    onClick={() => { setCustomerId(null); setSelectedCustomerName(''); setCustomerSearch('') }}
                    style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 0 0 8px' }}
                  >×</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDrop(true) }}
                    onFocus={() => setShowCustomerDrop(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDrop(false), 150)}
                    placeholder="Walk-in (type to search)"
                    style={inputStyle}
                  />
                  {showCustomerDrop && customers.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', marginTop: '4px', zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                      {customers.map((c: any) => (
                        <button
                          key={c.id}
                          onMouseDown={() => { setCustomerId(c.id); setSelectedCustomerName(c.name); setCustomerSearch(''); setShowCustomerDrop(false) }}
                          style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', borderBottom: `1px solid ${t.borderMid}`, fontFamily: 'inherit' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = t.surfaceHover }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                        >
                          <p style={{ color: t.text, fontSize: '12px', fontWeight: 600 }}>{c.name}</p>
                          <p style={{ color: t.textFaint, fontSize: '10px' }}>{c.phone ?? c.email ?? '—'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Cart */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <p style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cart {cart.length > 0 ? `(${cart.length})` : ''}
              </p>
              {cart.length > 0 && (
                <button onClick={resetCart} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear
                </button>
              )}
            </div>
            <div style={{ maxHeight: '28vh', overflowY: 'auto' }}>
              {cart.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: t.textFaint, fontSize: '12px' }}>
                  <Icon name="sale" size={22} style={{ display: 'block', margin: '0 auto 6px', color: t.textFaint }} />
                  Click a product to add
                </div>
              ) : (
                cart.map((line) => (
                  <div key={line.productId} style={{ padding: '9px 14px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: t.text, fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.name}</p>
                      <p style={{ color: t.textFaint, fontSize: '10px' }}>฿{line.unitPrice.toLocaleString()}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <button onClick={() => updateQty(line.productId, line.qty - 1)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: t.inputBg, color: t.text, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>−</button>
                      <span style={{ color: t.text, fontSize: '12px', fontWeight: 700, minWidth: '22px', textAlign: 'center' }}>{line.qty}</span>
                      <button onClick={() => updateQty(line.productId, line.qty + 1)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: t.inputBg, color: t.text, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>+</button>
                    </div>
                    <span style={{ color: t.text, fontSize: '12px', fontWeight: 700, minWidth: '58px', textAlign: 'right' }}>฿{(line.qty * line.unitPrice).toLocaleString()}</span>
                    <button onClick={() => updateQty(line.productId, 0)} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0', flexShrink: 0 }}>×</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals + Payment */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '14px' }}>

            {/* Discount row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: t.textMuted, fontSize: '12px' }}>Discount (฿)</span>
              <input
                type="number"
                min="0"
                value={headerDiscount}
                onChange={(e) => setHeaderDiscount(e.target.value)}
                placeholder="0"
                style={{ ...smInputStyle, width: '90px' }}
              />
            </div>

            {/* Summary rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px', borderTop: `1px solid ${t.borderMid}`, marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: t.textMuted, fontSize: '12px' }}>Subtotal</span>
                <span style={{ color: t.textMuted, fontSize: '12px' }}>฿{subtotal.toLocaleString()}</span>
              </div>
              {discountNum > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted, fontSize: '12px' }}>Discount</span>
                  <span style={{ color: '#ef4444', fontSize: '12px' }}>−฿{discountNum.toLocaleString()}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted, fontSize: '12px' }}>Tax</span>
                  <span style={{ color: t.textMuted, fontSize: '12px' }}>฿{taxTotal.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px solid ${t.borderMid}`, marginTop: '4px' }}>
                <span style={{ color: t.text, fontSize: '15px', fontWeight: 900 }}>TOTAL</span>
                <span style={{ color: '#7c3aed', fontSize: '18px', fontWeight: 900 }}>฿{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment method tabs */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  style={{
                    padding: '5px 10px', borderRadius: '8px', border: 'none',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    background: paymentMethod === m.value ? '#7c3aed' : t.inputBg,
                    color: paymentMethod === m.value ? '#fff' : t.textMuted,
                    transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Cash received + change */}
            {paymentMethod === 'cash' && (
              <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: t.textMuted, fontSize: '12px' }}>Cash Received</span>
                  <input
                    type="number"
                    min="0"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    style={{ ...smInputStyle, width: '110px' }}
                  />
                </div>
                {receivedNum > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: t.textMuted, fontSize: '12px' }}>Change</span>
                    <span style={{ color: change >= 0 ? '#10b981' : '#ef4444', fontSize: '14px', fontWeight: 800 }}>
                      ฿{change.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              style={{ ...inputStyle, marginBottom: '10px', fontSize: '12px', padding: '6px 10px' }}
            />

            {/* Charge button */}
            <button
              onClick={handleCharge}
              disabled={!canCharge}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: canCharge ? '#7c3aed' : t.inputBg,
                color: canCharge ? '#fff' : t.textFaint,
                fontSize: '15px',
                fontWeight: 900,
                cursor: canCharge ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                letterSpacing: '-0.3px',
              }}
            >
              {createSale.isPending ? 'Processing...' : `Charge ฿${grandTotal.toLocaleString()}`}
            </button>

            {createSale.isError && (
              <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
                {(createSale.error as any)?.message ?? 'Sale failed. Please try again.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
