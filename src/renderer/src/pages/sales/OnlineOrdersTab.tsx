import React, { useState, useCallback, useEffect } from 'react'
import { skipToken } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { trpc } from '../../trpc-client/trpc'
import { QuotationView } from './QuotationView'
import { DateRangePicker } from '../../components/ui/DateRangePicker'

// ── Types ──────────────────────────────────────────────────────

type OnlineStatus = 'processing' | 'confirmed' | 'ready_to_ship' | 'shipped' | 'returned'

type OrderSummary = {
  id: string
  receiptNo: string
  onlineStatus: OnlineStatus | null
  totalAmount: number
  deliveryFee: number
  createdAt: string
  customerName: string | null
  customerPhone: string | null
  deliveryMethodName: string | null
  deliveryMethodLogo: string | null
  primaryPaymentMethod: string | null
  itemCount: number
}

type CartLine = {
  productId: string
  variantId?: string
  name: string
  sku: string
  imageUrl?: string | null
  qty: number
  unitPrice: number
  discountAmount: number
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', qr_code: 'QR Code',
}

// ── Bank Account types ─────────────────────────────────────────

type BankAccount = {
  id: string
  provider: string
  accountNumber: string
  accountName: string
  providerLogo: string | null
  qrCode: string | null
}

// ── Payment Account Picker Modal ───────────────────────────────

const PaymentAccountPickerModal: React.FC<{
  accounts: BankAccount[]
  selected: BankAccount | null
  onSelect: (acc: BankAccount) => void
  onClose: () => void
}> = ({ accounts, selected, onSelect, onClose }) => {
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
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: t.text, fontWeight: 700, fontSize: '14px' }}>Select Payment Account</p>
            <p style={{ color: t.textFaint, fontSize: '11px' }}>Show QR code or account details to customer</p>
          </div>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={13} />
          </button>
        </div>
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
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = t.borderStrong }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = t.inputBorder }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${t.border}` }}>
                  {acc.providerLogo
                    ? <img src={acc.providerLogo} alt={acc.provider} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '5px' }} />
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="5" rx="1" /><path d="M1 9h22v11a2 2 0 01-2 2H3a2 2 0 01-2-2V9z" /><line x1="5" y1="15" x2="9" y2="15" /></svg>
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
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                )}
              </button>
            )
          })}
          {accounts.length === 0 && (
            <p style={{ color: t.textFaint, fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>No payment accounts configured</p>
          )}
        </div>
      </div>
    </div>
  )
}

const COLUMN_CONFIG = [
  { status: 'processing'   as OnlineStatus, label: 'Processing',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { status: 'confirmed'    as OnlineStatus, label: 'Confirmed',      color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { status: 'ready_to_ship' as OnlineStatus, label: 'Ready to Ship', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { status: 'shipped'      as OnlineStatus, label: 'Shipped',        color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { status: 'returned'     as OnlineStatus, label: 'Returned',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
]

// ── Order Card ─────────────────────────────────────────────────

const OrderCard: React.FC<{
  order: OrderSummary
  sym: string
  onView: (id: string) => void
  onConfirm?: (id: string) => void
  onReadyToShip?: (id: string) => void
  onShip?: (id: string) => void
  onReturn?: (id: string) => void
  onReprocess?: (id: string) => void
  onDelete?: (id: string) => void
  isConfirmPending?: boolean
  isReadyToShipPending?: boolean
  isShipPending?: boolean
  isReturnPending?: boolean
  isReprocessPending?: boolean
  isDeletePending?: boolean
  pendingId?: string | null
}> = ({ order, sym, onView, onConfirm, onReadyToShip, onShip, onReturn, onReprocess, onDelete, isConfirmPending, isReadyToShipPending, isShipPending, isReturnPending, isReprocessPending, isDeletePending, pendingId }) => {
  const t = useAppStore((s) => s.theme)
  const status = order.onlineStatus ?? 'processing'
  const col = COLUMN_CONFIG.find((c) => c.status === status)

  return (
    <div
      onClick={() => onView(order.id)}
      style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px',
        padding: '10px', cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = col?.color ?? t.borderStrong)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: t.textFaint, fontSize: '10px', fontFamily: 'monospace' }}>#{order.receiptNo}</span>
        <span style={{ color: t.textFaint, fontSize: '10px' }}>{new Date(order.createdAt).toLocaleDateString()}</span>
      </div>
      <p style={{ color: t.text, fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>
        {order.customerName ?? 'Unknown Customer'}
      </p>
      {order.customerPhone && (
        <p style={{ color: t.textMuted, fontSize: '10px', marginBottom: '3px' }}>{order.customerPhone}</p>
      )}
      {order.deliveryMethodName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          {order.deliveryMethodLogo && (
            <img src={order.deliveryMethodLogo} alt={order.deliveryMethodName}
              style={{ width: '14px', height: '14px', objectFit: 'contain', borderRadius: '3px' }} />
          )}
          <span style={{ color: t.textMuted, fontSize: '11px' }}>{order.deliveryMethodName}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ color: t.textFaint, fontSize: '11px' }}>{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</span>
        <span style={{ color: t.text, fontSize: '14px', fontWeight: 800 }}>{sym}{Number(order.totalAmount).toLocaleString()}</span>
      </div>
      {order.primaryPaymentMethod && (
        <div style={{ marginBottom: '5px' }}>
          <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '6px', background: t.inputBg, color: t.textMuted, fontSize: '10px', fontWeight: 600 }}>
            {METHOD_LABELS[order.primaryPaymentMethod] ?? order.primaryPaymentMethod}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
        {status === 'processing' && onConfirm && (
          <button
            onClick={() => onConfirm(order.id)}
            disabled={isConfirmPending && pendingId === order.id}
            style={{ flex: 1, padding: '5px 0', borderRadius: '7px', border: 'none', background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isConfirmPending && pendingId === order.id ? 0.7 : 1 }}
          >
            {isConfirmPending && pendingId === order.id ? 'Confirming…' : 'Confirm'}
          </button>
        )}
        {status === 'confirmed' && onReadyToShip && (
          <button
            onClick={() => onReadyToShip(order.id)}
            disabled={isReadyToShipPending && pendingId === order.id}
            style={{ flex: 1, padding: '5px 0', borderRadius: '7px', border: 'none', background: '#8b5cf6', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isReadyToShipPending && pendingId === order.id ? 0.7 : 1 }}
          >
            {isReadyToShipPending && pendingId === order.id ? 'Moving…' : 'Ready to Ship'}
          </button>
        )}
        {status === 'ready_to_ship' && onShip && (
          <button
            onClick={() => onShip(order.id)}
            disabled={isShipPending && pendingId === order.id}
            style={{ flex: 1, padding: '5px 0', borderRadius: '7px', border: 'none', background: '#06b6d4', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isShipPending && pendingId === order.id ? 0.7 : 1 }}
          >
            {isShipPending && pendingId === order.id ? 'Shipping…' : 'Ship'}
          </button>
        )}
        {(status === 'confirmed' || status === 'ready_to_ship' || status === 'shipped') && onReturn && (
          <button
            onClick={() => onReturn(order.id)}
            disabled={isReturnPending && pendingId === order.id}
            style={{ flex: 1, padding: '5px 0', borderRadius: '7px', border: '1.5px solid #f59e0b', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isReturnPending && pendingId === order.id ? 0.7 : 1 }}
          >
            {isReturnPending && pendingId === order.id ? 'Returning…' : 'Return'}
          </button>
        )}
        {status === 'returned' && onReprocess && (
          <button
            onClick={() => onReprocess(order.id)}
            disabled={isReprocessPending && pendingId === order.id}
            style={{ flex: 1, padding: '5px 0', borderRadius: '7px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isReprocessPending && pendingId === order.id ? 0.7 : 1 }}
          >
            {isReprocessPending && pendingId === order.id ? 'Moving…' : 'Reprocess'}
          </button>
        )}
        {status === 'returned' && onDelete && (
          <button
            onClick={() => onDelete(order.id)}
            disabled={isDeletePending && pendingId === order.id}
            style={{ flex: 1, padding: '5px 0', borderRadius: '7px', border: '1.5px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isDeletePending && pendingId === order.id ? 0.7 : 1 }}
          >
            {isDeletePending && pendingId === order.id ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Order Form Modal ────────────────────────────────────────────
// Handles both create (editOrderId undefined) and edit (editOrderId set) modes.

const OrderFormModal: React.FC<{
  onClose: () => void
  onSuccess: (id: string) => void
  editOrderId?: string
}> = ({ onClose, onSuccess, editOrderId }) => {
  const t = useAppStore((s) => s.theme)
  const sym = useAppStore((s) => s.currency.symbol)
  const currentUser = useAppStore((s) => s.currentUser)
  const isEdit = !!editOrderId

  const [initialized, setInitialized] = useState(!isEdit)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone: string | null } | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [selectedDeliveryMethodId, setSelectedDeliveryMethodId] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr_code'>('cash')
  const [selectedPayAccount, setSelectedPayAccount] = useState<BankAccount | null>(null)
  const [showPayAccountPicker, setShowPayAccountPicker] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [discount, setDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const [saleDate, setSaleDate] = useState(today)
  const [error, setError] = useState('')

  // Fetch existing order for edit mode
  const { data: existingOrder, isLoading: isLoadingOrder } = trpc.sale.getById.useQuery(
    { id: editOrderId! },
    { enabled: isEdit },
  )

  // Initialize form from existing order
  useEffect(() => {
    if (!existingOrder || !isEdit || initialized) return
    const sale = existingOrder as any
    if (sale.customerId) {
      setSelectedCustomer({ id: sale.customerId, name: sale.customerName ?? '', phone: null })
    }
    setSelectedAddressId(sale.deliveryAddressId ?? null)
    setSelectedDeliveryMethodId(sale.deliveryMethodId ?? null)
    setDeliveryFee(sale.deliveryFee ? String(sale.deliveryFee) : '')
    const m = sale.payments?.[0]?.method ?? 'cash'
    const validMethods = ['cash', 'qr_code']
    setPaymentMethod(validMethods.includes(m) ? (m as 'cash' | 'qr_code') : 'cash')
    setDiscount(sale.discountAmount ? String(sale.discountAmount) : '')
    setNotes(sale.notes ?? '')
    setSaleDate(sale.createdAt ? sale.createdAt.slice(0, 10) : today)
    setCart(
      (sale.items ?? []).map((item: any) => ({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        name: item.productName ?? '',
        sku: item.productSku ?? '',
        imageUrl: item.productImageUrl ?? null,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount ?? 0),
      }))
    )
    setInitialized(true)
  }, [existingOrder, isEdit, initialized])

  // Get default/first active location for stock queries
  const { data: locData } = trpc.location.list.useQuery({ isActive: true, page: 1, pageSize: 20 })
  const locationsList = (locData?.data ?? []) as any[]
  const locationId: string | undefined =
    (locationsList.find((l: any) => l.isDefault) ?? locationsList[0])?.id

  // Customer search
  const { data: cusData } = trpc.customer.list.useQuery(
    { page: 1, pageSize: 10, search: customerSearch, isActive: true },
    { enabled: customerSearch.length > 0 },
  )
  const customerResults = (cusData?.data ?? []) as any[]

  // Addresses for selected customer
  const { data: addrData } = trpc.customerAddress.list.useQuery(
    selectedCustomer?.id ? { customerId: selectedCustomer.id } : skipToken,
  )
  const addresses = (addrData ?? []) as any[]

  // Auto-select default (or first) address in create mode when addresses load
  useEffect(() => {
    if (isEdit || !addresses.length || selectedAddressId) return
    const def = addresses.find((a: any) => a.isDefault) ?? addresses[0]
    setSelectedAddressId(def.id)
  }, [addresses])

  // Delivery methods
  const { data: dmData } = trpc.deliveryMethod.list.useQuery({ onlyActive: true })
  const deliveryMethods = (dmData ?? []) as any[]

  // Payment accounts (for QR/Bank)
  const { data: payAccountsData } = trpc.paymentAccount.list.useQuery({ onlyActive: true })
  const payAccounts = (payAccountsData ?? []) as BankAccount[]

  // Restore selected pay account in edit mode once both payAccounts and the order are loaded
  useEffect(() => {
    if (!isEdit || !initialized || paymentMethod !== 'qr_code' || !payAccounts.length || selectedPayAccount) return
    const ref = (existingOrder as any)?.payments?.[0]?.reference as string | undefined
    if (!ref) return
    const [providerPart, accountPart] = ref.split(': ')
    const match = payAccounts.find((a) => a.provider === providerPart && a.accountNumber === accountPart)
    if (match) setSelectedPayAccount(match)
  }, [payAccounts, initialized, paymentMethod])

  // Product search with stock info
  const { data: stockProdData } = trpc.stock.allProducts.useQuery(
    { locationId: locationId!, search: productSearch, pageSize: 8 },
    { enabled: !!locationId && productSearch.length > 0 },
  )
  const stockProducts = (stockProdData?.data ?? []) as any[]

  // Update stockMap whenever search results arrive
  useEffect(() => {
    if (stockProducts.length === 0) return
    setStockMap((prev) => {
      const next = { ...prev }
      stockProducts.forEach((p: any) => { next[p.productId] = Number(p.qtyAvailable) })
      return next
    })
  }, [stockProducts])

  // In edit mode: pre-fetch stock for all products once cart is initialized so
  // qty limits are enforced immediately (before the user searches for anything)
  const { data: editModeStockData } = trpc.stock.allProducts.useQuery(
    { locationId: locationId!, pageSize: 200 },
    { enabled: isEdit && initialized && !!locationId },
  )
  useEffect(() => {
    if (!editModeStockData?.data) return
    setStockMap((prev) => {
      const next = { ...prev }
      ;(editModeStockData.data as any[]).forEach((p: any) => {
        next[p.productId] = Number(p.qtyAvailable)
      })
      return next
    })
  }, [editModeStockData])

  // Mutations
  const createMut = trpc.sale.createOnline.useMutation({
    onSuccess: (sale: any) => onSuccess(sale.id),
    onError: (e) => setError(e.message),
  })
  const updateMut = trpc.sale.updateOnline.useMutation({
    onSuccess: (sale: any) => onSuccess(sale.id),
    onError: (e) => setError(e.message),
  })
  const isPending = createMut.isPending || updateMut.isPending

  // Cart helpers
  const addToCart = (product: any) => {
    if (product.qtyAvailable <= 0) return
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.productId && !l.variantId)
      if (existing) {
        const max = stockMap[product.productId] ?? Number(product.qtyAvailable)
        return prev.map((l) =>
          l.productId === product.productId && !l.variantId
            ? { ...l, qty: Math.min(l.qty + 1, max) }
            : l
        )
      }
      return [...prev, {
        productId: product.productId,
        name: product.name,
        sku: product.sku,
        imageUrl: product.imageUrl ?? null,
        qty: 1,
        unitPrice: Number(product.sellingPrice),
        discountAmount: 0,
      }]
    })
    setProductSearch('')
  }

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev]
      const line = updated[idx]
      const max = stockMap[line.productId] ?? Infinity
      updated[idx] = { ...line, qty: Math.min(Math.max(1, line.qty + delta), max) }
      return updated
    })
  }

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }

  const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice - l.discountAmount, 0)
  const discountNum = Math.max(0, Number(discount) || 0)
  const deliveryFeeNum = Math.max(0, Number(deliveryFee) || 0)
  const total = subtotal - discountNum + deliveryFeeNum

  const handleSubmit = () => {
    if (!selectedCustomer) { setError('Please select a customer'); return }
    if (cart.length === 0) { setError('Please add at least one product'); return }
    setError('')
    const paymentReference = paymentMethod === 'qr_code' && selectedPayAccount
      ? `${selectedPayAccount.provider}: ${selectedPayAccount.accountNumber}`
      : undefined

    const commonPayload = {
      customerId: selectedCustomer.id,
      deliveryAddressId: selectedAddressId ?? undefined,
      deliveryMethodId: selectedDeliveryMethodId ?? undefined,
      deliveryFee: deliveryFeeNum,
      items: cart.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        qty: l.qty,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount,
      })),
      paymentMethod,
      paymentReference,
      discountAmount: discountNum,
      notes: notes || undefined,
      saleDate: saleDate !== today ? saleDate : undefined,
    }
    if (isEdit) {
      updateMut.mutate({ id: editOrderId!, ...commonPayload })
    } else {
      createMut.mutate({ cashierId: currentUser!.id, ...commonPayload })
    }
  }

  const inputSt: React.CSSProperties = {
    width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: '10px', padding: '6px 10px', color: t.text, fontSize: '12px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const sectionLabel: React.CSSProperties = {
    color: t.textMuted, fontSize: '10px', fontWeight: 700, marginBottom: '4px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  if (isEdit && isLoadingOrder) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
        <p style={{ position: 'relative', color: '#fff', fontSize: '14px' }}>Loading order…</p>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: 'min(1040px, calc(100vw - 32px))', margin: '0 16px',
          background: t.surface, border: `1px solid ${t.borderStrong}`,
          borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden', animation: 'slideUp 0.22s ease',
          height: '90vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <p style={{ color: t.text, fontWeight: 700, fontSize: '15px' }}>
            {isEdit ? 'Edit Order' : 'New Online Order'}
          </p>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Body — two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* ── Left column: Customer / Delivery / Payment ──────── */}
          <div style={{ overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', borderRight: `1px solid ${t.borderMid}` }}>

          {/* Customer */}
          <div>
            <p style={sectionLabel}>Customer *</p>
            {selectedCustomer ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: t.inputBg, borderRadius: '10px', border: `1px solid ${t.inputBorder}` }}>
                <div>
                  <p style={{ color: t.text, fontSize: '12px', fontWeight: 600 }}>{selectedCustomer.name}</p>
                  {selectedCustomer.phone && (
                    <p style={{ color: t.textFaint, fontSize: '11px' }}>{selectedCustomer.phone}</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedCustomer(null); setSelectedAddressId(null) }}
                  style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: t.surface, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="close" size={11} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer name, phone…"
                  style={inputSt}
                />
                {customerResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginTop: '4px', overflow: 'hidden' }}>
                    {customerResults.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone ?? null }); setCustomerSearch('') }}
                        style={{ width: '100%', textAlign: 'left', padding: '7px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <p style={{ color: t.text, fontSize: '12px', fontWeight: 600 }}>{c.name}</p>
                        <p style={{ color: t.textFaint, fontSize: '11px' }}>{c.phone ?? c.email ?? ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Address picker */}
          {selectedCustomer && addresses.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={sectionLabel}>Delivery Address</p>
                {selectedAddressId && (
                  <button
                    onClick={() => setSelectedAddressId(null)}
                    style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {addresses.map((addr: any) => {
                  const isSelected = addr.id === selectedAddressId
                  return (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedAddressId(isSelected ? null : addr.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '10px', textAlign: 'left',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : t.border}`,
                        background: isSelected ? 'var(--primary-10)' : t.inputBg,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {/* Radio dot */}
                      <div style={{
                        flexShrink: 0, marginTop: '2px',
                        width: '14px', height: '14px', borderRadius: '50%',
                        border: `2px solid ${isSelected ? 'var(--primary)' : t.textFaint}`,
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      {/* Address info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ color: isSelected ? 'var(--primary)' : t.text, fontSize: '12px', fontWeight: 700 }}>{addr.receiverName}</span>
                          {addr.isDefault && (
                            <span style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Default</span>
                          )}
                        </div>
                        <p style={{ color: isSelected ? 'var(--primary)' : t.textMuted, fontSize: '11px', margin: 0, opacity: 0.85 }}>{addr.phoneNumber}</p>
                        <p style={{ color: isSelected ? 'var(--primary)' : t.textFaint, fontSize: '11px', margin: '2px 0 0', opacity: 0.8, wordBreak: 'break-word' }}>{addr.detailAddress}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Delivery provider */}
          {deliveryMethods.length > 0 && (
            <div>
              <p style={sectionLabel}>Delivery Provider</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {deliveryMethods.map((dm: any) => (
                  <button
                    key={dm.id}
                    onClick={() => setSelectedDeliveryMethodId(dm.id === selectedDeliveryMethodId ? null : dm.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', borderRadius: '10px',
                      border: `1.5px solid ${dm.id === selectedDeliveryMethodId ? 'var(--primary)' : t.border}`,
                      background: dm.id === selectedDeliveryMethodId ? 'var(--primary-10)' : t.inputBg,
                      color: dm.id === selectedDeliveryMethodId ? 'var(--primary)' : t.textMuted,
                      fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {dm.logoUrl && (
                      <img src={dm.logoUrl} alt={dm.provider} style={{ width: '14px', height: '14px', objectFit: 'contain', borderRadius: '3px' }} />
                    )}
                    {dm.provider}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery fee */}
          <div>
            <p style={sectionLabel}>Delivery Fee</p>
            <input
              type="number" min={0}
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              style={{ ...inputSt, width: '140px' }}
            />
          </div>

          {/* Payment method */}
          <div>
            <p style={sectionLabel}>Payment Method</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: paymentMethod === 'qr_code' ? '10px' : 0 }}>
              {([
                { key: 'cash',    label: 'Cash on Delivery', icon: '💵' },
                { key: 'qr_code', label: 'QR / Bank',        icon: '📲' },
              ] as const).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setPaymentMethod(key)
                    if (key !== 'qr_code') setSelectedPayAccount(null)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '5px 11px', borderRadius: '10px',
                    border: `1.5px solid ${key === paymentMethod ? 'var(--primary)' : t.border}`,
                    background: key === paymentMethod ? 'var(--primary-10)' : t.inputBg,
                    color: key === paymentMethod ? 'var(--primary)' : t.textMuted,
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* QR / Bank account picker */}
            {paymentMethod === 'qr_code' && (
              selectedPayAccount ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '12px', background: t.inputBg, border: `1.5px solid var(--primary)` }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${t.border}` }}>
                    {selectedPayAccount.providerLogo
                      ? <img src={selectedPayAccount.providerLogo} alt={selectedPayAccount.provider} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="5" rx="1" /><path d="M1 9h22v11a2 2 0 01-2 2H3a2 2 0 01-2-2V9z" /><line x1="5" y1="15" x2="9" y2="15" /></svg>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>{selectedPayAccount.provider}</p>
                    <p style={{ color: t.textMuted, fontSize: '12px' }}>{selectedPayAccount.accountNumber} · {selectedPayAccount.accountName}</p>
                  </div>
                  {selectedPayAccount.qrCode && (
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${t.border}`, flexShrink: 0 }}>
                      <img src={selectedPayAccount.qrCode} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                  <button
                    onClick={() => setShowPayAccountPicker(true)}
                    style={{ padding: '5px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.surface, color: t.textMuted, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPayAccountPicker(true)}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: '12px',
                    border: `1.5px dashed ${t.border}`, background: t.inputBg,
                    color: t.textMuted, fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>📲</span>
                  {payAccounts.length > 0 ? 'Choose payment account…' : 'No payment accounts — skip or add one in Settings'}
                </button>
              )
            )}
          </div>

          {/* Delivery summary — pinned at bottom of left column */}
          {(selectedAddressId || selectedDeliveryMethodId) && (() => {
            const selAddr = addresses.find((a: any) => a.id === selectedAddressId)
            const selDm = deliveryMethods.find((dm: any) => dm.id === selectedDeliveryMethodId)
            return (
              <div style={{ marginTop: 'auto', background: t.inputBg, borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px', border: `1px solid ${t.border}` }}>
                <p style={{ color: t.textFaint, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Delivery Summary</p>
                {selAddr && (
                  <div>
                    <p style={{ color: t.text, fontSize: '11px', fontWeight: 700 }}>
                      📍 {selAddr.receiverName}
                      {selAddr.phoneNumber && <span style={{ fontWeight: 400, color: t.textMuted }}> · {selAddr.phoneNumber}</span>}
                    </p>
                    <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '1px', paddingLeft: '16px' }}>{selAddr.detailAddress}</p>
                  </div>
                )}
                {selDm && (
                  <p style={{ color: t.textMuted, fontSize: '11px' }}>🚚 <span style={{ fontWeight: 600, color: t.text }}>{selDm.provider}</span></p>
                )}
              </div>
            )
          })()}
          </div>
          {/* ── Right column: Products / Cart / Totals ───────────── */}
          <div style={{ overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Product search with stock */}
          <div>
            <p style={sectionLabel}>Products</p>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search product name or SKU…"
                style={inputSt}
              />
              {stockProducts.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginTop: '4px', overflow: 'hidden' }}>
                  {stockProducts.map((p: any) => {
                    const outOfStock = p.qtyAvailable <= 0
                    return (
                      <button
                        key={p.productId}
                        onClick={() => addToCart(p)}
                        disabled={outOfStock}
                        style={{
                          width: '100%', textAlign: 'left', padding: '5px 10px', border: 'none',
                          background: 'transparent', cursor: outOfStock ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '10px',
                          opacity: outOfStock ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => { if (!outOfStock) e.currentTarget.style.background = t.surfaceHover }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '7px', flexShrink: 0, border: `1px solid ${t.borderMid}` }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: t.inputBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', border: `1px solid ${t.borderMid}` }}>📦</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: t.text, fontSize: '13px', fontWeight: 600 }}>{p.name}</p>
                          <p style={{ color: t.textFaint, fontSize: '11px' }}>
                            {p.sku}
                            {outOfStock
                              ? <span style={{ color: '#ef4444', marginLeft: '6px' }}>Out of stock</span>
                              : <span style={{ color: '#10b981', marginLeft: '6px' }}>{p.qtyAvailable} available</span>
                            }
                          </p>
                        </div>
                        <span style={{ color: t.text, fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                          {sym}{Number(p.sellingPrice).toLocaleString()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div style={{ background: t.inputBg, borderRadius: '10px', overflow: 'hidden' }}>
                {cart.map((line, idx) => {
                  const maxQty = stockMap[line.productId]
                  const atMax = maxQty !== undefined && line.qty >= maxQty
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 10px', borderBottom: idx < cart.length - 1 ? `1px solid ${t.borderMid}` : 'none' }}>
                      {line.imageUrl ? (
                        <img src={line.imageUrl} alt={line.name} style={{ width: '26px', height: '26px', objectFit: 'cover', borderRadius: '7px', flexShrink: 0, border: `1px solid ${t.borderMid}` }} />
                      ) : (
                        <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: t.surface, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', border: `1px solid ${t.borderMid}` }}>📦</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: t.text, fontSize: '11px', fontWeight: 600 }}>{line.name}</p>
                        <p style={{ color: t.textFaint, fontSize: '11px' }}>
                          {sym}{line.unitPrice.toLocaleString()}
                          {maxQty !== undefined && (
                            <span style={{ marginLeft: '6px', color: atMax ? '#f59e0b' : t.textFaint }}>
                              ({line.qty}/{maxQty} max)
                            </span>
                          )}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => updateQty(idx, -1)}
                          style={{ width: '24px', height: '24px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.surface, color: t.text, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >−</button>
                        <span style={{ width: '24px', textAlign: 'center', color: t.text, fontSize: '13px', fontWeight: 700 }}>{line.qty}</span>
                        <button
                          onClick={() => { if (!atMax) updateQty(idx, 1) }}
                          disabled={atMax}
                          style={{
                            width: '24px', height: '24px', borderRadius: '6px',
                            border: `1px solid ${atMax ? t.borderMid : t.border}`,
                            background: atMax ? t.inputBg : t.surface,
                            color: atMax ? t.textFaint : t.text,
                            cursor: atMax ? 'not-allowed' : 'pointer',
                            fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >+</button>
                      </div>
                      <span style={{ color: t.text, fontSize: '13px', fontWeight: 700, width: '70px', textAlign: 'right' }}>
                        {sym}{(line.qty * line.unitPrice).toLocaleString()}
                      </span>
                      <button
                        onClick={() => removeFromCart(idx)}
                        style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <Icon name="close" size={10} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Discount + Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <p style={sectionLabel}>Discount</p>
              <input
                type="number" min={0}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                style={inputSt}
              />
            </div>
            <div>
              <p style={sectionLabel}>Notes</p>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes…"
                style={inputSt}
              />
            </div>
            <div>
              <p style={sectionLabel}>Sale Date</p>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value || today)}
                style={inputSt}
              />
              {saleDate !== today && (
                <button
                  onClick={() => setSaleDate(today)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--primary)', fontSize: '10px', marginTop: '2px', fontFamily: 'inherit' }}
                >
                  Reset to today
                </button>
              )}
            </div>
          </div>

          {/* Total summary */}
          {cart.length > 0 && (
            <div style={{ background: t.inputBg, borderRadius: '12px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {[
                ['Subtotal', `${sym}${subtotal.toLocaleString()}`],
                ['Discount', `−${sym}${discountNum.toLocaleString()}`],
                ['Delivery Fee', `${sym}${deliveryFeeNum.toLocaleString()}`],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted, fontSize: '11px' }}>{l}</span>
                  <span style={{ color: t.textMuted, fontSize: '11px' }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${t.borderMid}`, marginTop: '6px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: t.text, fontWeight: 800, fontSize: '12px' }}>Total</span>
                <span style={{ color: t.text, fontWeight: 800, fontSize: '14px' }}>{sym}{total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {error && <p style={{ color: '#ef4444', fontSize: '12px' }}>{error}</p>}
          </div>{/* end right column */}
        </div>{/* end grid */}

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${t.borderMid}`, flexShrink: 0 }}>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{
              width: '100%', padding: '9px 0', borderRadius: '12px', border: 'none',
              background: 'var(--primary)', color: '#fff', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending
              ? (isEdit ? 'Saving…' : 'Creating…')
              : (isEdit ? 'Save Changes' : 'Create Order')
            }
          </button>
        </div>
      </div>

      {/* Payment account picker */}
      {showPayAccountPicker && (
        <PaymentAccountPickerModal
          accounts={payAccounts}
          selected={selectedPayAccount}
          onSelect={(acc) => setSelectedPayAccount(acc)}
          onClose={() => setShowPayAccountPicker(false)}
        />
      )}
    </div>
  )
}

// ── Kanban Column ──────────────────────────────────────────────

const KanbanColumn: React.FC<{
  config: typeof COLUMN_CONFIG[number]
  orders: OrderSummary[]
  sym: string
  onView: (id: string) => void
  onNewOrder?: () => void
  onConfirm?: (id: string) => void
  onReadyToShip?: (id: string) => void
  onShip?: (id: string) => void
  onReturn?: (id: string) => void
  onReprocess?: (id: string) => void
  onDelete?: (id: string) => void
  isConfirmPending?: boolean
  isReadyToShipPending?: boolean
  isShipPending?: boolean
  isReturnPending?: boolean
  isReprocessPending?: boolean
  isDeletePending?: boolean
  pendingId?: string | null
}> = ({ config, orders, sym, onView, onNewOrder, onConfirm, onReadyToShip, onShip, onReturn, onReprocess, onDelete, isConfirmPending, isReadyToShipPending, isShipPending, isReturnPending, isReprocessPending, isDeletePending, pendingId }) => {
  const t = useAppStore((s) => s.theme)

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 12px', borderRadius: '12px',
        background: config.bg, border: `1.5px solid ${config.color}22`,
      }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: config.color, flexShrink: 0 }} />
        <p style={{ color: config.color, fontWeight: 800, fontSize: '12px', flex: 1 }}>{config.label}</p>
        <span style={{ padding: '2px 8px', borderRadius: '8px', background: config.color, color: '#fff', fontSize: '10px', fontWeight: 700 }}>
          {orders.length}
        </span>
        {onNewOrder && (
          <button
            onClick={onNewOrder}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '7px', border: 'none',
              background: config.color, color: '#fff',
              fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Icon name="plus" size={11} />
            New
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {orders.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', border: `1.5px dashed ${t.border}`, borderRadius: '12px' }}>
            <p style={{ color: t.textFaint, fontSize: '12px' }}>No orders</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              sym={sym}
              onView={onView}
              onConfirm={config.status === 'processing' ? onConfirm : undefined}
              onReadyToShip={config.status === 'confirmed' ? onReadyToShip : undefined}
              onShip={config.status === 'ready_to_ship' ? onShip : undefined}
              onReturn={['confirmed', 'ready_to_ship', 'shipped'].includes(config.status) ? onReturn : undefined}
              onReprocess={config.status === 'returned' ? onReprocess : undefined}
              onDelete={config.status === 'returned' ? onDelete : undefined}
              isConfirmPending={isConfirmPending}
              isReadyToShipPending={isReadyToShipPending}
              isShipPending={isShipPending}
              isReturnPending={isReturnPending}
              isReprocessPending={isReprocessPending}
              isDeletePending={isDeletePending}
              pendingId={pendingId}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main OnlineOrdersTab ───────────────────────────────────────

export const OnlineOrdersTab: React.FC = () => {
  const t = useAppStore((s) => s.theme)
  const isDark = useAppStore((s) => s.isDark)
  const sym = useAppStore((s) => s.currency.symbol)

  const [showCreate, setShowCreate] = useState(false)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [viewOrderId, setViewOrderId] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const dateFilter = { fromDate: fromDate || undefined, toDate: toDate || undefined }

  const { data: processingData,   refetch: refetchProcessing }   = trpc.sale.listOnline.useQuery({ onlineStatus: 'processing',   ...dateFilter })
  const { data: confirmedData,    refetch: refetchConfirmed }    = trpc.sale.listOnline.useQuery({ onlineStatus: 'confirmed',    ...dateFilter })
  const { data: readyToShipData, refetch: refetchReadyToShip }  = trpc.sale.listOnline.useQuery({ onlineStatus: 'ready_to_ship', ...dateFilter })
  const { data: shippedData,     refetch: refetchShipped }      = trpc.sale.listOnline.useQuery({ onlineStatus: 'shipped',       ...dateFilter })
  const { data: returnedData,    refetch: refetchReturned }     = trpc.sale.listOnline.useQuery({ onlineStatus: 'returned',      ...dateFilter })

  const refetchAll = useCallback(() => {
    refetchProcessing()
    refetchConfirmed()
    refetchReadyToShip()
    refetchShipped()
    refetchReturned()
  }, [refetchProcessing, refetchConfirmed, refetchReadyToShip, refetchShipped, refetchReturned])

  const confirmMut = trpc.sale.confirmOnline.useMutation({
    onSuccess: () => { refetchAll(); setPendingId(null); setActionError(null) },
    onError: (e) => { setPendingId(null); setActionError(e.message) },
  })

  const readyToShipMut = trpc.sale.readyToShipOnline.useMutation({
    onSuccess: () => { refetchAll(); setPendingId(null); setActionError(null) },
    onError: (e) => { setPendingId(null); setActionError(e.message) },
  })

  const shipMut = trpc.sale.shipOnline.useMutation({
    onSuccess: () => { refetchAll(); setPendingId(null); setActionError(null) },
    onError: (e) => { setPendingId(null); setActionError(e.message) },
  })

  const returnMut = trpc.sale.returnOnline.useMutation({
    onSuccess: () => { refetchAll(); setPendingId(null); setActionError(null) },
    onError: (e) => { setPendingId(null); setActionError(e.message) },
  })

  const deleteMut = trpc.sale.deleteOnline.useMutation({
    onSuccess: () => { refetchAll(); setPendingId(null); setViewOrderId(null); setActionError(null) },
    onError: (e) => { setPendingId(null); setActionError(e.message) },
  })

  const reprocessMut = trpc.sale.reprocessOnline.useMutation({
    onSuccess: () => { refetchAll(); setPendingId(null); setActionError(null) },
    onError: (e) => { setPendingId(null); setActionError(e.message) },
  })

  const handleConfirm     = (id: string) => { setActionError(null); setPendingId(id); confirmMut.mutate({ id }) }
  const handleReadyToShip = (id: string) => { setActionError(null); setPendingId(id); readyToShipMut.mutate({ id }) }
  const handleShip        = (id: string) => { setActionError(null); setPendingId(id); shipMut.mutate({ id }) }
  const handleReturn      = (id: string) => { setActionError(null); setPendingId(id); returnMut.mutate({ id }) }
  const handleDelete      = (id: string) => { setActionError(null); setPendingId(id); deleteMut.mutate({ id }) }
  const handleReprocess   = (id: string) => { setActionError(null); setPendingId(id); reprocessMut.mutate({ id }) }

  const columnData: Record<OnlineStatus, OrderSummary[]> = {
    processing:    (processingData   ?? []) as OrderSummary[],
    confirmed:     (confirmedData    ?? []) as OrderSummary[],
    ready_to_ship: (readyToShipData  ?? []) as OrderSummary[],
    shipped:       (shippedData      ?? []) as OrderSummary[],
    returned:      (returnedData     ?? []) as OrderSummary[],
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Error banner */}
      {actionError && (
        <div style={{
          padding: '10px 14px', borderRadius: '12px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
        }}>
          <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600, flex: 1 }}>{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      )}

      {/* Date range filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => { setFromDate(from); setToDate(to) }}
          t={t}
          isDark={isDark}
          placeholder="Filter by date range"
          dropdownAlign="left"
        />
      </div>

      {/* Kanban board */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: '8px' }}>
        {COLUMN_CONFIG.map((col) => (
          <KanbanColumn
            key={col.status}
            config={col}
            orders={columnData[col.status]}
            sym={sym}
            onView={setViewOrderId}
            onNewOrder={col.status === 'processing' ? () => setShowCreate(true) : undefined}
            onConfirm={handleConfirm}
            onReadyToShip={handleReadyToShip}
            onShip={handleShip}
            onReturn={handleReturn}
            onReprocess={handleReprocess}
            onDelete={handleDelete}
            isConfirmPending={confirmMut.isPending}
            isReadyToShipPending={readyToShipMut.isPending}
            isShipPending={shipMut.isPending}
            isReturnPending={returnMut.isPending}
            isReprocessPending={reprocessMut.isPending}
            isDeletePending={deleteMut.isPending}
            pendingId={pendingId}
          />
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <OrderFormModal
          onClose={() => setShowCreate(false)}
          onSuccess={(id) => { setShowCreate(false); refetchAll(); setViewOrderId(id) }}
        />
      )}

      {/* Edit modal */}
      {editOrderId && (
        <OrderFormModal
          editOrderId={editOrderId}
          onClose={() => setEditOrderId(null)}
          onSuccess={(id) => { setEditOrderId(null); refetchAll(); setViewOrderId(id) }}
        />
      )}

      {/* Quotation view */}
      {viewOrderId && (
        <QuotationView
          saleId={viewOrderId}
          onClose={() => { setViewOrderId(null); setActionError(null) }}
          onConfirm={() => handleConfirm(viewOrderId)}
          onReadyToShip={() => handleReadyToShip(viewOrderId)}
          onShip={() => handleShip(viewOrderId)}
          onReturn={() => handleReturn(viewOrderId)}
          onDelete={() => handleDelete(viewOrderId)}
          onReprocess={() => handleReprocess(viewOrderId)}
          onEdit={() => { setViewOrderId(null); setEditOrderId(viewOrderId) }}
          isConfirmPending={confirmMut.isPending}
          isReadyToShipPending={readyToShipMut.isPending}
          isShipPending={shipMut.isPending}
          isReturnPending={returnMut.isPending}
          isDeletePending={deleteMut.isPending}
          isReprocessPending={reprocessMut.isPending}
          actionError={actionError}
        />
      )}
    </div>
  )
}
