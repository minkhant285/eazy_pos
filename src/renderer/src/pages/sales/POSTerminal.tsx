import React, { useState } from 'react'
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

// ── Variant Picker Modal ──────────────────────────────────────

interface VariantPickerProps {
	product: any
	onSelect: (product: any, variant: any) => void
	onClose: () => void
}

const VariantPickerModal: React.FC<VariantPickerProps> = ({ product, onSelect, onClose }) => {
	const t = useAppStore((s) => s.theme)
	const sym = useAppStore((s) => s.currency.symbol)
	const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

	const { data: pickerData, isLoading } = trpc.variant.getPickerData.useQuery(
		{ productId: product.id },
		{ enabled: !!product.id }
	)

	const attributes = pickerData?.attributes ?? []
	const variants = pickerData?.variants ?? []

	// Find the matching variant where all optionIds match the selected options
	const matchedVariant = variants.find((v: any) => {
		const selectedIds = Object.values(selectedOptions)
		if (selectedIds.length !== attributes.length) return false
		return selectedIds.every((id) => v.optionIds.includes(id))
	})

	const allSelected = Object.keys(selectedOptions).length === attributes.length && attributes.length > 0

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
							<p style={{ color: 'var(--primary)', fontSize: '15px', fontWeight: 800 }}>
								{sym}{Number(matchedVariant.sellingPrice).toLocaleString()}
							</p>
						) : (
							<p style={{ color: t.textFaint, fontSize: '12px' }}>
								{allSelected ? 'Variant unavailable' : 'Select all options'}
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

export const POSTerminal: React.FC<Props> = ({ onComplete }) => {
	const t = useAppStore((s) => s.theme)
	const sym = useAppStore((s) => s.currency.symbol)

	// ── Setup ──
	const [locationId, setLocationId] = useState('')
	const [cashierId, setCashierId] = useState('')

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

	/** Add a plain (non-variant) product directly */
	const addToCartDirect = (product: any, variant?: any) => {
		const cartKey = variant ? variant.id : product.id
		const unitPrice = variant ? Number(variant.sellingPrice) : Number(product.sellingPrice)
		const variantLabel = variant?.label

		setCart((prev) => {
			const existing = prev.find((l) => l.cartKey === cartKey)
			if (existing) {
				return prev.map((l) => l.cartKey === cartKey ? { ...l, qty: l.qty + 1 } : l)
			}
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
				variantId: l.variantId,
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

			{/* ── Variant Picker Modal ── */}
			{pendingVariantProduct && (
				<VariantPickerModal
					product={pendingVariantProduct}
					onSelect={(product, variant) => {
						addToCartDirect(product, variant)
						setPendingVariantProduct(null)
					}}
					onClose={() => setPendingVariantProduct(null)}
				/>
			)}

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
									padding: '0',
									cursor: 'pointer',
									textAlign: 'left',
									transition: 'border-color 0.15s, background 0.15s',
									fontFamily: 'inherit',
									overflow: 'hidden',
									display: 'flex',
									flexDirection: 'column',
								}}
								onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = t.surfaceHover }}
								onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.surface }}
							>
								{/* Photo area */}
								<div style={{ width: '100%', height: '82px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
									{p.imageUrl
										? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
										: <Icon name="product" size={26} style={{ color: t.textFaint }} />
									}
									{/* Variant badge */}
									{p.hasVariants ? (
										<span style={{ position: 'absolute', top: '5px', right: '5px', background: 'var(--primary)', color: '#fff', fontSize: '8px', fontWeight: 700, padding: '2px 5px', borderRadius: '4px' }}>
											VARIANTS
										</span>
									) : null}
								</div>
								{/* Text */}
								<div style={{ padding: '9px 11px 11px' }}>
									<p style={{ color: t.text, fontSize: '12px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
									<p style={{ color: t.textFaint, fontSize: '10px', marginBottom: '6px' }}>{p.sku}</p>
									<p style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 800 }}>{sym}{Number(p.sellingPrice).toLocaleString()}</p>
								</div>
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
									<div key={line.cartKey} style={{ padding: '9px 14px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', gap: '8px', alignItems: 'center' }}>
										{/* Thumbnail */}
										<div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: t.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
											{line.imageUrl
												? <img src={line.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
												: <Icon name="product" size={16} style={{ color: t.textFaint }} />
											}
										</div>
										<div style={{ flex: 1, minWidth: 0 }}>
											<p style={{ color: t.text, fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
												{line.name}{line.variantLabel ? ` (${line.variantLabel})` : ''}
											</p>
											<p style={{ color: t.textFaint, fontSize: '10px' }}>{sym}{line.unitPrice.toLocaleString()}</p>
										</div>
										<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
											<button onClick={() => updateQty(line.cartKey, line.qty - 1)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: t.inputBg, color: t.text, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>−</button>
											<span style={{ color: t.text, fontSize: '12px', fontWeight: 700, minWidth: '22px', textAlign: 'center' }}>{line.qty}</span>
											<button onClick={() => updateQty(line.cartKey, line.qty + 1)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: t.inputBg, color: t.text, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>+</button>
										</div>
										<span style={{ color: t.text, fontSize: '12px', fontWeight: 700, minWidth: '58px', textAlign: 'right' }}>{sym}{(line.qty * line.unitPrice).toLocaleString()}</span>
										<button onClick={() => updateQty(line.cartKey, 0)} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0', flexShrink: 0 }}>×</button>
									</div>
								))
							)}
						</div>
					</div>

					{/* Totals + Payment */}
					<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '14px' }}>

						{/* Discount row */}
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
							<span style={{ color: t.textMuted, fontSize: '12px' }}>Discount ({sym})</span>
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
							<div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px solid ${t.borderMid}`, marginTop: '4px' }}>
								<span style={{ color: t.text, fontSize: '15px', fontWeight: 900 }}>TOTAL</span>
								<span style={{ color: 'var(--primary)', fontSize: '18px', fontWeight: 900 }}>{sym}{grandTotal.toLocaleString()}</span>
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
										background: paymentMethod === m.value ? 'var(--primary)' : t.inputBg,
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
											{sym}{change.toFixed(2)}
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
								background: canCharge ? 'var(--primary)' : t.inputBg,
								color: canCharge ? '#fff' : t.textFaint,
								fontSize: '15px',
								fontWeight: 900,
								cursor: canCharge ? 'pointer' : 'not-allowed',
								fontFamily: 'inherit',
								transition: 'all 0.15s',
								letterSpacing: '-0.3px',
							}}
						>
							{createSale.isPending ? 'Processing...' : `Charge ${sym}${grandTotal.toLocaleString()}`}
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
