import React, { useState, useEffect, useMemo } from 'react'
import { AppSelect } from '../../components/ui/AppSelect';
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { trpc } from '../../trpc-client/trpc'
import type { SaleDetail } from './VoucherView'

// ── Types ─────────────────────────────────────────────────────

type CartLine = {
	cartKey: string         // variantId ?? productId  (unique cart key)
	productId: string
	variantId?: string
	variantLabel?: string   // "Red / M"
	name: string
	sku: string
	imageUrl: string | null
	qty: number
	unitPrice: number
	baseSellPrice: number
	baseWholesalePrice: number | null
	taxRate: number
	discountAmount: number
}

type PaymentMethod = 'cash' | 'qr_code' | 'credit'


const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
	{ value: 'cash', label: 'Cash' },
	{ value: 'qr_code', label: 'QR / Bank' },
	{ value: 'credit', label: 'Credit' },
]

// ── Payment Account Picker Modal ──────────────────────────────

type BankAccount = {
	id: string
	provider: string
	accountNumber: string
	accountName: string
	providerLogo: string | null
	qrCode: string | null
	isActive: boolean
}

interface PaymentAccountPickerProps {
	accounts: BankAccount[]
	selected: BankAccount | null
	onSelect: (acc: BankAccount) => void
	onClose: () => void
}

const PaymentAccountPickerModal: React.FC<PaymentAccountPickerProps> = ({ accounts, selected, onSelect, onClose }) => {
	const t = useAppStore((s) => s.theme)

	return (
		<div
			style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
			onClick={onClose}
		>
			<div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					position: 'relative', width: '100%', maxWidth: '480px', margin: '0 16px',
					background: t.surface, border: `1px solid ${t.borderStrong}`,
					borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
					overflow: 'hidden', animation: 'slideUp 0.22s ease',
				}}
			>
				{/* Header */}
				<div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>
						<p style={{ color: t.text, fontWeight: 700, fontSize: '14px' }}>Select Payment Account</p>
						<p style={{ color: t.textFaint, fontSize: '11px' }}>Show QR code or account details to customer</p>
					</div>
					<button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<Icon name="close" size={13} />
					</button>
				</div>

				{/* Account list */}
				<div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
					{accounts.map((acc) => {
						const isSelected = selected?.id === acc.id
						return (
							<button
								key={acc.id}
								onClick={() => { onSelect(acc); onClose() }}
								style={{
									width: '100%', textAlign: 'left', padding: '12px 14px',
									borderRadius: '12px', border: `2px solid ${isSelected ? 'var(--primary)' : t.inputBorder}`,
									background: isSelected ? 'var(--primary-10)' : t.inputBg,
									cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '12px',
									transition: 'all 0.15s',
								}}
								onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = t.borderStrong }}
								onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = t.inputBorder }}
							>
								{/* Logo */}
								<div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${t.border}` }}>
									{acc.providerLogo
										? <img src={acc.providerLogo} alt={acc.provider} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '5px' }} />
										: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
												<rect x="1" y="4" width="22" height="5" rx="1" />
												<path d="M1 9h22v11a2 2 0 01-2 2H3a2 2 0 01-2-2V9z" />
												<line x1="5" y1="15" x2="9" y2="15" />
											</svg>
									}
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<p style={{ color: t.text, fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>{acc.provider}</p>
									<p style={{ color: t.textMuted, fontSize: '12px', fontWeight: 600 }}>{acc.accountNumber}</p>
									<p style={{ color: t.textFaint, fontSize: '11px' }}>{acc.accountName}</p>
								</div>
								{acc.qrCode && (
									<div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${t.border}`, flexShrink: 0 }}>
										<img src={acc.qrCode} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
									</div>
								)}
								{isSelected && (
									<div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
										<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
											<polyline points="20 6 9 17 4 12" />
										</svg>
									</div>
								)}
							</button>
						)
					})}
				</div>
			</div>
		</div>
	)
}

interface Props {
	onComplete: (sale: SaleDetail, addressId?: string) => void
	locationId: string
	setLocationId: (id: string) => void
}

// ── Variant Picker Modal ──────────────────────────────────────

interface VariantPickerProps {
	product: any
	onSelect: (product: any, variant: any) => void
	onClose: () => void
	customerType: 'retail' | 'wholesale'
}

const VariantPickerModal: React.FC<VariantPickerProps> = ({ product, onSelect, onClose, customerType }) => {
	const t = useAppStore((s) => s.theme)
	const sym = useAppStore((s) => s.currency.symbol)
	const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

	const { data: pickerData, isLoading } = trpc.variant.getPickerData.useQuery(
		{ productId: product.id },
		{ enabled: !!product.id }
	)

	const attributes = pickerData?.attributes ?? []
	const variants = pickerData?.variants ?? []

	// Match a variant whose optionIds are exactly the set of selected option IDs
	// (length must match so we don't accidentally match a superset variant)
	const matchedVariant = variants.find((v: any) => {
		const selectedIds = Object.values(selectedOptions) as string[]
		if (selectedIds.length === 0) return false
		if (selectedIds.length !== v.optionIds.length) return false
		return selectedIds.every((id) => v.optionIds.includes(id))
	})

	const hasSelection = Object.keys(selectedOptions).length > 0

	return (
		<div
			style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
			onClick={onClose}
		>
			<div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					position: 'relative', width: '100%', maxWidth: '440px', margin: '0 16px',
					background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: '20px',
					boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden',
					animation: 'slideUp 0.22s ease',
				}}
			>
				{/* Header */}
				<div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>
						<p style={{ color: t.text, fontWeight: 700, fontSize: '14px' }}>{product.name}</p>
						<p style={{ color: t.textFaint, fontSize: '11px' }}>{product.sku}</p>
					</div>
					<button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<Icon name="close" size={13} />
					</button>
				</div>

				{/* Body */}
				<div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
					{isLoading && (
						<p style={{ color: t.textFaint, fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>Loading variants...</p>
					)}

					{!isLoading && attributes.map((attr: any) => (
						<div key={attr.id}>
							<p style={{ color: t.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{attr.name}</p>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
								{attr.options.map((opt: any) => {
									const isSelected = selectedOptions[attr.id] === opt.id
									return (
										<button
											key={opt.id}
											onClick={() => setSelectedOptions((prev) => ({ ...prev, [attr.id]: opt.id }))}
											style={{
												padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
												fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
												background: isSelected ? 'var(--primary)' : t.inputBg,
												color: isSelected ? '#fff' : t.text,
												transition: 'all 0.15s',
											}}
										>
											{opt.value}
										</button>
									)
								})}
							</div>
						</div>
					))}

					{!isLoading && attributes.length === 0 && (
						<p style={{ color: t.textFaint, fontSize: '12px', textAlign: 'center' }}>No variants configured.</p>
					)}
				</div>

				{/* Footer */}
				<div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${t.borderMid}`, display: 'flex', gap: '8px', alignItems: 'center' }}>
					<div style={{ flex: 1 }}>
						{matchedVariant ? (
							<div>
								{customerType === 'wholesale' && matchedVariant.wholesalePrice != null ? (
									<>
										<p style={{ color: '#f59e0b', fontSize: '15px', fontWeight: 800 }}>{sym}{Number(matchedVariant.wholesalePrice).toLocaleString()}</p>
										<p style={{ color: t.textFaint, fontSize: '10px', textDecoration: 'line-through' }}>{sym}{Number(matchedVariant.sellingPrice).toLocaleString()}</p>
									</>
								) : (
									<p style={{ color: 'var(--primary)', fontSize: '15px', fontWeight: 800 }}>{sym}{Number(matchedVariant.sellingPrice).toLocaleString()}</p>
								)}
							</div>
						) : (
							<p style={{ color: t.textFaint, fontSize: '12px' }}>
								{hasSelection ? 'Variant unavailable' : 'Select options'}
							</p>
						)}
					</div>
					<button
						onClick={() => { if (matchedVariant) onSelect(product, matchedVariant) }}
						disabled={!matchedVariant}
						style={{
							padding: '10px 20px', borderRadius: '11px', border: 'none',
							background: matchedVariant ? 'var(--primary)' : t.inputBg,
							color: matchedVariant ? '#fff' : t.textFaint,
							fontSize: '13px', fontWeight: 700, cursor: matchedVariant ? 'pointer' : 'not-allowed',
							fontFamily: 'inherit', transition: 'all 0.15s',
						}}
					>
						Add to Cart
					</button>
				</div>
			</div>
		</div>
	)
}

// ── Component ─────────────────────────────────────────────────

export const POSTerminal: React.FC<Props> = ({ onComplete, locationId, setLocationId }) => {
	const t = useAppStore((s) => s.theme)
	const sym = useAppStore((s) => s.currency.symbol)
	const currentUser = useAppStore((s) => s.currentUser)

	const cashierId = currentUser?.id ?? ''

	// ── Cart ──
	const [cart, setCart] = useState<CartLine[]>([])
	const [productSearch, setProductSearch] = useState('')
	const [headerDiscount, setHeaderDiscount] = useState('')
	const [notes, setNotes] = useState('')

	// ── Variant picker ──
	const [pendingVariantProduct, setPendingVariantProduct] = useState<any>(null)

	// ── Customer ──
	const [customerId, setCustomerId] = useState<string | null>(null)
	const [selectedCustomerName, setSelectedCustomerName] = useState('')
	const [selectedCustomerType, setSelectedCustomerType] = useState<'retail' | 'wholesale'>('retail')
	const [customerSearch, setCustomerSearch] = useState('')
	const [showCustomerDrop, setShowCustomerDrop] = useState(false)
	// ── Payment ──
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
	const [cashReceived, setCashReceived] = useState('')
	const [selectedPayAccount, setSelectedPayAccount] = useState<BankAccount | null>(null)
	const [showPayAccountPicker, setShowPayAccountPicker] = useState(false)

	// ── Queries ──
	const { data: locData } = trpc.location.list.useQuery({ pageSize: 100, isActive: true }, { staleTime: 0 })
	const { data: prodData } = trpc.product.list.useQuery(
		{ search: productSearch || undefined, pageSize: 24, isActive: true },
		{ enabled: !locationId },
	)
	const { data: stockData } = trpc.stock.allProducts.useQuery(
		{ locationId, search: productSearch || undefined, pageSize: 24 },
		{ enabled: !!locationId },
	)
	const { data: custData } = trpc.customer.list.useQuery(
		{ search: customerSearch, pageSize: 8, isActive: true },
		{ enabled: customerSearch.length >= 2 },
	)
	const { data: payAccounts = [] } = trpc.paymentAccount.list.useQuery(
		{ onlyActive: true },
		{ staleTime: 30_000 },
	)
	const locations = locData?.data ?? []
	// stock.allProducts returns 'productId' as the id field — normalise to 'id'
	const products = locationId
		? (stockData?.data ?? []).map((p: any) => ({ ...p, id: p.productId ?? p.id }))
		: (prodData?.data ?? [])

	// Build productId -> qtyOnHand map from stock query
	const stockMap = useMemo(() => {
		const map: Record<string, number> = {}
		if (locationId && stockData?.data) {
			for (const p of stockData.data as any[]) {
				const pid = (p as any).productId ?? (p as any).id
				if (pid) map[pid] = Number((p as any).qtyOnHand ?? 0)
			}
		}
		return map
	}, [locationId, stockData])

	// Sync to default location whenever locations data changes
	useEffect(() => {
		if (locations.length === 0) return
		const def = (locations as any[]).find((l) => l.isDefault) ?? locations[0]
		if (def) setLocationId(def.id)
	}, [locations])
	const customers = custData?.data ?? []

	// ── Computed totals ──
	const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0)
	const discountNum = Math.max(0, Number(headerDiscount) || 0)
	const taxTotal = cart.reduce((s, l) => s + (l.qty * l.unitPrice - l.discountAmount) * l.taxRate, 0)
	const grandTotal = Math.max(0, subtotal - discountNum + taxTotal)
	const receivedNum = Number(cashReceived) || 0
	const change = paymentMethod === 'cash' ? receivedNum - grandTotal : 0

	// ── Cart actions ──

	/** Add a plain (non-variant) product directly */
	const addToCartDirect = (product: any, variant?: any) => {
		const cartKey = variant ? variant.id : product.id
		const baseSell = variant ? Number(variant.sellingPrice) : Number(product.sellingPrice)
		const baseWholesale = variant
			? (variant.wholesalePrice != null ? Number(variant.wholesalePrice) : null)
			: (product.wholesalePrice != null ? Number(product.wholesalePrice) : null)
		const unitPrice = selectedCustomerType === 'wholesale' && baseWholesale != null
			? baseWholesale
			: baseSell
		const variantLabel = variant?.label
		// Only enforce stock limit for non-variant products (variant stock handled separately)
		const maxStock = !variant ? (stockMap[product.id] ?? Infinity) : Infinity

		setCart((prev) => {
			const existing = prev.find((l) => l.cartKey === cartKey)
			if (existing) {
				if (existing.qty >= maxStock) return prev  // already at limit
				return prev.map((l) => l.cartKey === cartKey ? { ...l, qty: l.qty + 1 } : l)
			}
			if (maxStock <= 0) return prev  // out of stock, can't add
			return [...prev, {
				cartKey,
				productId: product.id,
				variantId: variant?.id,
				variantLabel,
				name: product.name,
				sku: variant?.sku ?? product.sku,
				imageUrl: product.imageUrl ?? null,
				qty: 1,
				unitPrice,
				baseSellPrice: baseSell,
				baseWholesalePrice: baseWholesale,
				taxRate: Number(product.taxRate ?? 0),
				discountAmount: 0,
			}]
		})
	}

	const addToCart = (product: any) => {
		// hasVariants comes back as 1/0 from SQLite
		if (product.hasVariants) {
			setPendingVariantProduct(product)
		} else {
			addToCartDirect(product)
		}
	}

	const updateQty = (cartKey: string, qty: number) => {
		if (qty <= 0) {
			setCart((prev) => prev.filter((l) => l.cartKey !== cartKey))
		} else {
			setCart((prev) => prev.map((l) => l.cartKey === cartKey ? { ...l, qty } : l))
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
		setSelectedCustomerType('retail')
		setSelectedPayAccount(null)
	}

	// Re-price cart when customer type changes (retail ↔ wholesale)
	useEffect(() => {
		setCart((prev) => prev.map((line) => ({
			...line,
			unitPrice: selectedCustomerType === 'wholesale' && line.baseWholesalePrice != null
				? line.baseWholesalePrice
				: line.baseSellPrice,
		})))
	}, [selectedCustomerType])

	// ── Mutation ──
	const createSale = trpc.sale.create.useMutation({
		onSuccess: (data) => {
			if (data) {
				resetCart()
				onComplete(data as unknown as SaleDetail)
			}
		},
	})

	const creditDepositNum = Number(cashReceived) || 0  // reuse cashReceived for deposit in credit mode
	const creditDebtAmount = paymentMethod === 'credit' ? Math.max(0, grandTotal - creditDepositNum) : 0

	const handleCharge = () => {
		if (!locationId || !cashierId) { alert('Please select a location first.'); return }
		if (cart.length === 0) { alert('Cart is empty.'); return }
		if (paymentMethod === 'cash' && receivedNum < grandTotal) { alert('Cash received is less than the total amount.'); return }
		if (paymentMethod === 'credit' && !customerId) { alert('Select a customer to use Credit payment.'); return }

		let paymentsArr: { method: 'cash' | 'credit_card' | 'debit_card' | 'qr_code' | 'store_credit' | 'loyalty_points'; amount: number; reference?: string }[] = []

		if (paymentMethod === 'cash') {
			paymentsArr = [{ method: 'cash', amount: receivedNum }]
		} else if (paymentMethod === 'qr_code') {
			const payRef = selectedPayAccount
				? `${selectedPayAccount.provider}: ${selectedPayAccount.accountNumber}`
				: undefined
			paymentsArr = [{ method: 'qr_code', amount: grandTotal, reference: payRef }]
		} else if (paymentMethod === 'credit') {
			// deposit can be 0 (full credit) or partial
			if (creditDepositNum > 0) {
				paymentsArr = [{ method: 'cash', amount: creditDepositNum }]
			}
			// remainder goes as debt — no additional payment row needed
		}

		createSale.mutate({
			locationId,
			cashierId,
			customerId: customerId ?? undefined,
			items: cart.map((l) => ({
				productId: l.productId,
				variantId: l.variantId,
				qty: l.qty,
				unitPrice: l.unitPrice,
				discountAmount: l.discountAmount || undefined,
			})),
			payments: paymentsArr,
			discountAmount: discountNum || undefined,
			notes: notes || undefined,
		})
	}

	const isSetupDone = locationId && cashierId  // cashierId is always set from logged-in user
	const canCharge = Boolean(
		isSetupDone &&
		cart.length > 0 &&
		!createSale.isPending &&
		(paymentMethod !== 'cash' || receivedNum >= grandTotal) &&
		(paymentMethod !== 'credit' || !!customerId)
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
		<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

			{/* ── Variant Picker Modal ── */}
			{pendingVariantProduct && (
				<VariantPickerModal
					product={pendingVariantProduct}
					onSelect={(product, variant) => {
						addToCartDirect(product, variant)
						setPendingVariantProduct(null)
					}}
					onClose={() => setPendingVariantProduct(null)}
					customerType={selectedCustomerType}
				/>
			)}

			{/* ── Payment Account Picker Modal ── */}
			{showPayAccountPicker && (
				<PaymentAccountPickerModal
					accounts={payAccounts as BankAccount[]}
					selected={selectedPayAccount}
					onSelect={(acc) => setSelectedPayAccount(acc)}
					onClose={() => setShowPayAccountPicker(false)}
				/>
			)}

			{/* ── Main POS area ── */}
			<div style={{ display: 'flex', gap: '10px', height: 'calc(100vh - 148px)', minHeight: 0 }}>

				{/* ── Left: Product grid ── */}
				<div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
					<input
						type="text"
						value={productSearch}
						onChange={(e) => setProductSearch(e.target.value)}
						placeholder="Search products by name or SKU..."
						style={inputStyle}
					/>

					<div style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(5, 1fr)',
						gap: '8px',
						flex: 1,
						minHeight: 0,
						overflowY: 'auto',
						alignContent: 'start',
						paddingBottom: '4px',
					}}>
						{products.map((p: any) => {
							const stockQty = locationId ? (stockMap[p.id] ?? null) : null
							const outOfStock = !p.hasVariants && stockQty !== null && stockQty <= 0
							const lowStock = !p.hasVariants && stockQty !== null && stockQty > 0 && stockQty <= 5
							return (
							<button
								key={p.id}
								onClick={() => !outOfStock && addToCart(p)}
								style={{
									background: t.surface,
									border: `1px solid ${outOfStock ? t.borderMid : t.border}`,
									borderRadius: '12px',
									padding: '0',
									cursor: outOfStock ? 'not-allowed' : 'pointer',
									textAlign: 'left',
									transition: 'border-color 0.15s, background 0.15s',
									fontFamily: 'inherit',
									overflow: 'hidden',
									display: 'flex',
									flexDirection: 'column',
									opacity: outOfStock ? 0.5 : 1,
								}}
								onMouseEnter={(e) => { if (!outOfStock) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = t.surfaceHover } }}
								onMouseLeave={(e) => { e.currentTarget.style.borderColor = outOfStock ? t.borderMid : t.border; e.currentTarget.style.background = t.surface }}
							>
								{/* Photo area */}
								<div style={{ width: '100%', height: '110px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
									{p.imageUrl
										? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
										: <Icon name="product" size={28} style={{ color: t.textFaint }} />
									}
									{/* Stock / Variant badge */}
									{p.hasVariants ? (
										<span style={{ position: 'absolute', top: '5px', right: '5px', background: 'var(--primary)', color: '#fff', fontSize: '8px', fontWeight: 700, padding: '2px 5px', borderRadius: '4px' }}>
											VARIANTS
										</span>
									) : outOfStock ? (
										<span style={{ position: 'absolute', top: '5px', right: '5px', background: '#ef4444', color: '#fff', fontSize: '8px', fontWeight: 700, padding: '2px 5px', borderRadius: '4px' }}>
											OUT
										</span>
									) : null}
								</div>
								{/* Text */}
								<div style={{ padding: '8px 10px 9px' }}>
									<p style={{ color: t.text, fontSize: '12px', fontWeight: 600, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
									<p style={{ color: t.textFaint, fontSize: '10px', marginBottom: '5px' }}>{p.sku}</p>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<div>
											{selectedCustomerType === 'wholesale' && p.wholesalePrice != null ? (
												<>
													<p style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 800 }}>{sym}{Number(p.wholesalePrice).toLocaleString()}</p>
													<p style={{ color: t.textFaint, fontSize: '9px', textDecoration: 'line-through' }}>{sym}{Number(p.sellingPrice).toLocaleString()}</p>
												</>
											) : (
												<p style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 800 }}>{sym}{Number(p.sellingPrice).toLocaleString()}</p>
											)}
										</div>
										{!p.hasVariants && stockQty !== null && (
											<span style={{
												fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
												background: outOfStock ? 'rgba(239,68,68,0.12)' : lowStock ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
												color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981',
											}}>
												{stockQty}
											</span>
										)}
									</div>
								</div>
							</button>
						)
						})}
						{products.length === 0 && (
							<div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>
								{productSearch ? 'No products found' : 'Loading...'}
							</div>
						)}
					</div>
				</div>

				{/* ── Right: Cart + Payment ── */}
				<div style={{ width: '440px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px', minHeight: 0, overflow: 'hidden' }}>

					{/* Customer */}
					<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '5px 8px', flexShrink: 0 }}>
						<div style={{ position: 'relative' }}>
							{customerId ? (
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: t.inputBg, borderRadius: '10px', border: `1px solid ${t.inputBorder}` }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
										<span style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{selectedCustomerName}</span>
										{selectedCustomerType === 'wholesale' && (
											<span style={{ fontSize: '9px', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: '4px' }}>WHOLESALE</span>
										)}
									</div>
									<button
										onClick={() => { setCustomerId(null); setSelectedCustomerName(''); setSelectedCustomerType('retail'); setCustomerSearch('') }}
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
													onMouseDown={() => { setCustomerId(c.id); setSelectedCustomerName(c.name); setSelectedCustomerType((c as any).customerType ?? 'retail'); setCustomerSearch(''); setShowCustomerDrop(false) }}
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
					<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0 }}>
						<div style={{ padding: '4px 8px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
							<p style={{ color: t.textFaint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
								Cart {cart.length > 0 ? `(${cart.length})` : ''}
							</p>
							{cart.length > 0 && (
								<button onClick={resetCart} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
									Clear
								</button>
							)}
						</div>
						<div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
							{cart.length === 0 ? (
								<div style={{ padding: '16px', textAlign: 'center', color: t.textFaint, fontSize: '12px' }}>
									Click a product to add
								</div>
							) : (
								cart.map((line) => (
									<div key={line.cartKey} style={{ padding: '4px 8px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', gap: '7px', alignItems: 'center' }}>
										{/* Thumbnail */}
										<div style={{ width: '24px', height: '24px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0, background: t.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
											{line.imageUrl
												? <img src={line.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
												: <Icon name="product" size={14} style={{ color: t.textFaint }} />
											}
										</div>
										<div style={{ flex: 1, minWidth: 0 }}>
											<p style={{ color: t.text, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
												{line.name}
											</p>
											{line.variantLabel && (
												<p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 600, marginTop: '1px' }}>{line.variantLabel}</p>
											)}
											<p style={{ color: t.textFaint, fontSize: '11px', marginTop: '1px' }}>{sym}{line.unitPrice.toLocaleString()}</p>
										</div>
										{(() => { const maxQty = !line.variantId ? (stockMap[line.productId] ?? Infinity) : Infinity; const atMax = line.qty >= maxQty; return (
										<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
											<button onClick={() => updateQty(line.cartKey, line.qty - 1)} style={{ width: '21px', height: '21px', borderRadius: '5px', border: 'none', background: t.inputBg, color: t.text, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>−</button>
											<input
												type="number"
												min={1}
												max={maxQty === Infinity ? undefined : maxQty}
												value={line.qty}
												onChange={(e) => {
													const v = parseInt(e.target.value, 10)
													if (isNaN(v) || v < 1) return
													updateQty(line.cartKey, Math.min(v, maxQty === Infinity ? v : maxQty))
												}}
												style={{ width: '40px', textAlign: 'center', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '5px', padding: '2px 4px', color: t.text, fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', outline: 'none', MozAppearance: 'textfield' as any }}
											/>
											<button onClick={() => !atMax && updateQty(line.cartKey, line.qty + 1)} disabled={atMax} style={{ width: '21px', height: '21px', borderRadius: '5px', border: 'none', background: atMax ? t.borderMid : t.inputBg, color: atMax ? t.textFaint : t.text, cursor: atMax ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', opacity: atMax ? 0.5 : 1 }}>+</button>
										</div>
										) })()}
										<span style={{ color: t.text, fontSize: '13px', fontWeight: 700, minWidth: '50px', textAlign: 'right' }}>{sym}{(line.qty * line.unitPrice).toLocaleString()}</span>
										<button onClick={() => updateQty(line.cartKey, 0)} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0', flexShrink: 0 }}>×</button>
									</div>
								))
							)}
						</div>
					</div>

					{/* Totals + Payment */}
					<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '7px 10px', flexShrink: 0 }}>

						{/* Discount row */}
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
							<span style={{ color: t.textMuted, fontSize: '12px' }}>Discount ({sym})</span>
							<input
								type="number"
								min="0"
								value={headerDiscount}
								onChange={(e) => setHeaderDiscount(e.target.value)}
								placeholder="0"
								style={{ ...smInputStyle, width: '90px', fontSize: '12px', padding: '5px 8px' }}
							/>
						</div>

						{/* Summary rows */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '7px', borderTop: `1px solid ${t.borderMid}`, marginBottom: '7px' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ color: t.textMuted, fontSize: '12px' }}>Subtotal</span>
								<span style={{ color: t.textMuted, fontSize: '12px' }}>{sym}{subtotal.toLocaleString()}</span>
							</div>
							{discountNum > 0 && (
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ color: t.textMuted, fontSize: '12px' }}>Discount</span>
									<span style={{ color: '#ef4444', fontSize: '12px' }}>−{sym}{discountNum.toLocaleString()}</span>
								</div>
							)}
							{taxTotal > 0 && (
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ color: t.textMuted, fontSize: '12px' }}>Tax</span>
									<span style={{ color: t.textMuted, fontSize: '12px' }}>{sym}{taxTotal.toFixed(2)}</span>
								</div>
							)}
							<div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '7px', borderTop: `1px solid ${t.borderMid}`, marginTop: '3px' }}>
								<span style={{ color: t.text, fontSize: '13px', fontWeight: 900 }}>TOTAL</span>
								<span style={{ color: 'var(--primary)', fontSize: '16px', fontWeight: 900 }}>{sym}{grandTotal.toLocaleString()}</span>
							</div>
						</div>

						{/* Payment method tabs */}
						<div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '6px' }}>
							{PAYMENT_METHODS.map((m) => {
								const disabled = m.value === 'credit' && !customerId
								return (
									<button
										key={m.value}
										onClick={() => {
											if (disabled) return
											setPaymentMethod(m.value)
											if (m.value !== 'qr_code') setSelectedPayAccount(null)
											setCashReceived('')
										}}
										title={disabled ? 'Select a customer to use Credit' : undefined}
										style={{
											padding: '6px 14px', borderRadius: '8px', border: 'none',
											fontSize: '12px', fontWeight: 600,
											cursor: disabled ? 'not-allowed' : 'pointer',
											fontFamily: 'inherit', opacity: disabled ? 0.45 : 1,
											background: paymentMethod === m.value ? (m.value === 'credit' ? '#ef4444' : 'var(--primary)') : t.inputBg,
											color: paymentMethod === m.value ? '#fff' : t.textMuted,
											transition: 'all 0.15s',
										}}
									>
										{m.label}
									</button>
								)
							})}
						</div>

						{/* QR / Bank account section */}
						{paymentMethod === 'qr_code' && (
							<div style={{ marginBottom: '8px' }}>
								{(payAccounts as BankAccount[]).length === 0 ? (
									<div style={{ padding: '10px 14px', borderRadius: '10px', background: t.inputBg, border: `1px dashed ${t.inputBorder}` }}>
										<p style={{ color: t.textFaint, fontSize: '12px', textAlign: 'center' }}>
											No payment accounts configured.{' '}
											<span style={{ color: 'var(--primary)', fontWeight: 600 }}>Add one in Settings → Payment Accounts.</span>
										</p>
									</div>
								) : !selectedPayAccount ? (
									<button
										onClick={() => setShowPayAccountPicker(true)}
										style={{
											width: '100%', padding: '11px 14px', borderRadius: '10px',
											border: '1px dashed var(--primary)', background: 'var(--primary-10)',
											color: 'var(--primary)', fontSize: '12px', fontWeight: 700,
											cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
										}}
									>
										Select Bank / QR Account
									</button>
								) : (
									<div style={{ borderRadius: '12px', border: '2px solid var(--primary)', background: 'var(--primary-10)', overflow: 'hidden' }}>
										{/* Account header row */}
										<div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
											<div style={{ width: '38px', height: '38px', borderRadius: '9px', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${t.border}` }}>
												{selectedPayAccount.providerLogo
													? <img src={selectedPayAccount.providerLogo} alt={selectedPayAccount.provider} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
													: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="5" rx="1" /><path d="M1 9h22v11a2 2 0 01-2 2H3a2 2 0 01-2-2V9z" /></svg>
												}
											</div>
											<div style={{ flex: 1, minWidth: 0 }}>
												<p style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 800 }}>{selectedPayAccount.provider}</p>
												<p style={{ color: t.text, fontSize: '13px', fontWeight: 700, marginTop: '1px' }}>{selectedPayAccount.accountNumber}</p>
												<p style={{ color: t.textMuted, fontSize: '11px' }}>{selectedPayAccount.accountName}</p>
											</div>
											<button
												onClick={() => setShowPayAccountPicker(true)}
												style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
											>
												Change
											</button>
										</div>
										{/* QR code display */}
										{selectedPayAccount.qrCode && (
											<div style={{ borderTop: '1px solid rgba(99,102,241,0.2)', padding: '12px', display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.6)' }}>
												<img
													src={selectedPayAccount.qrCode}
													alt="QR Code"
													style={{ width: '140px', height: '140px', objectFit: 'contain', borderRadius: '8px' }}
												/>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* Cash received + change */}
						{paymentMethod === 'cash' && (
							<div style={{ marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<span style={{ color: t.textMuted, fontSize: '12px' }}>Cash Received</span>
									<input
										type="number"
										min="0"
										value={cashReceived}
										onChange={(e) => setCashReceived(e.target.value)}
										placeholder="0.00"
										style={{ ...smInputStyle, width: '110px', fontSize: '12px', padding: '5px 8px' }}
									/>
								</div>
								{receivedNum > 0 && (
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<span style={{ color: t.textMuted, fontSize: '12px' }}>Change</span>
										<span style={{ color: change >= 0 ? '#10b981' : '#ef4444', fontSize: '13px', fontWeight: 800 }}>
											{sym}{change.toFixed(2)}
										</span>
									</div>
								)}
							</div>
						)}

						{/* Credit / debt section */}
						{paymentMethod === 'credit' && (
							<div style={{ marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px', borderRadius: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
								<p style={{ color: '#ef4444', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Credit Sale — Customer owes</p>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<span style={{ color: t.textMuted, fontSize: '12px' }}>Deposit Now ({sym})</span>
									<input
										type="number"
										min="0"
										max={grandTotal}
										value={cashReceived}
										onChange={(e) => setCashReceived(e.target.value)}
										placeholder="0.00"
										style={{ ...smInputStyle, width: '110px', fontSize: '12px', padding: '5px 8px' }}
									/>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>Debt Amount</span>
									<span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 800 }}>{sym}{creditDebtAmount.toLocaleString()}</span>
								</div>
							</div>
						)}

						{/* Notes */}
						<input
							type="text"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Notes (optional)"
							style={{ ...inputStyle, marginBottom: '6px', fontSize: '12px', padding: '6px 10px' }}
						/>

						{/* Charge button */}
						<button
							onClick={handleCharge}
							disabled={!canCharge}
							style={{
								width: '100%',
								padding: '9px',
								borderRadius: '10px',
								border: 'none',
								background: canCharge ? (paymentMethod === 'credit' ? '#ef4444' : 'var(--primary)') : t.inputBg,
								color: canCharge ? '#fff' : t.textFaint,
								fontSize: '13px',
								fontWeight: 900,
								cursor: canCharge ? 'pointer' : 'not-allowed',
								fontFamily: 'inherit',
								transition: 'all 0.15s',
								letterSpacing: '-0.3px',
							}}
						>
							{createSale.isPending ? 'Processing...' : paymentMethod === 'credit'
								? `Credit Sale — Debt ${sym}${creditDebtAmount.toLocaleString()}`
								: `Charge ${sym}${grandTotal.toLocaleString()}`}
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
