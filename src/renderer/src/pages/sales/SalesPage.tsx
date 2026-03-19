import React, { useState } from 'react'
import { AppSelect } from '../../components/ui/AppSelect';
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { trpc } from '../../trpc-client/trpc'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { POSTerminal } from './POSTerminal'
import { VoucherView, type SaleDetail } from './VoucherView'
import { OnlineOrdersTab } from './OnlineOrdersTab'

// ── Constants ─────────────────────────────────────────────────

type SaleStatus = 'draft' | 'completed' | 'voided' | 'refunded' | 'partially_refunded'

const STATUS_COLORS: Record<SaleStatus, { bg: string; text: string }> = {
	draft: { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
	completed: { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
	voided: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
	refunded: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
	partially_refunded: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
}

const METHOD_LABELS: Record<string, string> = {
	cash: 'Cash', credit_card: 'Credit Card', debit_card: 'Debit Card',
	qr_code: 'QR Code', store_credit: 'Store Credit', loyalty_points: 'Points',
}

type Tab = 'history' | 'pos' | 'online'

// ── Sales History sub-component ───────────────────────────────

const SalesHistory: React.FC<{ onShowVoucher: (sale: SaleDetail) => void }> = ({ onShowVoucher }) => {
	const t = useAppStore((s) => s.theme)
	const isDark = useAppStore((s) => s.isDark)
	const tr = useAppStore((s) => s.tr)
	const sym = useAppStore((s) => s.currency.symbol)
	const currentUser = useAppStore((s) => s.currentUser)

	const [statusFilter, setStatusFilter] = useState<SaleStatus | undefined>(undefined)
	const [orderTypeFilter, setOrderTypeFilter] = useState<'pos' | 'online' | undefined>(undefined)
	const [page, setPage] = useState(1)
	const [detailId, setDetailId] = useState<string | null>(null)
	const [fromDate, setFromDate] = useState('')
	const [toDate, setToDate] = useState('')

	// ── Debt payment state ───────────────────────────────────────
	const [debtPayAmount, setDebtPayAmount] = useState('')
	const payDebtMut = trpc.sale.payDebt.useMutation({
		onSuccess: () => { refetch(); refetchDetail(); setDebtPayAmount('') },
		onError: (e) => setActionError(e.message),
	})

	// ── Void / Return state ──────────────────────────────────────
	const [actionMode, setActionMode] = useState<'void' | 'return' | null>(null)
	const [voidReason, setVoidReason] = useState('')
	const [processedBy, setProcessedBy] = useState('')
	const [returnQtys, setReturnQtys] = useState<Record<string, number>>({})
	const [returnReason, setReturnReason] = useState('')
	const [actionError, setActionError] = useState('')

	const PAGE_SIZE = 20

	const { data, isLoading, refetch } = trpc.sale.list.useQuery({
		page,
		pageSize: PAGE_SIZE,
		status: statusFilter,
		orderType: orderTypeFilter,
		fromDate: fromDate || undefined,
		toDate: toDate || undefined,
	})
	const sales = data?.data ?? []
	const total = data?.total ?? 0
	const totalPages = Math.max(data?.totalPages ?? 1, 1)

	const { data: detail, refetch: refetchDetail } = trpc.sale.getById.useQuery(
		{ id: detailId! },
		{ enabled: !!detailId },
	)

	const { data: usrsData } = trpc.user.list.useQuery({ pageSize: 100, isActive: true })
	const users = usrsData?.data ?? []

	const closeModal = () => {
		setDetailId(null)
		setActionMode(null)
		setVoidReason('')
		setReturnQtys({})
		setReturnReason('')
		setActionError('')
		setDebtPayAmount('')
	}

	// Auto-select first user as processedBy when users load
	React.useEffect(() => {
		if (users.length > 0 && !processedBy) setProcessedBy(users[0].id)
	}, [users])

	// Reset action state when switching sale
	React.useEffect(() => {
		setActionMode(null)
		setVoidReason('')
		setReturnQtys({})
		setReturnReason('')
		setActionError('')
	}, [detailId])

	const voidMut = trpc.sale.void.useMutation({
		onSuccess: () => { refetch(); refetchDetail(); closeModal() },
		onError: (e) => setActionError(e.message),
	})

	const returnMut = trpc.sale.return.useMutation({
		onSuccess: () => { refetch(); refetchDetail(); closeModal() },
		onError: (e) => setActionError(e.message),
	})

	const handleVoid = () => {
		if (!voidReason.trim()) { setActionError('Reason is required.'); return }
		if (!processedBy) { setActionError('Select a user.'); return }
		setActionError('')
		voidMut.mutate({ saleId: detailId!, voidedBy: processedBy, reason: voidReason.trim() })
	}

	const handleReturn = () => {
		const items = Object.entries(returnQtys)
			.filter(([, qty]) => qty > 0)
			.map(([productId, qty]) => ({ productId, qty }))
		if (!items.length) { setActionError('Select at least one item to return.'); return }
		if (!processedBy) { setActionError('Select a user.'); return }
		setActionError('')
		returnMut.mutate({ saleId: detailId!, returnItems: items, processedBy, reason: returnReason || undefined })
	}

	const detailStatus = (detail as any)?.status as SaleStatus | undefined
	const canVoid = detailStatus === 'completed'
	const canReturn = detailStatus === 'completed' || detailStatus === 'partially_refunded'

	const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
		const start = Math.max(1, Math.min(page - 2, totalPages - 4))
		return start + i
	}).filter((p) => p >= 1 && p <= totalPages)



	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
			{/* Filters row */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
				<p style={{ color: t.textMuted, fontSize: '12px' }}>{total} transactions</p>
				<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
					<DateRangePicker
						fromDate={fromDate} toDate={toDate} t={t} isDark={isDark}
						onChange={(from, to) => { setFromDate(from); setToDate(to); setPage(1) }}
					/>
				</div>
			</div>

			{/* Filter rows */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
				{/* Type filter */}
				<div style={{ display: 'flex', gap: '5px' }}>
					{([undefined, 'pos', 'online'] as ('pos' | 'online' | undefined)[]).map((ot) => {
						const label = ot === 'pos' ? 'POS' : ot === 'online' ? 'Online' : 'All Types'
						const active = orderTypeFilter === ot
						const bg = ot === 'pos' ? 'rgba(99,102,241,0.15)' : ot === 'online' ? 'rgba(6,182,212,0.15)' : 'var(--primary-15)'
						const col = ot === 'pos' ? '#818cf8' : ot === 'online' ? '#06b6d4' : 'var(--primary)'
						return (
							<button
								key={String(ot)}
								onClick={() => { setOrderTypeFilter(ot); setPage(1) }}
								style={{ padding: '5px 12px', borderRadius: '9px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: active ? bg : t.inputBg, color: active ? col : t.textFaint }}
							>
								{label}
							</button>
						)
					})}
				</div>
				{/* Status tabs */}
				<div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
					{([undefined, 'completed', 'voided', 'refunded', 'partially_refunded', 'draft'] as (SaleStatus | undefined)[]).map((s) => {
						const label = s ? s.replace('_', ' ') : 'All Status'
						const active = statusFilter === s
						const col = s ? STATUS_COLORS[s] : null
						return (
							<button
								key={String(s)}
								onClick={() => { setStatusFilter(s); setPage(1) }}
								style={{ padding: '5px 12px', borderRadius: '9px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', background: active ? (col?.bg ?? 'var(--primary-15)') : t.inputBg, color: active ? (col?.text ?? 'var(--primary)') : t.textFaint }}
							>
								{label}
							</button>
						)
					})}
				</div>
			</div>

			{/* Table */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
				<div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 110px 56px 90px 90px 100px', gap: '8px', padding: '10px 18px', borderBottom: `1px solid ${t.borderMid}` }}>
					{['Sale #', 'Customer', 'Location', 'Date / Time', 'Type', 'Status', 'Payment', 'Total'].map((h) => (
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
						const payRef = (s as any).primaryPaymentReference as string | null | undefined
						const totalAmt = Number((s as any).totalAmount ?? 0)
						const paidAmt  = Number((s as any).paidAmount ?? totalAmt)
						const hasDebt  = paidAmt < totalAmt - 0.001
						const orderType = ((s as any).orderType ?? 'pos') as 'pos' | 'online'
						const typeBg = orderType === 'online' ? 'rgba(6,182,212,0.15)' : 'rgba(99,102,241,0.12)'
						const typeCol = orderType === 'online' ? '#06b6d4' : '#818cf8'
						return (
							<div
								key={s.id}
								onClick={() => setDetailId(s.id)}
								style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 110px 56px 90px 90px 100px', gap: '8px', padding: '13px 18px', alignItems: 'center', borderBottom: `1px solid ${t.borderMid}`, cursor: 'pointer', transition: 'background 0.15s' }}
								onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
								onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
							>
								<span style={{ color: t.textFaint, fontSize: '11px', fontFamily: 'monospace' }}>#{String(s.id).slice(-8).toUpperCase()}</span>
								<span style={{ color: t.text, fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customerName}</span>
								<span style={{ color: t.textMuted, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationName}</span>
								<div>
									<p style={{ color: t.text, fontSize: '11px', fontWeight: 500 }}>{new Date((s as any).createdAt).toLocaleDateString()}</p>
									<p style={{ color: t.textFaint, fontSize: '10px' }}>{new Date((s as any).createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
								</div>
								<span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 700, background: typeBg, color: typeCol, textTransform: 'uppercase', width: 'fit-content' }}>{orderType}</span>
								<span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: sc.bg, color: sc.text, textTransform: 'capitalize', width: 'fit-content' }}>{status.replace('_', ' ')}</span>
								<span style={{ color: t.textMuted, fontSize: '11px' }}>{payMethod === 'qr_code' && payRef ? payRef.split(': ')[0] : METHOD_LABELS[payMethod] ?? payMethod}</span>
								<div>
								<span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>{sym}{totalAmt.toLocaleString()}</span>
								{hasDebt && (
									<p style={{ color: '#ef4444', fontSize: '10px', fontWeight: 700, marginTop: '1px' }}>
										Debt {sym}{(totalAmt - paidAmt).toLocaleString()}
									</p>
								)}
							</div>
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
								<button key={p} onClick={(e) => { e.stopPropagation(); setPage(p) }} style={{ width: '27px', height: '27px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', background: p === page ? 'var(--primary)' : t.inputBg, color: p === page ? '#fff' : t.textMuted }}>
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
					onClick={closeModal}
				>
					<div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
					<div
						onClick={(e) => e.stopPropagation()}
						style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 16px', background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'slideUp 0.22s ease', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
					>
						{/* Modal header */}
						<div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
							<div>
								<h2 style={{ color: t.text, fontWeight: 700, fontSize: '15px' }}>Sale #{detailId.slice(-8).toUpperCase()}</h2>
								{detail && <p style={{ color: t.textMuted, fontSize: '11px', marginTop: '2px' }}>{new Date((detail as any).createdAt).toLocaleString()}</p>}
							</div>
							<div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
								{detail && actionMode === null && (
									<button
										onClick={() => { closeModal(); onShowVoucher(detail as unknown as SaleDetail) }}
										style={{ padding: '5px 12px', borderRadius: '9px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
									>
										Print
									</button>
								)}
								{actionMode !== null && (
									<button onClick={() => { setActionMode(null); setActionError('') }} style={{ padding: '5px 12px', borderRadius: '9px', border: `1px solid ${t.border}`, background: 'transparent', color: t.textMuted, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
										← Back
									</button>
								)}
								<button onClick={closeModal} style={{ width: '27px', height: '27px', borderRadius: '8px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
									<Icon name="close" size={13} />
								</button>
							</div>
						</div>

						{/* Modal body */}
						<div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
							{!detail ? (
								<p style={{ color: t.textFaint, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>Loading...</p>
							) : actionMode === 'void' ? (
								/* ── VOID FORM ──────────────────────────────────── */
								<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
									<div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '12px 14px' }}>
										<p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700, marginBottom: '3px' }}>Void Sale</p>
										<p style={{ color: t.textMuted, fontSize: '11px' }}>This will reverse all stock movements and mark the sale as voided. This action cannot be undone.</p>
									</div>

									<div>
										<p style={{ color: t.textMuted, fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>Reason <span style={{ color: '#ef4444' }}>*</span></p>
										<textarea
											value={voidReason}
											onChange={(e) => setVoidReason(e.target.value)}
											placeholder="Enter reason for voiding this sale…"
											rows={3}
											style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '10px', padding: '9px 12px', color: t.text, fontSize: '12px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
										/>
									</div>

									<div>
										<p style={{ color: t.textMuted, fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>Processed by</p>
																		<AppSelect
										value={processedBy}
										onChange={setProcessedBy}
										options={users.map((u: any) => ({ value: u.id, label: u.name }))}
										isSearchable={false}
									/>
									</div>

									{actionError && <p style={{ color: '#ef4444', fontSize: '12px' }}>{actionError}</p>}

									<button
										onClick={handleVoid}
										disabled={voidMut.isPending}
										style={{ padding: '10px 0', borderRadius: '11px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: voidMut.isPending ? 0.7 : 1 }}
									>
										{voidMut.isPending ? 'Processing…' : 'Confirm Void'}
									</button>
								</div>

							) : actionMode === 'return' ? (
								/* ── RETURN FORM ────────────────────────────────── */
								<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
									<div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '12px 14px' }}>
										<p style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 700, marginBottom: '3px' }}>Return Items</p>
										<p style={{ color: t.textMuted, fontSize: '11px' }}>Select the items and quantities to return. Stock will be credited back automatically.</p>
									</div>

									{/* Item qty selectors */}
									<div>
										<p style={{ color: t.textMuted, fontSize: '11px', fontWeight: 600, marginBottom: '8px' }}>Select items to return</p>
										<div style={{ background: t.inputBg, borderRadius: '12px', overflow: 'hidden' }}>
											{((detail as any).items as any[]).map((item: any, i: number) => {
												const maxQty = Number(item.qty)
												const retQty = returnQtys[item.productId] ?? 0
												return (
													<div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: i < (detail as any).items.length - 1 ? `1px solid ${t.borderMid}` : 'none' }}>
														<div style={{ flex: 1, minWidth: 0 }}>
															<p style={{ color: t.text, fontSize: '12px', fontWeight: 500 }}>{item.productName ?? '—'}</p>
															<p style={{ color: t.textFaint, fontSize: '11px' }}>Sold: {maxQty}</p>
														</div>
														<div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
															<button onClick={() => setReturnQtys((p) => ({ ...p, [item.productId]: Math.max(0, (p[item.productId] ?? 0) - 1) }))} style={{ width: '26px', height: '26px', borderRadius: '7px', border: `1px solid ${t.border}`, background: t.surface, color: t.text, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
															<span style={{ width: '28px', textAlign: 'center', color: retQty > 0 ? '#f59e0b' : t.text, fontWeight: retQty > 0 ? 700 : 400, fontSize: '13px' }}>{retQty}</span>
															<button onClick={() => setReturnQtys((p) => ({ ...p, [item.productId]: Math.min(maxQty, (p[item.productId] ?? 0) + 1) }))} style={{ width: '26px', height: '26px', borderRadius: '7px', border: `1px solid ${t.border}`, background: t.surface, color: t.text, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
														</div>
													</div>
												)
											})}
										</div>
									</div>

									<div>
										<p style={{ color: t.textMuted, fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>Reason <span style={{ color: t.textFaint }}>(optional)</span></p>
										<input
											value={returnReason}
											onChange={(e) => setReturnReason(e.target.value)}
											placeholder="Return reason…"
											style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '10px', padding: '8px 12px', color: t.text, fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
										/>
									</div>

									<div>
										<p style={{ color: t.textMuted, fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>Processed by</p>
																		<AppSelect
										value={processedBy}
										onChange={setProcessedBy}
										options={users.map((u: any) => ({ value: u.id, label: u.name }))}
										isSearchable={false}
									/>
									</div>

									{actionError && <p style={{ color: '#ef4444', fontSize: '12px' }}>{actionError}</p>}

									<button
										onClick={handleReturn}
										disabled={returnMut.isPending}
										style={{ padding: '10px 0', borderRadius: '11px', border: 'none', background: '#f59e0b', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: returnMut.isPending ? 0.7 : 1 }}
									>
										{returnMut.isPending ? 'Processing…' : 'Process Return'}
									</button>
								</div>

							) : (
								/* ── NORMAL DETAIL VIEW ─────────────────────────── */
								<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
									{/* Meta */}
									<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
										{[
											['Customer', (detail as any).customerName ?? 'Walk-in'],
											['Location', (detail as any).locationName ?? '—'],
											['Cashier', (detail as any).cashierName ?? '—'],
											['Status', ((detail as any).status ?? '—').replace('_', ' ')],
										].map(([label, val]) => (
											<div key={label} style={{ background: t.inputBg, borderRadius: '10px', padding: '9px 12px' }}>
												<p style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{label}</p>
												<p style={{ color: label === 'Status' ? (STATUS_COLORS[val as SaleStatus]?.text ?? t.text) : t.text, fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{val}</p>
											</div>
										))}
									</div>

									{/* Items */}
									{Array.isArray((detail as any).items) && (detail as any).items.length > 0 && (
										<div>
											<p style={{ color: t.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '7px' }}>Items</p>
											<div style={{ background: t.inputBg, borderRadius: '10px', overflow: 'hidden' }}>
												{((detail as any).items as any[]).map((item: any, i: number) => (
													<div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: i < (detail as any).items.length - 1 ? `1px solid ${t.borderMid}` : 'none' }}>
														<div>
															<p style={{ color: t.text, fontSize: '12px', fontWeight: 500 }}>{item.productName ?? '—'}</p>
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
											<p style={{ color: t.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '7px' }}>Payments</p>
											<div style={{ background: t.inputBg, borderRadius: '10px', overflow: 'hidden' }}>
												{((detail as any).payments as any[]).map((pay: any, i: number) => (
													<div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: i < (detail as any).payments.length - 1 ? `1px solid ${t.borderMid}` : 'none' }}>
														<span style={{ color: t.textMuted, fontSize: '12px' }}>{pay.method === 'qr_code' && pay.reference ? pay.reference.split(': ')[0] : METHOD_LABELS[pay.method] ?? pay.method}</span>
														<span style={{ color: t.text, fontSize: '13px', fontWeight: 600 }}>{sym}{Number(pay.amount).toLocaleString()}</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Totals */}
									<div style={{ borderTop: `1px solid ${t.borderMid}`, paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
										{(() => {
											const detailTotal = Number((detail as any).totalAmount ?? 0)
											const detailPaid  = Number((detail as any).paidAmount ?? detailTotal)
											const detailDebt  = Math.max(0, detailTotal - detailPaid)
											if (detailDebt <= 0) return null
											return (
												<>
													<div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '5px' }}>
														<span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>Outstanding Debt</span>
														<span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 800 }}>{sym}{detailDebt.toLocaleString()}</span>
													</div>
													<div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
														<input
															type="number" min="0.01" max={detailDebt} step="0.01"
															value={debtPayAmount}
															onChange={(e) => setDebtPayAmount(e.target.value)}
															placeholder={`Max ${sym}${detailDebt.toFixed(2)}`}
															style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '8px', padding: '7px 10px', color: t.text, fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}
														/>
														<button
															onClick={() => {
																const amt = parseFloat(debtPayAmount)
																if (!amt || amt <= 0) return
																payDebtMut.mutate({ saleId: detailId!, method: 'cash', amount: amt })
															}}
															disabled={!debtPayAmount || parseFloat(debtPayAmount) <= 0 || payDebtMut.isPending}
															style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
														>
															{payDebtMut.isPending ? 'Saving…' : 'Pay Debt'}
														</button>
													</div>
												</>
											)
										})()}
									</div>

									{/* Action buttons */}
									{(canVoid || canReturn) && (
										<div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: `1px solid ${t.borderMid}` }}>
											{canReturn && (
												<button
													onClick={() => setActionMode('return')}
													style={{ flex: 1, padding: '9px 0', borderRadius: '11px', border: `1.5px solid #f59e0b`, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
												>
													Return Items
												</button>
											)}
											{canVoid && currentUser?.role !== 'cashier' && (
												<button
													onClick={() => setActionMode('void')}
													style={{ flex: 1, padding: '9px 0', borderRadius: '11px', border: `1.5px solid #ef4444`, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
												>
													Void Sale
												</button>
											)}
										</div>
									)}
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
	const currentUser = useAppStore((s) => s.currentUser)

	const [tab, setTab] = useState<Tab>('pos')
	const [voucher, setVoucher] = useState<SaleDetail | null>(null)
	const [voucherAddressId, setVoucherAddressId] = useState<string | undefined>(undefined)
	const [locationId, setLocationId] = useState('')

	const { data: locationsData } = trpc.location.list.useQuery({ pageSize: 100 })
	const locations = locationsData?.data ?? []

	React.useEffect(() => {
		if (!locationId && locations.length > 0) {
			const def = locations.find((l: any) => l.isDefault) ?? locations[0]
			if (def) setLocationId(def.id)
		}
	}, [locations, locationId])

	const tabBtn = (label: string, value: Tab, icon: string) => {
		const active = tab === value
		return (
			<button
				onClick={() => setTab(value)}
				style={{
					display: 'flex', alignItems: 'center', gap: '7px',
					padding: '8px 16px', borderRadius: '11px', border: 'none',
					fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
					background: active ? 'var(--primary)' : t.inputBg,
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
		<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
			{/* Single combined toolbar row */}
			<div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
				{/* Left: Location + Cashier */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					<AppSelect
						value={locationId}
						onChange={setLocationId}
						options={[{ value: '', label: 'Select location…' }, ...locations.map((l: any) => ({ value: l.id, label: l.name }))]}
						isSearchable={false}
						minWidth={180}
					/>
					{!locationId && (
						<span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600 }}>⚠ Select location</span>
					)}
					{locationId && (
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '10px' }}>
							<span style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cashier</span>
							<span style={{ color: t.text, fontSize: '12px', fontWeight: 600 }}>{currentUser?.name ?? '—'}</span>
						</div>
					)}
				</div>

				{/* Right: Tabs */}
				<div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
					{tabBtn('New Sale', 'pos', 'plus')}
					{tabBtn('Online Orders', 'online', 'sale')}
					{tabBtn('History', 'history', 'sale')}
				</div>
			</div>

			{/* Tab content */}
			{tab === 'history' && (
				<SalesHistory onShowVoucher={(sale) => setVoucher(sale)} />
			)}
			{tab === 'online' && (
				<OnlineOrdersTab />
			)}
			{tab === 'pos' && (
				<POSTerminal
					locationId={locationId}
					setLocationId={setLocationId}
					onComplete={(sale, addressId) => {
						setVoucher(sale)
						setVoucherAddressId(addressId)
						setTab('history')
					}}
				/>
			)}

			{/* Voucher modal (shown after POS checkout or from history) */}
			{voucher && (
				<VoucherView
					sale={voucher}
					selectedAddressId={voucherAddressId}
					onClose={() => { setVoucher(null); setVoucherAddressId(undefined) }}
					onNewSale={() => { setVoucher(null); setVoucherAddressId(undefined); setTab('pos') }}
				/>
			)}
		</div>
	)
}
