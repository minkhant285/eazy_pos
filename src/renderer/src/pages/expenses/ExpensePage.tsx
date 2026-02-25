import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { trpc } from '../../trpc-client/trpc'

// ── Constants ────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other',         label: 'Other' },
]

const PRESET_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#6366f1',
  '#84cc16', '#f97316',
]

type Tab = 'expenses' | 'categories'

type ExpenseForm = {
  categoryId: string
  locationId: string
  amount: string
  description: string
  paymentMethod: string
  expenseDate: string
  notes: string
}

const emptyForm = (): ExpenseForm => ({
  categoryId: '',
  locationId: '',
  amount: '',
  description: '',
  paymentMethod: 'cash',
  expenseDate: new Date().toISOString().slice(0, 10),
  notes: '',
})

// ── ExpensePage ──────────────────────────────────────────────

export const ExpensePage: React.FC = () => {
  const t   = useAppStore((s) => s.theme)
  const sym = useAppStore((s) => s.currency.symbol)

  // ── Tab ─────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('expenses')

  // ── Filters ─────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [fromDate, setFromDate]             = useState('')
  const [toDate, setToDate]                 = useState('')
  const [search, setSearch]                 = useState('')
  const [page, setPage]                     = useState(1)

  // ── Expense modal ────────────────────────────────────────────
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState<ExpenseForm>(emptyForm())
  const [formErr, setFormErr]   = useState('')
  const [delConfirm, setDelConfirm] = useState<string | null>(null)

  // ── Category modal ───────────────────────────────────────────
  const [catModal, setCatModal]     = useState<'add' | 'edit' | null>(null)
  const [catEditId, setCatEditId]   = useState<string | null>(null)
  const [catName, setCatName]       = useState('')
  const [catColor, setCatColor]     = useState(PRESET_COLORS[0])
  const [catErr, setCatErr]         = useState('')
  const [catDelConfirm, setCatDelConfirm] = useState<string | null>(null)

  const PAGE_SIZE = 20

  // ── Queries ──────────────────────────────────────────────────
  const { data: locationsData } = trpc.location.list.useQuery({ pageSize: 100 })
  const locations = locationsData?.data ?? []

  const { data: categoriesData, refetch: refetchCategories } =
    trpc.expense.listCategories.useQuery()
  const categories = categoriesData ?? []

  const { data: expensesData, refetch: refetchExpenses, isLoading } =
    trpc.expense.list.useQuery({
      categoryId: filterCategory || undefined,
      locationId: filterLocation || undefined,
      fromDate:   fromDate || undefined,
      toDate:     toDate   || undefined,
      search:     search   || undefined,
      page,
      pageSize:   PAGE_SIZE,
    })
  const expenses    = expensesData?.data ?? []
  const total       = expensesData?.total ?? 0
  const totalPages  = expensesData?.totalPages ?? 1

  // ── Mutations ────────────────────────────────────────────────
  const createExpense = trpc.expense.create.useMutation({
    onSuccess: () => { refetchExpenses(); closeModal() },
    onError: (e) => setFormErr(e.message),
  })
  const updateExpense = trpc.expense.update.useMutation({
    onSuccess: () => { refetchExpenses(); closeModal() },
    onError: (e) => setFormErr(e.message),
  })
  const deleteExpense = trpc.expense.delete.useMutation({
    onSuccess: () => { refetchExpenses(); setDelConfirm(null) },
  })

  const createCategory = trpc.expense.createCategory.useMutation({
    onSuccess: () => { refetchCategories(); closeCatModal() },
    onError: (e) => setCatErr(e.message),
  })
  const updateCategory = trpc.expense.updateCategory.useMutation({
    onSuccess: () => { refetchCategories(); closeCatModal() },
    onError: (e) => setCatErr(e.message),
  })
  const deleteCategory = trpc.expense.deleteCategory.useMutation({
    onSuccess: () => { refetchCategories(); setCatDelConfirm(null) },
    onError: (e) => setCatErr(e.message),
  })

  // ── Handlers ─────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm())
    setFormErr('')
    setEditId(null)
    setModal('add')
  }

  const openEdit = (row: typeof expenses[0]) => {
    setForm({
      categoryId:    row.categoryId,
      locationId:    row.locationId ?? '',
      amount:        String(row.amount),
      description:   row.description,
      paymentMethod: row.paymentMethod,
      expenseDate:   row.expenseDate,
      notes:         row.notes ?? '',
    })
    setFormErr('')
    setEditId(row.id)
    setModal('edit')
  }

  const closeModal = () => { setModal(null); setEditId(null) }

  const submitExpense = () => {
    setFormErr('')
    if (!form.categoryId) return setFormErr('Category is required')
    if (!form.description.trim()) return setFormErr('Description is required')
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) return setFormErr('Valid amount is required')
    if (!form.expenseDate) return setFormErr('Date is required')

    const payload = {
      categoryId:    form.categoryId,
      locationId:    form.locationId || undefined,
      amount,
      description:   form.description.trim(),
      paymentMethod: form.paymentMethod as 'cash' | 'card' | 'bank_transfer' | 'other',
      expenseDate:   form.expenseDate,
      notes:         form.notes.trim() || undefined,
    }

    if (modal === 'add') {
      createExpense.mutate(payload)
    } else if (editId) {
      updateExpense.mutate({ id: editId, data: payload })
    }
  }

  const openCatAdd = () => {
    setCatName(''); setCatColor(PRESET_COLORS[0]); setCatErr(''); setCatEditId(null); setCatModal('add')
  }
  const openCatEdit = (c: typeof categories[0]) => {
    setCatName(c.name); setCatColor(c.color); setCatErr(''); setCatEditId(c.id); setCatModal('edit')
  }
  const closeCatModal = () => { setCatModal(null); setCatEditId(null) }

  const submitCategory = () => {
    setCatErr('')
    if (!catName.trim()) return setCatErr('Name is required')
    if (catModal === 'add') {
      createCategory.mutate({ name: catName.trim(), color: catColor })
    } else if (catEditId) {
      updateCategory.mutate({ id: catEditId, data: { name: catName.trim(), color: catColor } })
    }
  }

  // ── Total for current filter ─────────────────────────────────
  const pageTotal = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const fmt = (n: number) => `${sym} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Styles ──────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '10px',
    padding: '8px 12px', color: t.text, fontSize: '12px', outline: 'none', fontFamily: 'inherit', width: '100%',
  }
  const btn = (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
    background: variant === 'primary' ? '#7c3aed' : variant === 'danger' ? '#ef4444' : t.inputBg,
    color: variant === 'ghost' ? t.textMuted : '#fff',
  })
  const label: React.CSSProperties = { color: t.textMuted, fontSize: '11px', fontWeight: 600, marginBottom: '5px', display: 'block' }

  const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
    return start + i
  }).filter((p) => p >= 1 && p <= totalPages)

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'slideUp 0.2s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: '21px', fontWeight: 800, letterSpacing: '-0.5px' }}>Expenses</h1>
          <p style={{ color: t.textMuted, fontSize: '12px', marginTop: '2px' }}>Track business expenses and spending by category</p>
        </div>
        <button onClick={openAdd} style={{ ...btn('primary'), display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '12px', padding: '3px', gap: '2px', width: 'fit-content' }}>
        {(['expenses', 'categories'] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '6px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
              background: tab === key ? t.surface : 'transparent',
              color:      tab === key ? t.text    : t.textMuted,
              boxShadow:  tab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {key === 'expenses' ? 'All Expenses' : 'Categories'}
          </button>
        ))}
      </div>

      {/* ── EXPENSES TAB ─────────────────────────────────────── */}
      {tab === 'expenses' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="Search description…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              style={{ ...inp, width: '200px' }}
            />
            <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }} style={{ ...inp, width: '160px' }}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterLocation} onChange={(e) => { setFilterLocation(e.target.value); setPage(1) }} style={{ ...inp, width: '150px' }}>
              <option value="">All Locations</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} style={{ ...inp, width: 'auto' }} />
            <span style={{ color: t.textFaint, fontSize: '12px' }}>→</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} style={{ ...inp, width: 'auto' }} />
            {(filterCategory || filterLocation || fromDate || toDate || search) && (
              <button
                onClick={() => { setFilterCategory(''); setFilterLocation(''); setFromDate(''); setToDate(''); setSearch(''); setPage(1) }}
                style={{ ...inp, width: 'auto', color: t.textFaint, cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Summary bar */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>{fmt(pageTotal)}</span>
              <span style={{ color: t.textMuted, fontSize: '12px', marginLeft: '6px' }}>on this page</span>
            </div>
            <div style={{ padding: '8px 16px', borderRadius: '10px', background: t.inputBg, border: `1px solid ${t.border}` }}>
              <span style={{ color: t.textMuted, fontSize: '12px' }}>{total} total records</span>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1.4fr 130px 120px 100px 120px 60px', gap: '8px', padding: '10px 16px', borderBottom: `1px solid ${t.borderMid}` }}>
              {['Date', 'Description', 'Category', 'Location', 'Method', 'Amount', ''].map((h) => (
                <span key={h} style={{ color: t.textFaint, fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</span>
              ))}
            </div>

            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>Loading…</div>
            ) : expenses.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>No expenses found</div>
            ) : expenses.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'grid', gridTemplateColumns: '110px 1.4fr 130px 120px 100px 120px 60px',
                  gap: '8px', padding: '11px 16px', alignItems: 'center',
                  borderBottom: `1px solid ${t.borderMid}`,
                  borderLeft: `3px solid ${row.categoryColor ?? '#8b5cf6'}`,
                }}
              >
                <span style={{ color: t.text, fontSize: '11px', fontWeight: 600 }}>{row.expenseDate}</span>

                <div style={{ minWidth: 0 }}>
                  <p style={{ color: t.text, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</p>
                  {row.notes && <p style={{ color: t.textFaint, fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.notes}</p>}
                </div>

                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', width: 'fit-content',
                  background: `${row.categoryColor ?? '#8b5cf6'}22`,
                  color: row.categoryColor ?? '#8b5cf6',
                }}>
                  {row.categoryName ?? '—'}
                </span>

                <span style={{ color: t.textMuted, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.locationName ?? '—'}
                </span>

                <span style={{ color: t.textMuted, fontSize: '11px' }}>
                  {PAYMENT_METHODS.find((m) => m.value === row.paymentMethod)?.label ?? row.paymentMethod}
                </span>

                <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700 }}>{fmt(Number(row.amount))}</span>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => openEdit(row)}
                    style={{ width: '26px', height: '26px', border: 'none', borderRadius: '7px', background: t.inputBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDelConfirm(row.id)}
                    style={{ width: '26px', height: '26px', border: 'none', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 6V4h4v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div style={{ padding: '11px 16px', borderTop: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: t.textFaint, fontSize: '12px' }}>Showing {expenses.length} of {total}</span>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '3px' }}>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ width: '27px', height: '27px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', background: t.inputBg, color: page === 1 ? t.textFaint : t.textMuted }}>‹</button>
                  {pageButtons.map((p) => (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: '27px', height: '27px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', background: p === page ? '#7c3aed' : t.inputBg, color: p === page ? '#fff' : t.textMuted }}>{p}</button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ width: '27px', height: '27px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', background: t.inputBg, color: page === totalPages ? t.textFaint : t.textMuted }}>›</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── CATEGORIES TAB ───────────────────────────────────── */}
      {tab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={openCatAdd} style={{ ...btn('primary'), display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Category
            </button>
          </div>

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', gap: '8px', padding: '10px 16px', borderBottom: `1px solid ${t.borderMid}` }}>
              {['Color', 'Name', 'Expenses', ''].map((h) => (
                <span key={h} style={{ color: t.textFaint, fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</span>
              ))}
            </div>

            {categories.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>No categories yet</div>
            ) : categories.map((c) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', gap: '8px', padding: '12px 16px', alignItems: 'center', borderBottom: `1px solid ${t.borderMid}` }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '7px', background: c.color }} />
                <span style={{ color: t.text, fontSize: '13px', fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: t.textMuted, fontSize: '12px' }}>—</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => openCatEdit(c)}
                    style={{ width: '26px', height: '26px', border: 'none', borderRadius: '7px', background: t.inputBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={() => setCatDelConfirm(c.id)}
                    style={{ width: '26px', height: '26px', border: 'none', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 6V4h4v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXPENSE MODAL ────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '20px', padding: '28px', width: '460px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ color: t.text, fontSize: '16px', fontWeight: 800 }}>{modal === 'add' ? 'Add Expense' : 'Edit Expense'}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textFaint, fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>

            {formErr && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '12px', marginBottom: '14px' }}>
                {formErr}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Category + Date row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={label}>Category *</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} style={inp}>
                    <option value="">Select category…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Date *</label>
                  <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} style={inp} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={label}>Description *</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What was this expense for?"
                  style={inp}
                />
              </div>

              {/* Amount + Method row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={label}>Amount *</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    style={inp}
                  />
                </div>
                <div>
                  <label style={label}>Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={inp}>
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={label}>Location</label>
                <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} style={inp}>
                  <option value="">No specific location</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={label}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes…"
                  rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: '1.5' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
              <button onClick={closeModal} style={btn('ghost')}>Cancel</button>
              <button
                onClick={submitExpense}
                disabled={createExpense.isPending || updateExpense.isPending}
                style={{ ...btn('primary'), opacity: (createExpense.isPending || updateExpense.isPending) ? 0.7 : 1 }}
              >
                {createExpense.isPending || updateExpense.isPending ? 'Saving…' : modal === 'add' ? 'Add Expense' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORY MODAL ───────────────────────────────────── */}
      {catModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '20px', padding: '28px', width: '360px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ color: t.text, fontSize: '16px', fontWeight: 800 }}>{catModal === 'add' ? 'New Category' : 'Edit Category'}</h2>
              <button onClick={closeCatModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textFaint, fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>

            {catErr && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '12px', marginBottom: '14px' }}>
                {catErr}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={label}>Name *</label>
                <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Utilities" style={inp} />
              </div>

              <div>
                <label style={label}>Color</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCatColor(c)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px', background: c, border: 'none', cursor: 'pointer',
                        outline: catColor === c ? `3px solid ${t.text}` : '3px solid transparent',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: catColor }} />
                  <input
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    placeholder="#8b5cf6"
                    style={{ ...inp, width: '120px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
              <button onClick={closeCatModal} style={btn('ghost')}>Cancel</button>
              <button
                onClick={submitCategory}
                disabled={createCategory.isPending || updateCategory.isPending}
                style={{ ...btn('primary'), opacity: (createCategory.isPending || updateCategory.isPending) ? 0.7 : 1 }}
              >
                {createCategory.isPending || updateCategory.isPending ? 'Saving…' : catModal === 'add' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM (expense) ─────────────────────────── */}
      {delConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px', width: '320px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h3 style={{ color: t.text, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Delete Expense?</h3>
            <p style={{ color: t.textMuted, fontSize: '12px', marginBottom: '20px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDelConfirm(null)} style={btn('ghost')}>Cancel</button>
              <button onClick={() => deleteExpense.mutate({ id: delConfirm })} style={btn('danger')}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM (category) ────────────────────────── */}
      {catDelConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px', width: '340px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h3 style={{ color: t.text, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Delete Category?</h3>
            <p style={{ color: t.textMuted, fontSize: '12px', marginBottom: '20px' }}>Categories with existing expenses will be deactivated instead of deleted.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setCatDelConfirm(null)} style={btn('ghost')}>Cancel</button>
              <button onClick={() => deleteCategory.mutate({ id: catDelConfirm })} style={btn('danger')}>
                {deleteCategory.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
