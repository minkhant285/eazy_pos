import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

interface SupplierForm {
  name: string; contactName: string; email: string;
  phone: string; address: string;
}
const EMPTY: SupplierForm = { name: "", contactName: "", email: "", phone: "", address: "" };

export const SuppliersPage: React.FC = () => {
  const t = useAppStore((s) => s.theme);
  const tr = useAppStore((s) => s.tr);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isActive, setIsActive] = useState<boolean | undefined>(true);
  const [modal, setModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [form, setForm] = useState<SupplierForm>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const PAGE_SIZE = 20;
  const { data, isLoading, refetch } = trpc.supplier.list.useQuery({ page, pageSize: PAGE_SIZE, search: search || undefined, isActive });
  const suppliers = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  const createMut = trpc.supplier.create.useMutation({ onSuccess: () => { closeModal(); refetch(); } });
  const updateMut = trpc.supplier.update.useMutation({ onSuccess: () => { closeModal(); refetch(); } });
  const deactivateMut = trpc.supplier.deactivate.useMutation({ onSuccess: () => { setDeleteId(null); refetch(); } });

  const closeModal = () => { setModal({ open: false, id: null }); setForm(EMPTY); };
  const openCreate = () => { setForm(EMPTY); setModal({ open: true, id: null }); };
  const openEdit = (s: typeof suppliers[0]) => {
    setForm({ name: s.name, contactName: s.contactName ?? "", email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "" });
    setModal({ open: true, id: s.id });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      contactName: form.contactName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
    };
    if (!modal.id) createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return start + i;
  }).filter((p) => p >= 1 && p <= totalPages);

  const inputStyle = { width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };
  const labelStyle = { color: t.textMuted, fontSize: "10.5px", fontWeight: 700, display: "block", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.5px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>Suppliers</h1>
          <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{total} suppliers</p>
        </div>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Icon name="plus" size={13} /> New Supplier
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "280px" }}>
          <div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}><Icon name="search" size={13} /></div>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search suppliers..." style={{ ...inputStyle, padding: "9px 12px 9px 33px" }} />
        </div>
        {(["all", "active", "inactive"] as const).map((f) => {
          const active = f === "all" ? isActive === undefined : f === "active" ? isActive === true : isActive === false;
          return (
            <button key={f} onClick={() => { setIsActive(f === "all" ? undefined : f === "active"); setPage(1); }} style={{ padding: "7px 14px", borderRadius: "10px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: active ? "var(--primary)" : t.inputBg, color: active ? "#fff" : t.textMuted, textTransform: "capitalize" }}>
              {f}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 60px", gap: "10px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
          {["Name", "Contact", "Email", "Phone", ""].map((h, i) => (
            <span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
          ))}
        </div>
        {isLoading ? (
          <div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
        ) : suppliers.length === 0 ? (
          <div style={{ padding: "56px", textAlign: "center" }}>
            <Icon name="supplier" size={32} style={{ color: t.textFaint, display: "block", margin: "0 auto 12px" }} />
            <p style={{ color: t.textFaint, fontSize: "13px" }}>No suppliers found</p>
          </div>
        ) : suppliers.map((s) => (
          <div key={s.id}
            style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 60px", gap: "10px", padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "var(--primary-15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="supplier" size={13} style={{ color: "var(--primary-light)" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</p>
                {!s.isActive && <span style={{ fontSize: "9px", fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: "4px" }}>INACTIVE</span>}
              </div>
            </div>
            <span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.contactName ?? "—"}</span>
            <span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.email ?? "—"}</span>
            <span style={{ color: t.textMuted, fontSize: "12px" }}>{s.phone ?? "—"}</span>
            <div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }}>
              <button onClick={() => openEdit(s)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={11} /></button>
              <button onClick={() => setDeleteId(s.id)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={11} /></button>
            </div>
          </div>
        ))}

        {/* Pagination */}
        <div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {suppliers.length} {tr.of} {total}</span>
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "3px" }}>
              {pageButtons.map((p) => (
                <button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "var(--primary)" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deactivate Confirm */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={() => setDeleteId(null)} />
          <div style={{ position: "relative", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "18px", padding: "22px", maxWidth: "340px", width: "calc(100% - 32px)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.2s ease" }}>
            <h3 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Deactivate Supplier?</h3>
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
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "440px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden", animation: "slideUp 0.22s ease" }}>
            <div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>{modal.id ? "Edit Supplier" : "New Supplier"}</h2>
                <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>{modal.id ? "Update supplier details" : "Add a new supplier"}</p>
              </div>
              <button onClick={closeModal} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} /></button>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "60vh", overflowY: "auto" }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Supplier name" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Contact Name</label>
                  <input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} placeholder="John Doe" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+66 xx xxxx xxxx" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="supplier@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, City, Province" style={inputStyle} />
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
