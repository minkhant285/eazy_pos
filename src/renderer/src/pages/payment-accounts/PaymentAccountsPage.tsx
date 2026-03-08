import React, { useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { trpc } from '../../trpc-client/trpc'

// ── Types ─────────────────────────────────────────────────────

type PaymentAccount = {
  id: string
  provider: string
  accountNumber: string
  accountName: string
  providerLogo: string | null
  qrCode: string | null
  isActive: boolean
  createdAt: string
}

type FormState = {
  provider: string
  accountNumber: string
  accountName: string
  providerLogo: string | null
  qrCode: string | null
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  provider: '',
  accountNumber: '',
  accountName: '',
  providerLogo: null,
  qrCode: null,
  isActive: true,
}

// ── Image picker helper ───────────────────────────────────────

function useImagePicker(onPick: (dataUri: string | null) => void) {
  const ref = useRef<HTMLInputElement>(null)

  const open = () => ref.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onPick(reader.result as string)
    reader.readAsDataURL(file)
    // reset so the same file can be re-picked
    e.target.value = ''
  }

  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={handleChange}
    />
  )

  return { open, input }
}

// ── Modal ─────────────────────────────────────────────────────

interface ModalProps {
  account: PaymentAccount | null   // null = create mode
  onClose: () => void
  onSave: () => void
}

const AccountModal: React.FC<ModalProps> = ({ account, onClose, onSave }) => {
  const t = useAppStore((s) => s.theme)
  const [form, setForm] = useState<FormState>(
    account
      ? {
          provider: account.provider,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          providerLogo: account.providerLogo,
          qrCode: account.qrCode,
          isActive: account.isActive,
        }
      : { ...EMPTY_FORM }
  )
  const [error, setError] = useState('')

  const create = trpc.paymentAccount.create.useMutation({ onSuccess: () => { onSave(); onClose() } })
  const update = trpc.paymentAccount.update.useMutation({ onSuccess: () => { onSave(); onClose() } })

  const logoPickerEl = useImagePicker((uri) => setForm((f) => ({ ...f, providerLogo: uri })))
  const qrPickerEl   = useImagePicker((uri) => setForm((f) => ({ ...f, qrCode: uri })))

  const handleSubmit = () => {
    if (!form.provider.trim()) { setError('Provider name is required'); return }
    if (!form.accountNumber.trim()) { setError('Account number is required'); return }
    if (!form.accountName.trim()) { setError('Account name is required'); return }
    setError('')

    if (account) {
      update.mutate({ id: account.id, data: form })
    } else {
      create.mutate(form)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: '10px', padding: '9px 12px', color: t.text,
    fontSize: '13px', outline: 'none', fontFamily: 'inherit', width: '100%',
  }

  const isPending = create.isPending || update.isPending

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: '500px', margin: '0 16px',
          background: t.surface, border: `1px solid ${t.borderStrong}`,
          borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden', animation: 'slideUp 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: t.text, fontWeight: 700, fontSize: '15px' }}>
              {account ? 'Edit Payment Account' : 'New Payment Account'}
            </p>
            <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '2px' }}>
              Bank transfer, mobile wallet, or QR payment
            </p>
          </div>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '9px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Logo + QR row */}
          <div style={{ display: 'flex', gap: '14px' }}>
            {/* Provider logo */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ color: t.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider Logo</span>
              <button
                onClick={logoPickerEl.open}
                style={{
                  height: '90px', borderRadius: '12px', border: `2px dashed ${t.inputBorder}`,
                  background: t.inputBg, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '6px', overflow: 'hidden', padding: 0,
                }}
              >
                {form.providerLogo
                  ? <img src={form.providerLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
                  : <>
                      <Icon name="plus" size={18} style={{ color: t.textFaint }} />
                      <span style={{ color: t.textFaint, fontSize: '10px' }}>Upload logo</span>
                    </>
                }
              </button>
              {logoPickerEl.input}
              {form.providerLogo && (
                <button onClick={() => setForm((f) => ({ ...f, providerLogo: null }))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>
                  Remove logo
                </button>
              )}
            </div>

            {/* QR Code */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ color: t.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>QR Code</span>
              <button
                onClick={qrPickerEl.open}
                style={{
                  height: '90px', borderRadius: '12px', border: `2px dashed ${t.inputBorder}`,
                  background: t.inputBg, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '6px', overflow: 'hidden', padding: 0,
                }}
              >
                {form.qrCode
                  ? <img src={form.qrCode} alt="qr" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                  : <>
                      <Icon name="plus" size={18} style={{ color: t.textFaint }} />
                      <span style={{ color: t.textFaint, fontSize: '10px' }}>Upload QR code</span>
                    </>
                }
              </button>
              {qrPickerEl.input}
              {form.qrCode && (
                <button onClick={() => setForm((f) => ({ ...f, qrCode: null }))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>
                  Remove QR
                </button>
              )}
            </div>
          </div>

          {/* Provider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ color: t.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider / Bank Name</span>
            <input
              style={inputStyle}
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              placeholder="e.g. KBZ Bank, Wave Money, AYA Bank"
            />
          </div>

          {/* Account Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ color: t.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Number / Phone</span>
            <input
              style={inputStyle}
              value={form.accountNumber}
              onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
              placeholder="e.g. 09 123 456 789"
            />
          </div>

          {/* Account Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ color: t.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Name</span>
            <input
              style={inputStyle}
              value={form.accountName}
              onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
              placeholder="e.g. Mg Mg Trading Co., Ltd."
            />
          </div>

          {/* Active toggle */}
          {account && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                style={{
                  width: '38px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                  background: form.isActive ? 'var(--primary)' : t.inputBorder,
                  position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: '3px',
                  left: form.isActive ? '18px' : '3px',
                  width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
              <span style={{ color: t.textMuted, fontSize: '13px' }}>
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}

          {error && (
            <p style={{ color: '#ef4444', fontSize: '12px', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: '8px' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px 20px', borderTop: `1px solid ${t.borderMid}`, display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: '10px', border: `1px solid ${t.inputBorder}`, background: 'transparent', color: t.textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{ padding: '9px 22px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? 'Saving...' : account ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────

interface DeleteModalProps {
  account: PaymentAccount
  onClose: () => void
  onDeleted: () => void
}

const DeleteModal: React.FC<DeleteModalProps> = ({ account, onClose, onDeleted }) => {
  const t = useAppStore((s) => s.theme)
  const del = trpc.paymentAccount.delete.useMutation({ onSuccess: () => { onDeleted(); onClose() } })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: '380px', margin: '0 16px', background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: '18px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden', animation: 'slideUp 0.2s ease' }}>
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ color: t.text, fontWeight: 700, fontSize: '15px' }}>Delete Payment Account?</p>
          <p style={{ color: t.textMuted, fontSize: '13px', lineHeight: 1.5 }}>
            <strong style={{ color: t.text }}>{account.provider}</strong> — {account.accountName} will be permanently removed.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '9px', border: `1px solid ${t.inputBorder}`, background: 'transparent', color: t.textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={() => del.mutate({ id: account.id })} disabled={del.isPending} style={{ padding: '8px 18px', borderRadius: '9px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {del.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export const PaymentAccountsPage: React.FC = () => {
  const t = useAppStore((s) => s.theme)
  const [editTarget, setEditTarget] = useState<PaymentAccount | null | 'new'>(null)
  const [deleteTarget, setDeleteTarget] = useState<PaymentAccount | null>(null)

  const { data: accounts = [], refetch } = trpc.paymentAccount.list.useQuery({ onlyActive: false })

  const inputStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: '10px', padding: '8px 12px', color: t.text,
    fontSize: '13px', outline: 'none', fontFamily: 'inherit', width: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideUp 0.2s ease' }}>

      {/* Modals */}
      {editTarget === 'new' && (
        <AccountModal account={null} onClose={() => setEditTarget(null)} onSave={refetch} />
      )}
      {editTarget && editTarget !== 'new' && (
        <AccountModal account={editTarget} onClose={() => setEditTarget(null)} onSave={refetch} />
      )}
      {deleteTarget && (
        <DeleteModal account={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={refetch} />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setEditTarget('new')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '11px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Icon name="plus" size={14} /> Add Account
        </button>
      </div>

      {/* List */}
      {(accounts as PaymentAccount[]).length === 0 ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
          <Icon name="payment" size={36} style={{ color: t.textFaint, display: 'block', margin: '0 auto 12px' }} />
          <p style={{ color: t.textFaint, fontSize: '14px', fontWeight: 600 }}>No payment accounts yet</p>
          <p style={{ color: t.textFaint, fontSize: '12px', marginTop: '4px' }}>Add a bank account or QR payment to show customers at checkout</p>
          <button
            onClick={() => setEditTarget('new')}
            style={{ marginTop: '16px', padding: '9px 20px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Add First Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(accounts as PaymentAccount[]).map((acc) => (
            <div
              key={acc.id}
              style={{
                background: t.surface, border: `1px solid ${acc.isActive ? t.border : t.borderMid}`,
                borderRadius: '14px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: '16px',
                opacity: acc.isActive ? 1 : 0.6,
                transition: 'all 0.15s',
              }}
            >
              {/* Logo */}
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: t.inputBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${t.border}` }}>
                {acc.providerLogo
                  ? <img src={acc.providerLogo} alt={acc.provider} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
                  : <Icon name="payment" size={22} style={{ color: t.textFaint }} />
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ color: t.text, fontSize: '14px', fontWeight: 700 }}>{acc.provider}</span>
                  <span style={{
                    fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px',
                    background: acc.isActive ? 'rgba(16,185,129,0.12)' : t.inputBg,
                    color: acc.isActive ? '#10b981' : t.textFaint,
                  }}>
                    {acc.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  {acc.qrCode && (
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                      QR
                    </span>
                  )}
                </div>
                <p style={{ color: t.textMuted, fontSize: '13px', fontWeight: 600 }}>{acc.accountNumber}</p>
                <p style={{ color: t.textFaint, fontSize: '12px', marginTop: '1px' }}>{acc.accountName}</p>
              </div>

              {/* QR preview */}
              {acc.qrCode && (
                <div style={{ width: '52px', height: '52px', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <img src={acc.qrCode} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => setEditTarget(acc)}
                  style={{ width: '34px', height: '34px', borderRadius: '9px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Edit"
                >
                  <Icon name="edit" size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(acc)}
                  style={{ width: '34px', height: '34px', borderRadius: '9px', border: 'none', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Delete"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <p style={{ color: t.textMuted, fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>How it works</p>
        <ul style={{ color: t.textFaint, fontSize: '12px', lineHeight: 1.7, paddingLeft: '16px', margin: 0 }}>
          <li>Add your bank accounts or mobile wallet accounts here</li>
          <li>At POS checkout, select <strong>QR / Bank</strong> payment method to pick an account</li>
          <li>The customer's view shows the QR code and account details for transfer</li>
        </ul>
      </div>
    </div>
  )
}
