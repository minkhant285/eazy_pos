import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { trpc } from '../../trpc-client/trpc'
import { POSTerminal } from './POSTerminal'
import { VoucherView, type SaleDetail } from './VoucherView'

// ── Constants ─────────────────────────────────────────────────

type SaleStatus = 'draft' | 'completed' | 'voided' | 'refunded' | 'partially_refunded'

const STATUS_COLORS: Record<SaleStatus, { bg: string; text: string }> = {
  draft:              { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
  completed:          { bg: 'rgba(16,185,129,0.15)',  text: '#10b981' },
  voided:             { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444' },
  refunded:           { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b' },
  partially_refunded: { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', credit_card: 'Credit Card', debit_card: 'Debit Card',
  qr_code: 'QR Code', store_credit: 'Store Credit', loyalty_points: 'Points',
}

type Tab = 'history' | 'pos'

// ── Sales History sub-component ───────────────────────────────

const SalesHistory: React.FC<{ onShowVoucher: (sale: SaleDetail) => void }> = ({ onShowVoucher }) => {
  const t = useAppStore((s) => s.theme)
  const tr = useAppStore((s) => s.tr)
  const sym = useAppStore((s) => s.currency.symbol)

  const [statusFilter, setStatusFilter] = useState<SaleStatus | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const PAGE_SIZE = 20

  const { data, isLoading } = trpc.sale.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })
  const sales = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(data?.totalPages ?? 1, 1)

  const { data: detail } = trpc.sale.getById.useQuery(
    { id: detailId! },
    { enabled: !!detailId },
  )

  const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
    return start + i
  }).filter((p) => p >= 1 && p <= totalPages)

  const inputStyle: React.CSSProperties = {
    background: t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: '11px',
    padding: '7px 10px',
    color: t.text,
    fontSize: '12px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Filters row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <p style={{ color: t.textMuted, fontSize: '12px' }}>{total} transactions</p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} style={{ ...inputStyle, colorScheme: 'dark' }} />
          <span style={{ color: t.textFaint, fontSize: '12px' }}>–</span>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} style={{ ...inputStyle, colorScheme: 'dark' }} />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate(''); setPage(1) }} style={{ padding: '7px 10px', borderRadius: '9px', border: 'none', background: t.inputBg, color: t.textFaint, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {([undefined, 'completed', 'voided', 'refunded', 'partially_refunded', 'draft'] as (SaleStatus | undefined)[]).map((s) => {
          const label = s ? s.replace('_', ' ') : 'All'
          const active = statusFilter === s
          const col = s ? STATUS_COLORS[s] : null
          return (
            <button
              key={String(s)}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              style={{ padding: '6px 13px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', background: active ? (col?.bg ?? 'rgba(124,58,237,0.15)') : t.inputBg, color: active ? (col?.text ?? '#7c3aed') : t.textMuted }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 90px 90px 100px', gap: '8px', padding: '10px 18px', borderBottom: `1px solid ${t.borderMid}` }}>
          {['Sale #', 'Customer', 'Location', 'Status', 'Payment', 'Total'].map((h) => (
            <span key={h} style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: '56px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>Loading...</div>
        ) : sales.length === 0 ? (
          <div style={{ padding: '56px', textAlign: 'center' }}>
            <Icon name="sale" size={32} style={{ color: t.textFaint, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ color: t.textFaint, fontSize: '13px' }}>No sales found</p>
          </div>
        ) : (
          sales.map((s) => {
            const status = ((s as any).status ?? 'draft') as SaleStatus
            const sc = STATUS_COLORS[status]
            const customerName = (s as any).customerName ?? 'Walk-in'
            const locationName = (s as any).locationName ?? '—'
            const payMethod = (s as any).primaryPaymentMethod ?? '—'
            const totalAmt = Number((s as any).totalAmount ?? 0)
            return (
              <div
                key={s.id}
                onClick={() => setDetailId(s.id)}
                style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 90px 90px 100px', gap: '8px', padding: '13px 18px', alignItems: 'center', borderBottom: `1px solid ${t.borderMid}`, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: t.textFaint, fontSize: '11px', fontFamily: 'monospace' }}>#{String(s.id).slice(-8).toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: t.text, fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customerName}</p>
                  <p style={{ color: t.textFaint, fontSize: '11px' }}>{new Date((s as any).createdAt).toLocaleDateString()}</p>
                </div>
                <span style={{ color: t.textMuted, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationName}</span>
                <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: sc.bg, color: sc.text, textTransform: 'capitalize', width: 'fit-content' }}>{status.replace('_', ' ')}</span>
                <span style={{ color: t.textMuted, fontSize: '11px' }}>{METHOD_LABELS[payMethod] ?? payMethod}</span>
                <span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>{sym}{totalAmt.toLocaleString()}</span>
              </div>
            )
          })
        )}

        {/* Pagination */}
        <div style={{ padding: '11px 18px', borderTop: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: t.textFaint, fontSize: '12px' }}>{tr.showing} {sales.length} {tr.of} {total}</span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '3px' }}>
              {pageButtons.map((p) => (
                <button key={p} onClick={(e) => { e.stopPropagation(); setPage(p) }} style={{ width: '27px', height: '27px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', background: p === page ? '#7c3aed' : t.inputBg, color: p === page ? '#fff' : t.textMuted }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detailId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDetailId(null)}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', width: '100%', maxWidth: '480px', margin: '0 16px', background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'slideUp 0.22s ease', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <h2 style={{ color: t.text, fontWeight: 700, fontSize: '16px' }}>Sale #{detailId.slice(-8).toUpperCase()}</h2>
                {detail && <p style={{ color: t.textMuted, fontSize: '12px', marginTop: '3px' }}>{new Date((detail as any).createdAt).toLocaleString()}</p>}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {detail && (
                  <button
                    onClick={() => { setDetailId(null); onShowVoucher(detail as unknown as SaleDetail) }}
                    style={{ padding: '6px 13px', borderRadius: '9px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Print Voucher
                  </button>
                )}
                <button onClick={() => setDetailId(null)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={13} />
                </button>
              </div>
            </div>

            <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
              {!detail ? (
                <p style={{ color: t.textFaint, fontSize: '13px', textAlign: 'center' }}>Loading...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Meta */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      ['Customer', (detail as any).customerName ?? 'Walk-in'],
                      ['Location', (detail as any).locationName ?? '—'],
                      ['Cashier', (detail as any).cashierName ?? '—'],
                      ['Status', ((detail as any).status ?? '—').replace('_', ' ')],
                    ].map(([label, val]) => (
                      <div key={label} style={{ background: t.inputBg, borderRadius: '10px', padding: '10px 12px' }}>
                        <p style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{label}</p>
                        <p style={{ color: t.text, fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Items */}
                  {Array.isArray((detail as any).items) && (detail as any).items.length > 0 && (
                    <div>
                      <p style={{ color: t.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Items</p>
                      <div style={{ background: t.inputBg, borderRadius: '10px', overflow: 'hidden' }}>
                        {((detail as any).items as any[]).map((item: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: i < (detail as any).items.length - 1 ? `1px solid ${t.borderMid}` : 'none' }}>
                            <div>
                              <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{item.productName ?? '—'}</p>
                              <p style={{ color: t.textFaint, fontSize: '11px' }}>Qty: {item.qty} × {sym}{Number(item.unitPrice).toLocaleString()}</p>
                            </div>
                            <span style={{ color: t.text, fontSize: '13px', fontWeight: 600 }}>{sym}{(Number(item.qty) * Number(item.unitPrice) - Number(item.discountAmount ?? 0)).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payments */}
                  {Array.isArray((detail as any).payments) && (detail as any).payments.length > 0 && (
                    <div>
                      <p style={{ color: t.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Payments</p>
                      <div style={{ background: t.inputBg, borderRadius: '10px', overflow: 'hidden' }}>
                        {((detail as any).payments as any[]).map((pay: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: i < (detail as any).payments.length - 1 ? `1px solid ${t.borderMid}` : 'none' }}>
                            <span style={{ color: t.textMuted, fontSize: '12px' }}>{METHOD_LABELS[pay.method] ?? pay.method}</span>
                            <span style={{ color: t.text, fontSize: '13px', fontWeight: 600 }}>{sym}{Number(pay.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div style={{ borderTop: `1px solid ${t.borderMid}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      ['Subtotal', `${sym}${Number((detail as any).subtotal ?? 0).toLocaleString()}`],
                      ['Discount', `−${sym}${Number((detail as any).discountAmount ?? 0).toLocaleString()}`],
                      ['Tax', `${sym}${Number((detail as any).taxAmount ?? 0).toLocaleString()}`],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: t.textMuted, fontSize: '12px' }}>{label}</span>
                        <span style={{ color: t.textMuted, fontSize: '12px' }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: `1px solid ${t.borderMid}` }}>
                      <span style={{ color: t.text, fontSize: '14px', fontWeight: 700 }}>Total</span>
                      <span style={{ color: t.text, fontSize: '16px', fontWeight: 800 }}>{sym}{Number((detail as any).totalAmount ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main SalesPage ────────────────────────────────────────────

export const SalesPage: React.FC = () => {
  const t = useAppStore((s) => s.theme)

  const [tab, setTab] = useState<Tab>('history')
  const [voucher, setVoucher] = useState<SaleDetail | null>(null)

  const tabBtn = (label: string, value: Tab, icon: string) => {
    const active = tab === value
    return (
      <button
        onClick={() => setTab(value)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '8px 16px', borderRadius: '11px', border: 'none',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          background: active ? '#7c3aed' : t.inputBg,
          color: active ? '#fff' : t.textMuted,
          transition: 'all 0.15s',
        }}
      >
        <Icon name={icon as any} size={14} />
        {label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: '21px', fontWeight: 800, letterSpacing: '-0.5px' }}>Sales</h1>
          <p style={{ color: t.textMuted, fontSize: '12px', marginTop: '2px' }}>
            {tab === 'pos' ? 'POS Terminal — process a new sale' : 'View and manage sales history'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {tabBtn('History', 'history', 'sale')}
          {tabBtn('New Sale', 'pos', 'plus')}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'history' && (
        <SalesHistory onShowVoucher={(sale) => setVoucher(sale)} />
      )}
      {tab === 'pos' && (
        <POSTerminal
          onComplete={(sale) => {
            setVoucher(sale)
            setTab('history')
          }}
        />
      )}

      {/* Voucher modal (shown after POS checkout or from history) */}
      {voucher && (
        <VoucherView
          sale={voucher}
          onClose={() => setVoucher(null)}
          onNewSale={() => { setVoucher(null); setTab('pos') }}
        />
      )}
    </div>
  )
}
