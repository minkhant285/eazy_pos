import React, { useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'

export type SaleItem = {
  id: string
  productName: string | null
  productSku: string | null
  qty: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

export type SalePayment = {
  id: string
  method: string
  amount: number
  reference: string | null
}

export type SaleDetail = {
  id: string
  receiptNo: string
  locationName: string | null
  customerName: string | null
  cashierName: string | null
  status: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  changeAmount: number
  notes: string | null
  createdAt: string
  items: SaleItem[]
  payments: SalePayment[]
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  qr_code: 'QR Code',
  store_credit: 'Store Credit',
  loyalty_points: 'Points',
}

interface Props {
  sale: SaleDetail
  onClose: () => void
  onNewSale?: () => void
}

export const VoucherView: React.FC<Props> = ({ sale, onClose, onNewSale }) => {
  const t = useAppStore((s) => s.theme)
  const sym = useAppStore((s) => s.currency.symbol)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? ''
    const win = window.open('', '_blank', 'width=420,height=700')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Receipt ${sale.receiptNo}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 12px; color: #000; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #888; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: 700; }
            .big { font-size: 16px; }
            .store-name { font-size: 18px; font-weight: 900; }
            .item-name { flex: 1; margin-right: 8px; }
            .item-price { white-space: nowrap; font-weight: 700; }
            .total-row { font-size: 15px; font-weight: 900; }
            .green { color: #166534; }
            .red { color: #991b1b; }
            .meta-label { color: #6b7280; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const btnBase = {
    borderRadius: '10px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '7px 16px',
  } as React.CSSProperties

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: '380px', margin: '0 16px',
          background: t.surface, border: `1px solid ${t.borderStrong}`,
          borderRadius: '20px', boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          overflow: 'hidden', animation: 'slideUp 0.22s ease',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Modal header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: t.text, fontWeight: 700, fontSize: '15px' }}>Receipt</h2>
            <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '2px' }}>{sale.receiptNo}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onNewSale && (
              <button onClick={() => { onClose(); onNewSale() }} style={{ ...btnBase, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                New Sale
              </button>
            )}
            <button onClick={handlePrint} style={{ ...btnBase, background: '#7c3aed', color: '#fff' }}>
              Print
            </button>
            <button
              onClick={onClose}
              style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        </div>

        {/* Receipt body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div ref={printRef}>

            {/* Store name */}
            <div className="center" style={{ textAlign: 'center', marginBottom: '14px' }}>
              <p className="store-name" style={{ color: t.text, fontWeight: 900, fontSize: '18px' }}>MKJournal POS</p>
              {sale.locationName && (
                <p style={{ color: t.textMuted, fontSize: '11px', marginTop: '3px' }}>{sale.locationName}</p>
              )}
            </div>

            <div className="divider" style={{ borderTop: `1px dashed ${t.border}`, margin: '10px 0' }} />

            {/* Meta info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
              {[
                ['Receipt #', sale.receiptNo],
                ['Date', new Date(sale.createdAt).toLocaleString()],
                ['Cashier', sale.cashierName ?? '—'],
                ['Customer', sale.customerName ?? 'Walk-in'],
              ].map(([label, val]) => (
                <div key={label} className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="meta-label" style={{ color: t.textFaint, fontSize: '11px' }}>{label}</span>
                  <span style={{ color: t.text, fontSize: '11px', fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="divider" style={{ borderTop: `1px dashed ${t.border}`, margin: '10px 0' }} />

            {/* Items */}
            <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {sale.items.map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="item-name" style={{ color: t.text, fontSize: '12px', fontWeight: 600, flex: 1, marginRight: '8px' }}>{item.productName ?? '—'}</span>
                    <span className="item-price" style={{ color: t.text, fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{sym}{Number(item.totalAmount).toLocaleString()}</span>
                  </div>
                  <span style={{ color: t.textFaint, fontSize: '10px' }}>
                    {item.qty} × {sym}{Number(item.unitPrice).toLocaleString()}
                    {item.discountAmount > 0 ? ` (−{sym}${Number(item.discountAmount).toLocaleString()})` : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="divider" style={{ borderTop: `1px dashed ${t.border}`, margin: '10px 0' }} />

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: t.textMuted, fontSize: '11px' }}>Subtotal</span>
                <span style={{ color: t.textMuted, fontSize: '11px' }}>{sym}{Number(sale.subtotal).toLocaleString()}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted, fontSize: '11px' }}>Discount</span>
                  <span style={{ color: '#ef4444', fontSize: '11px' }}>−{sym}{Number(sale.discountAmount).toLocaleString()}</span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted, fontSize: '11px' }}>Tax</span>
                  <span style={{ color: t.textMuted, fontSize: '11px' }}>{sym}{Number(sale.taxAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '7px', borderTop: `1px solid ${t.borderMid}`, marginTop: '4px' }}>
                <span style={{ color: t.text, fontSize: '15px', fontWeight: 900 }}>TOTAL</span>
                <span style={{ color: '#7c3aed', fontSize: '17px', fontWeight: 900 }}>{sym}{Number(sale.totalAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="divider" style={{ borderTop: `1px dashed ${t.border}`, margin: '10px 0' }} />

            {/* Payments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {sale.payments.map((pay, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted, fontSize: '11px' }}>{METHOD_LABELS[pay.method] ?? pay.method}</span>
                  <span style={{ color: t.text, fontSize: '11px', fontWeight: 600 }}>{sym}{Number(pay.amount).toLocaleString()}</span>
                </div>
              ))}
              {sale.changeAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted, fontSize: '11px' }}>Change</span>
                  <span className="green" style={{ color: '#10b981', fontSize: '11px', fontWeight: 700 }}>{sym}{Number(sale.changeAmount).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="divider" style={{ borderTop: `1px dashed ${t.border}`, margin: '14px 0 6px' }} />
            <p className="center" style={{ color: t.textFaint, fontSize: '10px', textAlign: 'center' }}>Thank you for your purchase!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
