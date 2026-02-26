import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

interface LocationForm { name: string; address: string; phone: string; }
const EMPTY: LocationForm = { name: "", address: "", phone: "" };

export const LocationsPage: React.FC = () => {
  const t = useAppStore((s) => s.theme);
  const tr = useAppStore((s) => s.tr);

  const [modal, setModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [form, setForm] = useState<LocationForm>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.location.list.useQuery({ pageSize: 100 });
  const locations = data?.data ?? [];

  const createMut = trpc.location.create.useMutation({ onSuccess: () => { closeModal(); refetch(); } });
  const updateMut = trpc.location.update.useMutation({ onSuccess: () => { closeModal(); refetch(); } });
  const deactivateMut = trpc.location.deactivate.useMutation({ onSuccess: () => { setDeleteId(null); refetch(); } });

  const closeModal = () => { setModal({ open: false, id: null }); setForm(EMPTY); };
  const openCreate = () => { setForm(EMPTY); setModal({ open: true, id: null }); };
  const openEdit = (l: typeof locations[0]) => {
    setForm({ name: l.name, address: l.address ?? "", phone: l.phone ?? "" });
    setModal({ open: true, id: l.id });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
    };
    if (!modal.id) createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  const isPending = createMut.isPending || updateMut.isPending;

  const inputStyle = { width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };
  const labelStyle = { color: t.textMuted, fontSize: "10.5px", fontWeight: 700, display: "block", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.5px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>Locations</h1>
          <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{locations.length} locations</p>
        </div>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Icon name="plus" size={13} /> New Location
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
      ) : locations.length === 0 ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "56px", textAlign: "center" }}>
          <Icon name="location" size={32} style={{ color: t.textFaint, display: "block", margin: "0 auto 12px" }} />
          <p style={{ color: t.textFaint, fontSize: "13px" }}>No locations yet. Create your first one.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {locations.map((l) => (
            <div key={l.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.borderStrong)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--primary-15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="location" size={16} style={{ color: "var(--primary-light)" }} />
                  </div>
                  <div>
                    <p style={{ color: t.text, fontSize: "14px", fontWeight: 700 }}>{l.name}</p>
                    {!l.isActive && <span style={{ fontSize: "9px", fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: "4px" }}>INACTIVE</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => openEdit(l)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={12} /></button>
                  <button onClick={() => setDeleteId(l.id)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={12} /></button>
                </div>
              </div>
              {(l.address || l.phone) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "8px", borderTop: `1px solid ${t.borderMid}` }}>
                  {l.address && <p style={{ color: t.textMuted, fontSize: "12px" }}>{l.address}</p>}
                  {l.phone && <p style={{ color: t.textFaint, fontSize: "12px" }}>{l.phone}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Deactivate Confirm */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={() => setDeleteId(null)} />
          <div style={{ position: "relative", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "18px", padding: "22px", maxWidth: "340px", width: "calc(100% - 32px)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.2s ease" }}>
            <h3 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Deactivate Location?</h3>
            <p style={{ color: t.textMuted, fontSize: "13px", marginTop: "8px", lineHeight: 1.5 }}>{tr.delete_warning}</p>
            <div style={{ display: "flex", gap: "9px", marginTop: "18px" }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
              <button onClick={() => deactivateMut.mutate({ id: deleteId })} disabled={deactivateMut.isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: deactivateMut.isPending ? 0.7 : 1 }}>
                {deactivateMut.isPending ? "..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal.open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "400px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden", animation: "slideUp 0.22s ease" }}>
            <div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>{modal.id ? "Edit Location" : "New Location"}</h2>
                <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>{modal.id ? "Update location details" : "Add a new store or warehouse"}</p>
              </div>
              <button onClick={closeModal} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} /></button>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Store, Warehouse A" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, City, Province" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+66 xx xxxx xxxx" style={inputStyle} />
              </div>
            </div>
            <div style={{ padding: "0 22px 22px", display: "flex", gap: "10px" }}>
              <button onClick={closeModal} disabled={isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
              <button onClick={handleSubmit} disabled={isPending || !form.name.trim()} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isPending || !form.name.trim() ? 0.7 : 1 }}>
                {isPending ? "..." : modal.id ? tr.save_changes : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
