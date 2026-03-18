import React from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { trpc } from '../../trpc-client/trpc'

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
  customerId: string | null
  deliveryAddressId?: string | null
  deliveryMethodId?: string | null
  deliveryMethodName?: string | null
  deliveryMethodLogo?: string | null
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
  selectedAddressId?: string
  onClose: () => void
  onNewSale?: () => void
}

const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const VoucherView: React.FC<Props> = ({ sale, selectedAddressId, onClose, onNewSale }) => {
  const t = useAppStore((s) => s.theme)
  const sym = useAppStore((s) => s.currency.symbol)

  // Fetch customer addresses if customer is attached to this sale
  const { data: addresses = [] } = trpc.customerAddress.list.useQuery(
    { customerId: sale.customerId! },
    { enabled: !!sale.customerId },
  )
  const addrList = addresses as any[]
  const resolvedId = sale.deliveryAddressId ?? selectedAddressId
  const defaultAddress = resolvedId
    ? (addrList.find((a) => a.id === resolvedId) ?? addrList.find((a) => a.isDefault) ?? addrList[0] ?? null)
    : (addrList.find((a) => a.isDefault) ?? addrList[0] ?? null)

  const buildReceiptHtml = () => {
    const debtAmount = sale.totalAmount - sale.paidAmount
    const isCredit = debtAmount > 0

    const itemsHtml = sale.items.map(item => `
      <div style="margin-bottom:7px;">
        <div class="row">
          <span class="item-name">${esc(item.productName)}</span>
          <span class="item-price">${esc(sym)}${Number(item.totalAmount).toLocaleString()}</span>
        </div>
        <span style="color:#6b7280;font-size:10px;">${item.qty} &times; ${esc(sym)}${Number(item.unitPrice).toLocaleString()}${item.discountAmount > 0 ? ` (&minus;${esc(sym)}${Number(item.discountAmount).toLocaleString()})` : ''}</span>
      </div>
    `).join('')

    const paymentsHtml = sale.payments.map(pay => `
      <div class="row">
        <span style="color:#6b7280;font-size:11px;">
          ${pay.method === 'qr_code' && pay.reference ? esc(pay.reference.split(': ')[0]) : esc(METHOD_LABELS[pay.method] ?? pay.method)}
          ${isCredit ? ' (Deposit)' : ''}
        </span>
        <span style="font-size:11px;font-weight:600;">${esc(sym)}${Number(pay.amount).toLocaleString()}</span>
      </div>
    `).join('')

    const addressHtml = defaultAddress ? `
      <div class="divider"></div>
      <div style="border:1px dashed #888;border-radius:4px;padding:8px 10px;margin:8px 0;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:5px;">Deliver to</div>
        <div style="font-weight:700;font-size:13px;margin-bottom:2px;">${esc(defaultAddress.receiverName)}</div>
        <div style="font-size:11px;color:#374151;margin-bottom:2px;">${esc(defaultAddress.phoneNumber)}</div>
        <div style="font-size:11px;color:#374151;line-height:1.4;">${esc(defaultAddress.detailAddress)}</div>
      </div>
    ` : ''

    const deliveryHtml = sale.deliveryMethodName ? `
      <div class="divider"></div>
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:2px;">Delivery via</div>
      <div style="font-size:12px;font-weight:700;">${esc(sale.deliveryMethodName)}</div>
    ` : ''

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${esc(sale.receiptNo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 12px; color: #000; background: #fff; }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #888; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .item-name { flex: 1; margin-right: 8px; }
    .item-price { white-space: nowrap; font-weight: 700; }
    .total-row { font-size: 15px; font-weight: 900; border-top: 1px solid #ccc; padding-top: 7px; margin-top: 4px; }
    @media print { body { width: 80mm; } }
  </style>
</head>
<body>
  <div class="center" style="margin-bottom:14px;">
    <div style="font-size:18px;font-weight:900;">Easy POS</div>
    ${sale.locationName ? `<div style="color:#6b7280;font-size:11px;margin-top:3px;">${esc(sale.locationName)}</div>` : ''}
  </div>
  <div class="divider"></div>
  <div style="margin-bottom:12px;">
    ${[['Receipt #', sale.receiptNo], ['Date', new Date(sale.createdAt).toLocaleString()], ['Cashier', sale.cashierName ?? '—'], ['Customer', sale.customerName ?? 'Walk-in']].map(([l, v]) => `
    <div class="row"><span style="color:#6b7280;font-size:11px;">${esc(l)}</span><span style="font-size:11px;font-weight:600;">${esc(v)}</span></div>
    `).join('')}
  </div>
  <div class="divider"></div>
  <div style="margin-bottom:12px;">${itemsHtml}</div>
  <div class="divider"></div>
  <div style="margin-bottom:10px;">
    <div class="row"><span style="color:#6b7280;font-size:11px;">Subtotal</span><span style="font-size:11px;">${esc(sym)}${Number(sale.subtotal).toLocaleString()}</span></div>
    ${sale.discountAmount > 0 ? `<div class="row"><span style="color:#6b7280;font-size:11px;">Discount</span><span style="color:#991b1b;font-size:11px;">&minus;${esc(sym)}${Number(sale.discountAmount).toLocaleString()}</span></div>` : ''}
    ${sale.taxAmount > 0 ? `<div class="row"><span style="color:#6b7280;font-size:11px;">Tax</span><span style="font-size:11px;">${esc(sym)}${Number(sale.taxAmount).toLocaleString()}</span></div>` : ''}
    <div class="row total-row">
      <span>TOTAL</span>
      <span>${esc(sym)}${Number(sale.totalAmount).toLocaleString()}</span>
    </div>
  </div>
  <div class="divider"></div>
  <div>
    ${isCredit ? `<div style="font-size:9px;font-weight:800;color:#991b1b;border:1px solid #fca5a5;display:inline-block;padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Credit Sale</div>` : ''}
    ${paymentsHtml}
    ${isCredit ? `<div class="row" style="border:1px solid #fca5a5;border-radius:4px;padding:5px 8px;margin-top:3px;"><span style="color:#991b1b;font-size:11px;font-weight:700;">Outstanding Debt</span><span style="color:#991b1b;font-size:12px;font-weight:800;">${esc(sym)}${debtAmount.toLocaleString()}</span></div>` : ''}
    ${sale.changeAmount > 0 ? `<div class="row"><span style="color:#6b7280;font-size:11px;">Change</span><span style="color:#166534;font-size:11px;font-weight:700;">${esc(sym)}${Number(sale.changeAmount).toLocaleString()}</span></div>` : ''}
  </div>
  ${addressHtml}
  ${deliveryHtml}
  <div class="divider" style="margin-top:14px;"></div>
  <div class="center" style="color:#9ca3af;font-size:10px;">Thank you for your purchase!</div>
</body>
</html>`
  }

  const buildLabelHtml = () => {
    if (!defaultAddress) return ''
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Address Label</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 24px; color: #000; background: #fff; }
    .label { border: 2px solid #000; border-radius: 8px; padding: 20px 24px; max-width: 340px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="label">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:10px;">Deliver To</div>
    <div style="font-size:20px;font-weight:900;margin-bottom:6px;">${esc(defaultAddress.receiverName)}</div>
    <div style="font-size:15px;font-weight:600;color:#333;margin-bottom:8px;">${esc(defaultAddress.phoneNumber)}</div>
    <div style="font-size:13px;color:#444;line-height:1.6;">${esc(defaultAddress.detailAddress)}</div>
    <div style="font-size:10px;color:#888;margin-top:14px;border-top:1px dashed #ccc;padding-top:8px;">Receipt: ${esc(sale.receiptNo)}</div>
  </div>
</body>
</html>`
  }

  const handlePrint = async () => {
    const html = buildReceiptHtml()
    await window.printApi.printReceipt(html)
  }

  const handlePrintLabel = async () => {
    if (!defaultAddress) return
    const html = buildLabelHtml()
    await window.printApi.printReceipt(html)
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
            {defaultAddress && (
              <button onClick={handlePrintLabel} style={{ ...btnBase, background: t.inputBg, color: t.textMuted }}>
                Print Label
              </button>
            )}
            <button onClick={handlePrint} style={{ ...btnBase, background: 'var(--primary)', color: '#fff' }}>
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
          <div>

            {/* Store name */}
            <div className="center" style={{ textAlign: 'center', marginBottom: '14px' }}>
              <p className="store-name" style={{ color: t.text, fontWeight: 900, fontSize: '18px' }}>Easy POS</p>
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
                <span style={{ color: 'var(--primary)', fontSize: '17px', fontWeight: 900 }}>{sym}{Number(sale.totalAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="divider" style={{ borderTop: `1px dashed ${t.border}`, margin: '10px 0' }} />

            {/* Payments */}
            {(() => {
              const debtAmount = sale.totalAmount - sale.paidAmount
              const isCredit = debtAmount > 0
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {isCredit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', padding: '2px 7px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credit Sale</span>
                    </div>
                  )}
                  {sale.payments.map((pay, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: t.textMuted, fontSize: '11px' }}>
                        {pay.method === 'qr_code' && pay.reference
                          ? pay.reference.split(': ')[0]
                          : METHOD_LABELS[pay.method] ?? pay.method}
                        {isCredit ? ' (Deposit)' : ''}
                      </span>
                      <span style={{ color: t.text, fontSize: '11px', fontWeight: 600 }}>{sym}{Number(pay.amount).toLocaleString()}</span>
                    </div>
                  ))}
                  {isCredit && (
                    <div className="credit-debt-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: '7px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>Outstanding Debt</span>
                      <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 800 }}>{sym}{debtAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {sale.changeAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: t.textMuted, fontSize: '11px' }}>Change</span>
                      <span className="green" style={{ color: '#10b981', fontSize: '11px', fontWeight: 700 }}>{sym}{Number(sale.changeAmount).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Delivery address */}
            {defaultAddress && (
              <>
                <div className="divider" style={{ borderTop: `1px dashed ${t.border}`, margin: '10px 0' }} />
                <div className="addr-block" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="addr-title" style={{ color: t.textFaint, fontSize: '10px', marginBottom: '3px' }}>Deliver to</span>
                  <span className="addr-name" style={{ color: t.text, fontSize: '12px', fontWeight: 700 }}>{defaultAddress.receiverName}</span>
                  <span className="addr-phone" style={{ color: t.textMuted, fontSize: '11px' }}>{defaultAddress.phoneNumber}</span>
                  <span className="addr-detail" style={{ color: t.textMuted, fontSize: '11px', lineHeight: 1.5 }}>{defaultAddress.detailAddress}</span>
                </div>
              </>
            )}

            {/* Delivery provider */}
            {sale.deliveryMethodName && (
              <>
                <div className="divider" style={{ borderTop: `1px dashed ${t.border}`, margin: '10px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {sale.deliveryMethodLogo && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: '#fff', border: `1px solid ${t.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={sale.deliveryMethodLogo} alt={sale.deliveryMethodName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '3px' }} />
                    </div>
                  )}
                  <div>
                    <p style={{ color: t.textFaint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Delivery via</p>
                    <p style={{ color: t.text, fontSize: '12px', fontWeight: 700 }}>{sale.deliveryMethodName}</p>
                  </div>
                </div>
              </>
            )}

            <div className="divider" style={{ borderTop: `1px dashed ${t.border}`, margin: '14px 0 6px' }} />
            <p className="center" style={{ color: t.textFaint, fontSize: '10px', textAlign: 'center' }}>Thank you for your purchase!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
