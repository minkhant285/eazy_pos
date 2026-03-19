import React, { useMemo } from 'react'
import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js'
import { useAppStore } from '../../store/useAppStore'
import { trpc } from '../../trpc-client/trpc'
import { AppSelect } from '../../components/ui/AppSelect'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

// ── Types ─────────────────────────────────────────────────────

type Tab = 'pl' | 'cashflow' | 'balance' | 'reports'

type RangePreset = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom'

const RANGE_OPTIONS = [
  { value: 'this_month',    label: 'This Month' },
  { value: 'last_month',    label: 'Last Month' },
  { value: 'this_quarter',  label: 'This Quarter' },
  { value: 'this_year',     label: 'This Year' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const PIE_COLORS = [
  '#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899','#3b82f6','#ef4444','#84cc16','#f97316','#6366f1',
]

// ── Date helpers ─────────────────────────────────────────────

function getRange(preset: RangePreset): { from: string; to: string } {
  const now  = new Date()
  const yr   = now.getFullYear()
  const mo   = now.getMonth() + 1
  const pad  = (n: number) => String(n).padStart(2, '0')
  const ymd  = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

  if (preset === 'this_month') {
    return { from: ymd(yr, mo, 1), to: ymd(yr, mo, new Date(yr, mo, 0).getDate()) }
  }
  if (preset === 'last_month') {
    const lm = mo === 1 ? 12 : mo - 1
    const ly = mo === 1 ? yr - 1 : yr
    return { from: ymd(ly, lm, 1), to: ymd(ly, lm, new Date(ly, lm, 0).getDate()) }
  }
  if (preset === 'this_quarter') {
    const q = Math.ceil(mo / 3)
    const qStart = (q - 1) * 3 + 1
    const qEnd   = q * 3
    return { from: ymd(yr, qStart, 1), to: ymd(yr, qEnd, new Date(yr, qEnd, 0).getDate()) }
  }
  // this_year
  return { from: ymd(yr, 1, 1), to: ymd(yr, 12, 31) }
}

// ── Main Component ────────────────────────────────────────────

export const AccountingPage: React.FC = () => {
  const t   = useAppStore((s) => s.theme)
  const isDark = useAppStore((s) => s.isDark)
  const sym = useAppStore((s) => s.currency.symbol)

  const [tab,         setTab]         = React.useState<Tab>('pl')
  const [rangePreset, setRangePreset] = React.useState<RangePreset>('this_month')
  const [chartYear,   setChartYear]   = React.useState(new Date().getFullYear())

  const { from, to } = useMemo(() => getRange(rangePreset), [rangePreset])

  // SQLite format
  const fromDate = from + ' 00:00:00'
  const toDate   = to   + ' 23:59:59'

  // ── Queries ──────────────────────────────────────────────
  const { data: pl,    isLoading: plLoading    } = trpc.accounting.incomeStatement.useQuery({ fromDate, toDate })
  const { data: cf,    isLoading: cfLoading    } = trpc.accounting.cashFlow.useQuery({ fromDate, toDate })
  const { data: bs,    isLoading: bsLoading    } = trpc.accounting.balanceSheet.useQuery()
  const { data: trend, isLoading: trendLoading } = trpc.accounting.monthlyTrend.useQuery({ year: chartYear })
  const { data: catRevenue                      } = trpc.accounting.revenueByCategory.useQuery({ fromDate, toDate })
  const { data: topProd                         } = trpc.accounting.topProducts.useQuery({ fromDate, toDate, limit: 15 })

  // ── Formatters ───────────────────────────────────────────
  const fmt = (n: number) =>
    `${sym}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  const fmtPct = (n: number) => `${n.toFixed(1)}%`
  const color  = (n: number) => n >= 0 ? '#10b981' : '#ef4444'

  // ── Chart data ───────────────────────────────────────────
  const trendBar = useMemo(() => ({
    labels: MONTHS,
    datasets: [
      {
        label: 'Revenue',
        data: trend?.map(m => m.revenue) ?? [],
        backgroundColor: 'rgba(139,92,246,0.75)',
        borderRadius: 4, borderSkipped: false as const,
      },
      {
        label: 'Gross Profit',
        data: trend?.map(m => m.grossProfit) ?? [],
        backgroundColor: 'rgba(16,185,129,0.75)',
        borderRadius: 4, borderSkipped: false as const,
      },
      {
        label: 'Net Profit',
        data: trend?.map(m => m.netProfit) ?? [],
        backgroundColor: 'rgba(245,158,11,0.75)',
        borderRadius: 4, borderSkipped: false as const,
      },
    ],
  }), [trend])

  const barOpts = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: t.textMuted, font: { family: 'DM Sans, sans-serif', size: 11 }, boxWidth: 10, padding: 12 } },
      tooltip: { callbacks: { label: (ctx: any) => ` ${sym}${Number(ctx.raw).toLocaleString()}` } },
    },
    scales: {
      x: { grid: { color: t.borderMid }, ticks: { color: t.textFaint, font: { size: 10 } } },
      y: { grid: { color: t.borderMid }, ticks: { color: t.textFaint, font: { size: 10 }, callback: (v: any) => `${sym}${Number(v).toLocaleString()}` } },
    },
  }), [t, sym])

  const catPie = useMemo(() => ({
    labels: catRevenue?.map(c => c.categoryName) ?? [],
    datasets: [{
      data: catRevenue?.map(c => c.revenue) ?? [],
      backgroundColor: catRevenue?.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]) ?? [],
      borderColor: t.surface, borderWidth: 2,
    }],
  }), [catRevenue, t])

  const pieOpts = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { color: t.textMuted, font: { size: 11 }, padding: 8, boxWidth: 10 } },
      tooltip: { callbacks: { label: (ctx: any) => ` ${sym}${Number(ctx.raw).toLocaleString()}` } },
    },
  }), [t, sym])

  // ── Styles ───────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '18px 20px',
  }
  const label: React.CSSProperties = {
    color: t.textFaint, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
  }
  const val: React.CSSProperties = {
    color: t.text, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginTop: '2px',
  }
  const row: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0',
    borderBottom: `1px solid ${t.borderMid}`,
  }
  const sectionTitle: React.CSSProperties = {
    color: t.text, fontWeight: 700, fontSize: '13px', marginBottom: '12px',
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        padding: '7px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer',
        background: tab === id ? 'var(--primary)' : 'transparent',
        color: tab === id ? '#fff' : t.textMuted,
        fontSize: '12px', fontWeight: tab === id ? 700 : 400,
        fontFamily: 'inherit', transition: 'all 0.15s',
      }}
    >{label}</button>
  )

  const spinner = (
    <div style={{ padding: '60px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>Loading…</div>
  )

  const currentYear = new Date().getFullYear()

  // ─────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'slideUp 0.2s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: '21px', fontWeight: 800, letterSpacing: '-0.5px' }}>Accounting</h1>
          <p style={{ color: t.textMuted, fontSize: '12px', marginTop: '2px' }}>Financial reports & statements</p>
        </div>
        {/* Range selector (not shown on Balance Sheet which is point-in-time) */}
        {tab !== 'balance' && (
          <AppSelect
            value={rangePreset}
            onChange={(v) => setRangePreset(v as RangePreset)}
            options={RANGE_OPTIONS}
            isSearchable={false}
            minWidth={160}
          />
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: t.inputBg, borderRadius: '12px', padding: '4px', width: 'fit-content', border: `1px solid ${t.border}` }}>
        {tabBtn('pl',        'P & L')}
        {tabBtn('cashflow',  'Cash Flow')}
        {tabBtn('balance',   'Balance Sheet')}
        {tabBtn('reports',   'Reports')}
      </div>

      {/* ── P & L Statement ──────────────────────────────── */}
      {tab === 'pl' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* KPI row */}
          {[
            { label: 'Revenue',       val: pl?.revenue      ?? 0, sub: `${pl?.transactionCount ?? 0} transactions` },
            { label: 'Gross Profit',  val: pl?.grossProfit  ?? 0, sub: `${fmtPct(pl?.grossMargin ?? 0)} margin` },
            { label: 'Total Expenses',val: -(pl?.totalExpenses ?? 0), sub: `${pl?.expenseBreakdown?.length ?? 0} categories`, negative: true },
            { label: 'Net Profit',    val: pl?.netProfit    ?? 0, sub: `${fmtPct(pl?.netMargin ?? 0)} net margin`, highlight: true },
          ].map((k, i) => (
            <div key={i} style={{ ...card, gridColumn: i === 3 ? 'span 1' : undefined }}>
              {plLoading ? spinner : (
                <>
                  <p style={label}>{k.label}</p>
                  <p style={{ ...val, color: k.highlight ? color(k.val) : k.negative && k.val < 0 ? '#ef4444' : t.text }}>
                    {k.val < 0 ? '-' : ''}{fmt(k.val)}
                  </p>
                  <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '3px' }}>{k.sub}</p>
                </>
              )}
            </div>
          ))}

          {/* P&L breakdown table */}
          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <p style={sectionTitle}>Profit & Loss Statement — {from} to {to}</p>
            {plLoading ? spinner : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Revenue section */}
                <PLRow label="Gross Revenue"     val={pl?.revenue     ?? 0} t={t} fmt={fmt} bold />
                <PLRow label="(–) Discounts"     val={-(pl?.discounts  ?? 0)} t={t} fmt={fmt} indent muted />
                <PLRow label="(–) Cost of Goods" val={-(pl?.cogs       ?? 0)} t={t} fmt={fmt} indent muted />
                <PLRow label="Gross Profit"       val={pl?.grossProfit ?? 0} t={t} fmt={fmt} bold colored />
                <PLRow label="Gross Margin"       val={pl?.grossMargin ?? 0} t={t} fmt={fmtPct} indent muted isPct />

                {/* Expenses */}
                <div style={{ height: '8px' }} />
                <p style={{ ...label, marginBottom: '6px' }}>Operating Expenses</p>
                {(pl?.expenseBreakdown ?? []).map(e => (
                  <PLRow key={e.categoryId} label={e.categoryName} val={-e.amount} t={t} fmt={fmt} indent muted dot={e.categoryColor} />
                ))}
                {(pl?.expenseBreakdown?.length ?? 0) === 0 && (
                  <p style={{ color: t.textFaint, fontSize: '12px', padding: '4px 0' }}>No expenses recorded</p>
                )}
                <PLRow label="Total Expenses" val={-(pl?.totalExpenses ?? 0)} t={t} fmt={fmt} muted bold />

                {/* Net */}
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: `2px solid ${t.border}` }} />
                <PLRow label="Net Profit" val={pl?.netProfit ?? 0} t={t} fmt={fmt} bold colored large />
                <PLRow label="Net Margin" val={pl?.netMargin ?? 0} t={t} fmt={fmtPct} indent muted isPct />

                {/* Tax note */}
                {(pl?.taxCollected ?? 0) > 0 && (
                  <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '10px' }}>
                    Tax Collected: {fmt(pl?.taxCollected ?? 0)} (included in revenue, not deducted)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Expense breakdown pie */}
          {(pl?.expenseBreakdown?.length ?? 0) > 0 && (
            <div style={{ ...card, gridColumn: '1 / -1' }}>
              <p style={sectionTitle}>Expense Breakdown</p>
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'center' }}>
                <div style={{ height: '200px' }}>
                  <Pie data={{
                    labels: pl?.expenseBreakdown?.map(e => e.categoryName) ?? [],
                    datasets: [{ data: pl?.expenseBreakdown?.map(e => e.amount) ?? [], backgroundColor: pl?.expenseBreakdown?.map(e => e.categoryColor) ?? [], borderColor: t.surface, borderWidth: 2 }],
                  }} options={pieOpts} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {pl?.expenseBreakdown?.map(e => (
                    <div key={e.categoryId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: e.categoryColor, flexShrink: 0 }} />
                        <span style={{ color: t.text, fontSize: '12px' }}>{e.categoryName}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span style={{ color: t.textMuted, fontSize: '11px' }}>
                          {(pl?.totalExpenses ?? 0) > 0 ? ((e.amount / (pl?.totalExpenses ?? 1)) * 100).toFixed(1) : 0}%
                        </span>
                        <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>{fmt(e.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cash Flow ───────────────────────────────────── */}
      {tab === 'cashflow' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>

          {/* KPIs */}
          {[
            { label: 'Total Cash In',   val: cf?.totalCashIn   ?? 0, clr: '#10b981' },
            { label: 'Total Cash Out',  val: cf?.totalCashOut  ?? 0, clr: '#ef4444' },
            { label: 'Net Cash Flow',   val: cf?.netCashFlow   ?? 0, clr: color(cf?.netCashFlow ?? 0) },
          ].map((k, i) => (
            <div key={i} style={card}>
              {cfLoading ? spinner : (
                <>
                  <p style={label}>{k.label}</p>
                  <p style={{ ...val, color: k.clr }}>{k.val < 0 ? '-' : ''}{fmt(Math.abs(k.val))}</p>
                </>
              )}
            </div>
          ))}

          {/* Cash In detail */}
          <div style={{ ...card, gridColumn: '1 / 2' }}>
            <p style={sectionTitle}>Cash In — by Payment Method</p>
            {cfLoading ? spinner : (
              <div>
                {(cf?.cashIn ?? []).length === 0 && <p style={{ color: t.textFaint, fontSize: '12px' }}>No sales recorded</p>}
                {(cf?.cashIn ?? []).map((r, i) => (
                  <div key={i} style={row}>
                    <span style={{ color: t.text, fontSize: '12px', textTransform: 'capitalize' }}>{r.method.replace('_', ' ')}</span>
                    <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>{fmt(r.amount)}</span>
                  </div>
                ))}
                <div style={{ ...row, borderBottom: 'none', marginTop: '4px' }}>
                  <span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>Total</span>
                  <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 800 }}>{fmt(cf?.totalCashIn ?? 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Cash Out detail */}
          <div style={{ ...card, gridColumn: '2 / 4' }}>
            <p style={sectionTitle}>Cash Out</p>
            {cfLoading ? spinner : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ ...label, marginBottom: '8px' }}>Operating Expenses</p>
                  {(cf?.expenseOut ?? []).length === 0 && <p style={{ color: t.textFaint, fontSize: '12px' }}>No expenses</p>}
                  {(cf?.expenseOut ?? []).map((r, i) => (
                    <div key={i} style={row}>
                      <span style={{ color: t.text, fontSize: '12px', textTransform: 'capitalize' }}>{r.method.replace('_', ' ')}</span>
                      <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>{fmt(r.amount)}</span>
                    </div>
                  ))}
                  <div style={{ ...row, borderBottom: 'none' }}>
                    <span style={{ color: t.textMuted, fontSize: '12px', fontWeight: 600 }}>Subtotal</span>
                    <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>{fmt(cf?.totalExpenseOut ?? 0)}</span>
                  </div>
                </div>
                <div>
                  <p style={{ ...label, marginBottom: '8px' }}>Inventory Purchases</p>
                  <div style={row}>
                    <span style={{ color: t.text, fontSize: '12px' }}>Purchase Orders ({cf?.purchaseCount ?? 0})</span>
                    <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>{fmt(cf?.totalPurchaseOut ?? 0)}</span>
                  </div>
                  <div style={{ ...row, borderBottom: 'none', paddingTop: '20px' }}>
                    <span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>Total Out</span>
                    <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 800 }}>{fmt(cf?.totalCashOut ?? 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Monthly trend chart */}
          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ color: t.text, fontWeight: 700, fontSize: '13px' }}>Monthly Trend</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => setChartYear(y => y - 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', fontSize: '14px' }}>‹</button>
                <span style={{ color: t.text, fontSize: '12px', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>{chartYear}</span>
                <button onClick={() => setChartYear(y => y + 1)} disabled={chartYear >= currentYear} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: t.inputBg, color: chartYear >= currentYear ? t.textFaint : t.textMuted, cursor: chartYear >= currentYear ? 'not-allowed' : 'pointer', fontSize: '14px' }}>›</button>
              </div>
            </div>
            {trendLoading ? spinner : (
              <div style={{ height: '240px' }}>
                <Bar data={trendBar} options={barOpts} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Balance Sheet ────────────────────────────────── */}
      {tab === 'balance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* Equity KPI */}
          <div style={{ ...card, gridColumn: '1 / -1', textAlign: 'center' }}>
            {bsLoading ? spinner : (
              <>
                <p style={{ ...label, textAlign: 'center' }}>Owner's Equity (Net Worth)</p>
                <p style={{ color: color(bs?.equity ?? 0), fontSize: '36px', fontWeight: 900, letterSpacing: '-1px', marginTop: '6px' }}>
                  {(bs?.equity ?? 0) < 0 ? '-' : ''}{fmt(Math.abs(bs?.equity ?? 0))}
                </p>
                <p style={{ color: t.textFaint, fontSize: '12px', marginTop: '4px' }}>Assets − Liabilities = Equity</p>
              </>
            )}
          </div>

          {/* Assets */}
          <div style={card}>
            <p style={sectionTitle}>Assets</p>
            {bsLoading ? spinner : (
              <div>
                <div style={row}>
                  <div>
                    <p style={{ color: t.text, fontSize: '12px' }}>Inventory Value</p>
                    <p style={{ color: t.textFaint, fontSize: '10px' }}>{bs?.assets.inventorySkus ?? 0} product SKUs</p>
                  </div>
                  <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 700 }}>{fmt(bs?.assets.inventoryValue ?? 0)}</span>
                </div>
                <div style={row}>
                  <div>
                    <p style={{ color: t.text, fontSize: '12px' }}>Accounts Receivable</p>
                    <p style={{ color: t.textFaint, fontSize: '10px' }}>{bs?.assets.arCustomerCount ?? 0} customers owe money</p>
                  </div>
                  <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 700 }}>{fmt(bs?.assets.accountsReceivable ?? 0)}</span>
                </div>
                <div style={{ ...row, borderBottom: 'none', paddingTop: '10px', marginTop: '4px', borderTop: `2px solid ${t.border}` }}>
                  <span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>Total Assets</span>
                  <span style={{ color: '#10b981', fontSize: '15px', fontWeight: 800 }}>{fmt(bs?.assets.total ?? 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Liabilities */}
          <div style={card}>
            <p style={sectionTitle}>Liabilities</p>
            {bsLoading ? spinner : (
              <div>
                <div style={row}>
                  <div>
                    <p style={{ color: t.text, fontSize: '12px' }}>Accounts Payable</p>
                    <p style={{ color: t.textFaint, fontSize: '10px' }}>{bs?.liabilities.apSupplierCount ?? 0} open purchase orders</p>
                  </div>
                  <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700 }}>{fmt(bs?.liabilities.accountsPayable ?? 0)}</span>
                </div>
                <div style={{ ...row, borderBottom: 'none', paddingTop: '10px', marginTop: '4px', borderTop: `2px solid ${t.border}` }}>
                  <span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>Total Liabilities</span>
                  <span style={{ color: '#ef4444', fontSize: '15px', fontWeight: 800 }}>{fmt(bs?.liabilities.total ?? 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Explanation */}
          <div style={{ ...card, gridColumn: '1 / -1', background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)', border: `1px solid rgba(139,92,246,0.2)` }}>
            <p style={{ color: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>About this Balance Sheet</p>
            <p style={{ color: t.textMuted, fontSize: '11px', lineHeight: '1.7' }}>
              <strong>Assets</strong> = what the business owns. Inventory value is calculated from current stock quantities × cost prices.
              Accounts receivable are outstanding customer balances.{' '}
              <strong>Liabilities</strong> = what the business owes. Accounts payable are the total value of open/partial purchase orders.{' '}
              <strong>Equity</strong> = Assets − Liabilities. A positive equity means the business has more assets than debt.
            </p>
          </div>
        </div>
      )}

      {/* ── Reports ─────────────────────────────────────── */}
      {tab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Revenue by Category */}
          <div style={{ ...card }}>
            <p style={sectionTitle}>Revenue by Product Category</p>
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ height: '240px' }}>
                {(catRevenue?.length ?? 0) > 0
                  ? <Pie data={catPie} options={pieOpts} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textFaint, fontSize: '12px' }}>No data</div>
                }
              </div>
              <div>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px 60px', gap: '8px', paddingBottom: '6px', borderBottom: `1px solid ${t.borderMid}`, marginBottom: '4px' }}>
                  {['Category', 'Revenue', 'COGS', 'Profit', 'Margin'].map(h => (
                    <span key={h} style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</span>
                  ))}
                </div>
                {(catRevenue ?? []).map((c, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px 60px', gap: '8px', padding: '7px 0', borderBottom: `1px solid ${t.borderMid}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: t.text, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.categoryName}</span>
                    </div>
                    <span style={{ color: t.text, fontSize: '12px' }}>{fmt(c.revenue)}</span>
                    <span style={{ color: t.textMuted, fontSize: '12px' }}>{fmt(c.cogs)}</span>
                    <span style={{ color: color(c.grossProfit), fontSize: '12px', fontWeight: 600 }}>{fmt(c.grossProfit)}</span>
                    <span style={{ color: color(c.margin), fontSize: '12px' }}>{fmtPct(c.margin)}</span>
                  </div>
                ))}
                {(catRevenue?.length ?? 0) === 0 && <p style={{ color: t.textFaint, fontSize: '12px', padding: '12px 0' }}>No sales in this period</p>}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div style={card}>
            <p style={sectionTitle}>Top Products by Gross Profit</p>
            <div style={{ background: t.inputBg, borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 80px 80px 65px', gap: '8px', padding: '9px 14px', borderBottom: `1px solid ${t.borderMid}` }}>
                {['Product', 'Qty', 'Revenue', 'COGS', 'Profit', 'Margin'].map(h => (
                  <span key={h} style={{ color: t.textFaint, fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
                ))}
              </div>
              {(topProd ?? []).length === 0 && (
                <p style={{ color: t.textFaint, fontSize: '12px', padding: '20px 14px' }}>No sales data for this period</p>
              )}
              {(topProd ?? []).map((p, i) => (
                <div key={p.productId} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 80px 80px 65px', gap: '8px', padding: '9px 14px', alignItems: 'center', borderBottom: i < (topProd?.length ?? 0) - 1 ? `1px solid ${t.borderMid}` : 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: t.text, fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.productName}</p>
                    <p style={{ color: t.textFaint, fontSize: '10px', fontFamily: 'monospace' }}>{p.sku}</p>
                  </div>
                  <span style={{ color: t.textMuted, fontSize: '12px' }}>{p.qtySold.toLocaleString()}</span>
                  <span style={{ color: t.text,    fontSize: '12px' }}>{fmt(p.revenue)}</span>
                  <span style={{ color: t.textMuted, fontSize: '12px' }}>{fmt(p.cogs)}</span>
                  <span style={{ color: color(p.grossProfit), fontSize: '12px', fontWeight: 600 }}>{fmt(p.grossProfit)}</span>
                  <span style={{ color: color(p.margin), fontSize: '12px' }}>{fmtPct(p.margin)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trend chart in reports tab too */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ color: t.text, fontWeight: 700, fontSize: '13px' }}>Annual Trend ({chartYear})</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => setChartYear(y => y - 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', fontSize: '14px' }}>‹</button>
                <span style={{ color: t.text, fontSize: '12px', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>{chartYear}</span>
                <button onClick={() => setChartYear(y => y + 1)} disabled={chartYear >= currentYear} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: t.inputBg, color: chartYear >= currentYear ? t.textFaint : t.textMuted, cursor: chartYear >= currentYear ? 'not-allowed' : 'pointer', fontSize: '14px' }}>›</button>
              </div>
            </div>
            {trendLoading ? spinner : (
              <div style={{ height: '240px' }}><Bar data={trendBar} options={barOpts} /></div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ── P&L Row Helper ────────────────────────────────────────────

interface PLRowProps {
  label: string; val: number; t: any; fmt: (n: number) => string;
  bold?: boolean; indent?: boolean; muted?: boolean; colored?: boolean;
  large?: boolean; isPct?: boolean; dot?: string;
}

const PLRow: React.FC<PLRowProps> = ({ label, val, t, fmt, bold, indent, muted, colored, large, isPct, dot }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: `1px solid ${t.borderMid}`,
    paddingLeft: indent ? '16px' : '0',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {dot && <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: dot, flexShrink: 0 }} />}
      <span style={{ color: muted ? t.textMuted : t.text, fontSize: large ? '14px' : '12px', fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
    </div>
    <span style={{
      color: colored ? (val >= 0 ? '#10b981' : '#ef4444') : muted ? t.textMuted : t.text,
      fontSize: large ? '15px' : '12px', fontWeight: bold ? 700 : 500,
    }}>
      {isPct
        ? fmt(val)
        : (val < 0 ? '(' + fmt(Math.abs(val)) + ')' : fmt(val))
      }
    </span>
  </div>
)
