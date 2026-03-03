import React, { useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { trpc } from '../../trpc-client/trpc'

// ── Types ─────────────────────────────────────────────────────

type DeliveryMethod = {
  id: string
  provider: string
  logoUrl: string | null
  isActive: boolean
  createdAt: string
}

type FormState = {
  provider: string
  logoUrl: string | null
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  provider: '',
  logoUrl: null,
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
  method: DeliveryMethod | null   // null = create mode
  onClose: () => void
  onSave: () => void
}

const MethodModal: React.FC<ModalProps> = ({ method, onClose, onSave }) => {
  const t = useAppStore((s) => s.theme)
  const [form, setForm] = useState<FormState>(
    method
      ? { provider: method.provider, logoUrl: method.logoUrl, isActive: method.isActive }
      : { ...EMPTY_FORM }
  )
  const [error, setError] = useState('')

  const create = trpc.deliveryMethod.create.useMutation({ onSuccess: () => { onSave(); onClose() } })
  const update = trpc.deliveryMethod.update.useMutation({ onSuccess: () => { onSave(); onClose() } })

  const logoPickerEl = useImagePicker((uri) => setForm((f) => ({ ...f, logoUrl: uri })))

  const handleSubmit = () => {
    if (!form.provider.trim()) { setError('Provider name is required'); return }
    setError('')
    if (method) {
      update.mutate({ id: method.id, data: form })
    } else {
      create.mutate({ provider: form.provider, logoUrl: form.logoUrl })
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
          position: 'relative', width: '100%', maxWidth: '460px', margin: '0 16px',
          background: t.surface, border: `1px solid ${t.borderStrong}`,
          borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden', animation: 'slideUp 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${t.borderMid}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: t.text, fontWeight: 700, fontSize: '15px' }}>
              {method ? 'Edit Delivery Provider' : 'New Delivery Provider'}
            </p>
            <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '2px' }}>
              Courier service or shipping method
            </p>
          </div>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '9px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Logo upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: t.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider Logo</span>
            <button
              onClick={logoPickerEl.open}
              style={{
                height: '90px', borderRadius: '12px', border: `2px dashed ${t.inputBorder}`,
                background: t.inputBg, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '6px', overflow: 'hidden', padding: 0,
              }}
            >
              {form.logoUrl
                ? <img src={form.logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
                : <>
                    <Icon name="plus" size={18} style={{ color: t.textFaint }} />
                    <span style={{ color: t.textFaint, fontSize: '10px' }}>Upload logo (optional)</span>
                  </>
              }
            </button>
            {logoPickerEl.input}
            {form.logoUrl && (
              <button onClick={() => setForm((f) => ({ ...f, logoUrl: null }))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>
                Remove logo
              </button>
            )}
          </div>

          {/* Provider name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ color: t.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider Name</span>
            <input
              style={inputStyle}
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              placeholder="e.g. J&T Express, Flash Express, Kerry"
              autoFocus
            />
          </div>

          {/* Active toggle (edit mode only) */}
          {method && (
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
            {isPending ? 'Saving...' : method ? 'Save Changes' : 'Create Provider'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────

interface DeleteModalProps {
  method: DeliveryMethod
  onClose: () => void
  onDeleted: () => void
}

const DeleteModal: React.FC<DeleteModalProps> = ({ method, onClose, onDeleted }) => {
  const t = useAppStore((s) => s.theme)
  const del = trpc.deliveryMethod.delete.useMutation({ onSuccess: () => { onDeleted(); onClose() } })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: '380px', margin: '0 16px', background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: '18px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden', animation: 'slideUp 0.2s ease' }}>
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ color: t.text, fontWeight: 700, fontSize: '15px' }}>Delete Delivery Provider?</p>
          <p style={{ color: t.textMuted, fontSize: '13px', lineHeight: 1.5 }}>
            <strong style={{ color: t.text }}>{method.provider}</strong> will be permanently removed.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '9px', border: `1px solid ${t.inputBorder}`, background: 'transparent', color: t.textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={() => del.mutate({ id: method.id })} disabled={del.isPending} style={{ padding: '8px 18px', borderRadius: '9px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {del.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export const DeliveryMethodsPage: React.FC = () => {
  const t = useAppStore((s) => s.theme)
  const role = useAppStore((s) => s.currentUser?.role ?? 'cashier')
  const [editTarget, setEditTarget] = useState<DeliveryMethod | null | 'new'>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeliveryMethod | null>(null)

  const { data: methods = [], refetch } = trpc.deliveryMethod.list.useQuery({ onlyActive: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideUp 0.2s ease' }}>

      {/* Modals */}
      {editTarget === 'new' && (
        <MethodModal method={null} onClose={() => setEditTarget(null)} onSave={refetch} />
      )}
      {editTarget && editTarget !== 'new' && (
        <MethodModal method={editTarget} onClose={() => setEditTarget(null)} onSave={refetch} />
      )}
      {deleteTarget && (
        <DeleteModal method={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={refetch} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.4px' }}>Delivery Methods</h1>
          <p style={{ color: t.textFaint, fontSize: '12px', marginTop: '3px' }}>
            Courier and shipping providers available at POS checkout
          </p>
        </div>
        <button
          onClick={() => setEditTarget('new')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 16px', borderRadius: '11px', border: 'none',
            background: 'var(--primary)', color: '#fff',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Icon name="plus" size={14} />
          Add Provider
        </button>
      </div>

      {/* List */}
      {(methods as DeliveryMethod[]).length === 0 ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
          <Icon name="transfer" size={36} style={{ color: t.textFaint, display: 'block', margin: '0 auto 12px' }} />
          <p style={{ color: t.textFaint, fontSize: '14px', fontWeight: 600 }}>No delivery providers yet</p>
          <p style={{ color: t.textFaint, fontSize: '12px', marginTop: '4px' }}>Add courier services to select them at POS when a delivery address is chosen</p>
          <button
            onClick={() => setEditTarget('new')}
            style={{ marginTop: '16px', padding: '9px 20px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Add First Provider
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(methods as DeliveryMethod[]).map((m) => (
            <div
              key={m.id}
              style={{
                background: t.surface, border: `1px solid ${m.isActive ? t.border : t.borderMid}`,
                borderRadius: '14px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: '16px',
                opacity: m.isActive ? 1 : 0.6,
                transition: 'all 0.15s',
              }}
            >
              {/* Logo */}
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: t.inputBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${t.border}` }}>
                {m.logoUrl
                  ? <img src={m.logoUrl} alt={m.provider} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
                  : <Icon name="transfer" size={22} style={{ color: t.textFaint }} />
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ color: t.text, fontSize: '14px', fontWeight: 700 }}>{m.provider}</span>
                  <span style={{
                    fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px',
                    background: m.isActive ? 'rgba(16,185,129,0.12)' : t.inputBg,
                    color: m.isActive ? '#10b981' : t.textFaint,
                  }}>
                    {m.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p style={{ color: t.textFaint, fontSize: '12px' }}>
                  Added {new Date(m.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => setEditTarget(m)}
                  style={{ width: '34px', height: '34px', borderRadius: '9px', border: 'none', background: t.inputBg, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Edit"
                >
                  <Icon name="edit" size={14} />
                </button>
                {role !== 'cashier' && (
                  <button
                    onClick={() => setDeleteTarget(m)}
                    style={{ width: '34px', height: '34px', borderRadius: '9px', border: 'none', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Delete"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <p style={{ color: t.textMuted, fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>How it works</p>
        <ul style={{ color: t.textFaint, fontSize: '12px', lineHeight: 1.7, paddingLeft: '16px', margin: 0 }}>
          <li>Add your courier partners and delivery services here</li>
          <li>When a customer has a delivery address selected in POS, a provider picker appears below</li>
          <li>The selected provider name is recorded on the sale and shown in receipts</li>
        </ul>
      </div>
    </div>
  )
}
