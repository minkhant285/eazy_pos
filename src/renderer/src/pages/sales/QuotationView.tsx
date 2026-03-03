import React, { useRef } from 'react'
import { toPng } from 'html-to-image'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { trpc } from '../../trpc-client/trpc'

interface QuotationViewProps {
  saleId: string
  onClose: () => void
  onConfirm?: () => void
  onReadyToShip?: () => void
  onShip?: () => void
  onReturn?: () => void
  onDelete?: () => void
  onEdit?: () => void
  onReprocess?: () => void
  isConfirmPending?: boolean
  isReadyToShipPending?: boolean
  isShipPending?: boolean
  isReturnPending?: boolean
  isDeletePending?: boolean
  isReprocessPending?: boolean
  actionError?: string | null
}

const STATUS_COLOR: Record<string, string> = {
  processing:    '#3b82f6',
  confirmed:     '#10b981',
  ready_to_ship: '#8b5cf6',
  shipped:       '#06b6d4',
  returned:      '#f59e0b',
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash on Delivery',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  qr_code: 'QR / Bank Transfer',
  store_credit: 'Store Credit',
  loyalty_points: 'Loyalty Points',
}

export const QuotationView: React.FC<QuotationViewProps> = ({
  saleId, onClose, onConfirm, onReadyToShip, onShip, onReturn, onDelete, onEdit, onReprocess,
  isConfirmPending, isReadyToShipPending, isShipPending, isReturnPending, isDeletePending, isReprocessPending, actionError,
}) => {
  const t = useAppStore((s) => s.theme)
  const sym = useAppStore((s) => s.currency.symbol)
  const quotationRef = useRef<HTMLDivElement>(null)

  const { data: sale, isLoading } = trpc.sale.getById.useQuery({ id: saleId })

  const customerId = (sale as any)?.customerId
  const { data: addressData } = trpc.customerAddress.list.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId },
  )
  const addresses = addressData ?? []
  const deliveryAddress = addresses.find((a: any) => a.id === (sale as any)?.deliveryAddressId)

  const onlineStatus = (sale as any)?.onlineStatus as string | undefined
  const canConfirm     = onlineStatus === 'processing'
  const canReadyToShip = onlineStatus === 'confirmed'
  const canShip        = onlineStatus === 'ready_to_ship'
  const canReturn      = onlineStatus === 'confirmed' || onlineStatus === 'ready_to_ship' || onlineStatus === 'shipped'
  const canReprocess   = onlineStatus === 'returned'

  const handleDownload = async () => {
    if (!quotationRef.current) return
    try {
      const dataUrl = await toPng(quotationRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `order-${(sale as any)?.receiptNo ?? saleId}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('PNG export error', e)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: '520px', margin: '0 16px',
          background: t.surface, border: `1px solid ${t.borderStrong}`,
          borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          overflow: 'hidden', animation: 'slideUp 0.22s ease',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header actions */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Icon name="download" size={13} />
            Download PNG
          </button>

          {canConfirm && onConfirm && (
            <button
              onClick={onConfirm}
              disabled={isConfirmPending}
              style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isConfirmPending ? 0.7 : 1 }}
            >
              {isConfirmPending ? 'Confirming…' : 'Confirm Order'}
            </button>
          )}
          {canReadyToShip && onReadyToShip && (
            <button
              onClick={onReadyToShip}
              disabled={isReadyToShipPending}
              style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#8b5cf6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isReadyToShipPending ? 0.7 : 1 }}
            >
              {isReadyToShipPending ? 'Moving…' : 'Ready to Ship'}
            </button>
          )}
          {canShip && onShip && (
            <button
              onClick={onShip}
              disabled={isShipPending}
              style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#06b6d4', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isShipPending ? 0.7 : 1 }}
            >
              {isShipPending ? 'Shipping…' : 'Ship Order'}
            </button>
          )}
          {canReturn && onReturn && (
            <button
              onClick={onReturn}
              disabled={isReturnPending}
              style={{ padding: '7px 14px', borderRadius: '10px', border: '1.5px solid #f59e0b', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isReturnPending ? 0.7 : 1 }}
            >
              {isReturnPending ? 'Returning…' : 'Return Order'}
            </button>
          )}
          {canConfirm && onEdit && (
            <button
              onClick={onEdit}
              style={{ padding: '7px 14px', borderRadius: '10px', border: `1.5px solid var(--primary)`, background: 'var(--primary-10)', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Edit Order
            </button>
          )}
          {canConfirm && onDelete && (
            <button
              onClick={onDelete}
              disabled={isDeletePending}
              style={{ padding: '7px 14px', borderRadius: '10px', border: '1.5px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isDeletePending ? 0.7 : 1 }}
            >
              {isDeletePending ? 'Deleting…' : 'Delete Order'}
            </button>
          )}
          {canReprocess && onReprocess && (
            <button
              onClick={onReprocess}
              disabled={isReprocessPending}
              style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isReprocessPending ? 0.7 : 1 }}
            >
              {isReprocessPending ? 'Moving…' : 'Move to Processing'}
            </button>
          )}
          {canReprocess && onDelete && (
            <button
              onClick={onDelete}
              disabled={isDeletePending}
              style={{ padding: '7px 14px', borderRadius: '10px', border: '1.5px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isDeletePending ? 0.7 : 1 }}
            >
              {isDeletePending ? 'Deleting…' : 'Delete Order'}
            </button>
          )}

          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Error banner */}
        {actionError && (
          <div style={{ padding: '10px 18px', background: 'rgba(239,68,68,0.1)', borderBottom: `1px solid rgba(239,68,68,0.25)`, flexShrink: 0 }}>
            <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>{actionError}</p>
          </div>
        )}

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', justifyContent: 'center' }}>
          {isLoading ? (
            <p style={{ color: t.textFaint, fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>Loading…</p>
          ) : !sale ? (
            <p style={{ color: t.textFaint, fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>Order not found</p>
          ) : (
            /* Quotation card — ref for PNG export */
            <div
              ref={quotationRef}
              style={{
                width: '400px', background: '#ffffff', borderRadius: '12px',
                border: '1px solid #e2e8f0', fontFamily: 'DM Sans, sans-serif',
                overflow: 'hidden', color: '#1e293b',
              }}
            >
              {/* Card header */}
              <div style={{ background: '#1e293b', padding: '18px 20px' }}>
                <p style={{ color: '#ffffff', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.3px' }}>Easy POS — Order Quotation</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>#{(sale as any).receiptNo}</p>
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>{new Date((sale as any).createdAt).toLocaleDateString()}</p>
                </div>
                {onlineStatus && (
                  <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COLOR[onlineStatus] ?? '#94a3b8' }} />
                    <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize' }}>{onlineStatus}</span>
                  </div>
                )}
              </div>

              {/* Customer info */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Customer</p>
                <p style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{(sale as any).customerName ?? 'Walk-in'}</p>
                {(sale as any).customerPhone && (
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{(sale as any).customerPhone}</p>
                )}
              </div>

              {/* Items */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 72px', gap: '4px', marginBottom: '8px' }}>
                  {['Item', 'Qty', 'Total'].map((h) => (
                    <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h !== 'Item' ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {((sale as any).items ?? []).map((item: any, i: number) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 72px', gap: '4px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        {item.productImageUrl ? (
                          <img
                            src={item.productImageUrl}
                            alt={item.productName ?? ''}
                            style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, border: '1px solid #e2e8f0' }}
                          />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '14px' }}>📦</span>
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>{item.productName ?? '—'}</p>
                          <p style={{ fontSize: '11px', color: '#94a3b8' }}>{sym}{Number(item.unitPrice).toLocaleString()} each</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#475569', textAlign: 'right' }}>{item.qty}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>
                        {sym}{(Number(item.qty) * Number(item.unitPrice) - Number(item.discountAmount ?? 0)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div style={{ padding: '14px 20px' }}>
                {[
                  ['Subtotal', `${sym}${Number((sale as any).subtotal ?? 0).toLocaleString()}`],
                  ['Discount', `−${sym}${Number((sale as any).discountAmount ?? 0).toLocaleString()}`],
                  ...(Number((sale as any).deliveryFee ?? 0) > 0
                    ? [['Delivery Fee', `${sym}${Number((sale as any).deliveryFee).toLocaleString()}`]]
                    : []),
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{label}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{val}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>TOTAL</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>{sym}{Number((sale as any).totalAmount ?? 0).toLocaleString()}</span>
                </div>
                {/* Payment method */}
                {(sale as any).payments?.length > 0 && (() => {
                  const pay = (sale as any).payments[0]
                  const label = pay.method === 'qr_code' && pay.reference
                    ? pay.reference.split(': ')[0]
                    : METHOD_LABELS[pay.method] ?? pay.method
                  return (
                    <p style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                      Payment: <span style={{ fontWeight: 600, color: '#475569' }}>{label}</span>
                    </p>
                  )
                })()}
              </div>

              {/* Delivery info — at the bottom */}
              {(deliveryAddress || (sale as any).deliveryMethodName) && (
                <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {deliveryAddress && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px' }}>📍</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{(deliveryAddress as any).receiverName}</span>
                        {(deliveryAddress as any).phoneNumber && (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{(deliveryAddress as any).phoneNumber}</span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748b', paddingLeft: '18px' }}>{(deliveryAddress as any).detailAddress}</p>
                    </>
                  )}
                  {(sale as any).deliveryMethodName && (
                    <p style={{ fontSize: '11px', color: '#475569', paddingLeft: deliveryAddress ? '18px' : 0 }}>
                      🚚 <span style={{ fontWeight: 600, color: '#1e293b' }}>{(sale as any).deliveryMethodName}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
