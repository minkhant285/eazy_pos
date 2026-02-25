import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { trpc } from '../../trpc-client/trpc'

// ── Constants ─────────────────────────────────────────────────

const IN_TYPES = new Set([
  'purchase_in', 'return_in', 'adjustment_in',
  'transfer_in', 'opening_balance', 'production_in',
])

const MOVE_LABELS: Record<string, string> = {
  purchase_in:    'Purchase In',
  sale_out:       'Sale Out',
  return_in:      'Return In',
  return_out:     'Return Out',
  adjustment_in:  'Adj In',
  adjustment_out: 'Adj Out',
  transfer_in:    'Transfer In',
  transfer_out:   'Transfer Out',
  opening_balance:'Opening Bal',
  damage_out:     'Damage Out',
  production_in:  'Prod In',
  production_out: 'Prod Out',
}

const MOVE_TYPE_OPTIONS = [
  { value: '',               label: 'All Types' },
  { value: 'purchase_in',   label: 'Purchase In' },
  { value: 'sale_out',      label: 'Sale Out' },
  { value: 'transfer_in',   label: 'Transfer In' },
  { value: 'transfer_out',  label: 'Transfer Out' },
  { value: 'return_in',     label: 'Return In' },
  { value: 'return_out',    label: 'Return Out' },
  { value: 'adjustment_in', label: 'Adj In' },
  { value: 'adjustment_out',label: 'Adj Out' },
  { value: 'opening_balance','label': 'Opening Bal' },
  { value: 'damage_out',    label: 'Damage Out' },
  { value: 'production_in', label: 'Prod In' },
  { value: 'production_out',label: 'Prod Out' },
]

type DirectionFilter = 'all' | 'in' | 'out'

const PAGE_SIZE = 50

// ── LedgerPage ────────────────────────────────────────────────

export const LedgerPage: React.FC = () => {
  const t   = useAppStore((s) => s.theme)
  const sym = useAppStore((s) => s.currency.symbol)

  const [locationId,   setLocationId]   = useState('')
  const [movementType, setMovementType] = useState('')
  const [direction,    setDirection]    = useState<DirectionFilter>('all')
  const [fromDate,     setFromDate]     = useState('')
  const [toDate,       setToDate]       = useState('')
  const [page,         setPage]         = useState(1)

  // Resolve effective movementType: if direction forces a single type family and
  // no specific type selected, leave to the backend and filter client-side by direction.
  const { data: locationsData } = trpc.location.list.useQuery({ pageSize: 100 })
  const locations = locationsData?.data ?? []

  const { data, isLoading } = trpc.stock.ledger.useQuery({
    locationId:   locationId   || undefined,
    movementType: movementType || undefined,
    fromDate:     fromDate     || undefined,
    toDate:       toDate       || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  // Client-side direction filter (only when no specific movementType chosen)
  const allEntries = data?.data ?? []
  const entries = movementType
    ? allEntries   // already filtered by exact type server-side
    : direction === 'in'  ? allEntries.filter((e) => IN_TYPES.has(e.movementType))
    : direction === 'out' ? allEntries.filter((e) => !IN_TYPES.has(e.movementType))
    : allEntries

  const total      = data?.total      ?? 0
  const totalPages = data?.totalPages ?? 1

  const inCount  = allEntries.filter((e) =>  IN_TYPES.has(e.movementType)).length
  const outCount = allEntries.filter((e) => !IN_TYPES.has(e.movementType)).length

  const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
    return start + i
  }).filter((p) => p >= 1 && p <= totalPages)

  // Styles
  const inp: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '10px',
    padding: '8px 12px', color: t.text, fontSize: '12px', outline: 'none',
    fontFamily: 'inherit',
  }

  const dirBtn = (key: DirectionFilter): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '12px', fontWeight: 500, transition: 'all 0.15s',
    background: direction === key ? t.surface : 'transparent',
    color:      direction === key ? t.text    : t.textMuted,
    boxShadow:  direction === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
  })

  const resetPage = () => setPage(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'slideUp 0.2s ease' }}>

      {/* Header */}
      <div>
        <h1 style={{ color: t.text, fontSize: '21px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Stock Ledger
        </h1>
        <p style={{ color: t.textMuted, fontSize: '12px', marginTop: '2px' }}>
          Full movement history — every stock in &amp; out event
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Location */}
        <select
          value={locationId}
          onChange={(e) => { setLocationId(e.target.value); resetPage() }}
          style={{ ...inp, minWidth: '160px' }}
        >
          <option value="">All Locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        {/* Movement type */}
        <select
          value={movementType}
          onChange={(e) => { setMovementType(e.target.value); setDirection('all'); resetPage() }}
          style={{ ...inp, minWidth: '150px' }}
        >
          {MOVE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date range */}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); resetPage() }}
          style={{ ...inp }}
        />
        <span style={{ color: t.textFaint, fontSize: '12px' }}>→</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); resetPage() }}
          style={{ ...inp }}
        />

        {/* Clear */}
        {(locationId || movementType || fromDate || toDate || direction !== 'all') && (
          <button
            onClick={() => { setLocationId(''); setMovementType(''); setFromDate(''); setToDate(''); setDirection('all'); resetPage() }}
            style={{ ...inp, color: t.textFaint, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Direction tabs + summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        {/* Direction toggle */}
        <div style={{ display: 'flex', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '10px', padding: '3px', gap: '2px' }}>
          {(['all', 'in', 'out'] as DirectionFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => { setDirection(key); if (movementType) setMovementType(''); resetPage() }}
              style={dirBtn(key)}
            >
              {key === 'all' ? 'All' : key === 'in' ? '▲ In' : '▼ Out'}
            </button>
          ))}
        </div>

        {/* Summary badges */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ padding: '6px 14px', borderRadius: '9px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 700 }}>▲ In</span>
            <span style={{ color: t.textMuted, fontSize: '12px', marginLeft: '6px' }}>{inCount} on page</span>
          </div>
          <div style={{ padding: '6px 14px', borderRadius: '9px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>▼ Out</span>
            <span style={{ color: t.textMuted, fontSize: '12px', marginLeft: '6px' }}>{outCount} on page</span>
          </div>
          <div style={{ padding: '6px 14px', borderRadius: '9px', background: t.inputBg, border: `1px solid ${t.border}` }}>
            <span style={{ color: t.textMuted, fontSize: '12px' }}>{total} total records</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>

        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1.6fr 120px 110px 80px 130px 1fr 100px', gap: '8px', padding: '10px 16px', borderBottom: `1px solid ${t.borderMid}` }}>
          {['Date', 'Product', 'Location', 'Type', 'Qty', 'Before → After', 'Notes / Ref', 'By'].map((h) => (
            <span key={h} style={{ color: t.textFaint, fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>Loading…</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>No ledger entries found</div>
        ) : entries.map((row) => {
          const isIn  = IN_TYPES.has(row.movementType)
          const color = isIn ? '#10b981' : '#ef4444'
          const bg    = isIn ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)'

          return (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1.6fr 120px 110px 80px 130px 1fr 100px',
                gap: '8px',
                padding: '11px 16px',
                alignItems: 'center',
                borderBottom: `1px solid ${t.borderMid}`,
                borderLeft: `3px solid ${color}`,
                background: bg,
              }}
            >
              {/* Date */}
              <div>
                <p style={{ color: t.text, fontSize: '11px', fontWeight: 600 }}>
                  {String(row.createdAt).slice(0, 10)}
                </p>
                <p style={{ color: t.textFaint, fontSize: '10px', fontFamily: 'monospace' }}>
                  {String(row.createdAt).slice(11, 16)}
                </p>
              </div>

              {/* Product */}
              <div style={{ minWidth: 0 }}>
                <p style={{ color: t.text, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.productName ?? '—'}
                </p>
                <p style={{ color: t.textFaint, fontSize: '10px', fontFamily: 'monospace' }}>
                  {row.productSku ?? '—'}
                </p>
              </div>

              {/* Location */}
              <span style={{ color: t.textMuted, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.locationName ?? '—'}
              </span>

              {/* Type badge */}
              <span style={{
                fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                background: isIn ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color, whiteSpace: 'nowrap', width: 'fit-content',
              }}>
                {MOVE_LABELS[row.movementType] ?? row.movementType}
              </span>

              {/* Qty */}
              <span style={{ color, fontSize: '13px', fontWeight: 700 }}>
                {isIn ? '+' : '−'}{Number(row.qty)}
              </span>

              {/* Before → After */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: t.textFaint, fontSize: '11px' }}>{Number(row.qtyBefore)}</span>
                <span style={{ color: t.textFaint, fontSize: '10px' }}>→</span>
                <span style={{ color: t.text, fontSize: '11px', fontWeight: 600 }}>{Number(row.qtyAfter)}</span>
              </div>

              {/* Notes / Ref */}
              <div style={{ minWidth: 0 }}>
                {row.notes ? (
                  <p style={{ color: t.textFaint, fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.notes}
                  </p>
                ) : row.referenceType ? (
                  <p style={{ color: t.textFaint, fontSize: '10px', fontFamily: 'monospace' }}>
                    {row.referenceType}
                  </p>
                ) : (
                  <span style={{ color: t.textFaint, fontSize: '10px' }}>—</span>
                )}
              </div>

              {/* By */}
              <span style={{ color: t.textMuted, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.createdBy ?? '—'}
              </span>
            </div>
          )
        })}

        {/* Footer / Pagination */}
        <div style={{ padding: '11px 16px', borderTop: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: t.textFaint, fontSize: '12px' }}>
            Showing {entries.length} of {total}
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '3px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ width: '27px', height: '27px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', background: t.inputBg, color: page === 1 ? t.textFaint : t.textMuted }}
              >‹</button>
              {pageButtons.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{ width: '27px', height: '27px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', background: p === page ? '#7c3aed' : t.inputBg, color: p === page ? '#fff' : t.textMuted }}
                >{p}</button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ width: '27px', height: '27px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', background: t.inputBg, color: page === totalPages ? t.textFaint : t.textMuted }}
              >›</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
