import React, { useState, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

interface SupplierForm {
  name: string; contactName: string; email: string;
  phone: string; address: string; logoUrl: string;
}
const EMPTY: SupplierForm = { name: "", contactName: "", email: "", phone: "", address: "", logoUrl: "" };

const PO_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:      { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  sent:       { bg: "rgba(59,130,246,0.15)",  text: "#3b82f6" },
  partial:    { bg: "rgba(245,158,11,0.15)",  text: "#f59e0b" },
  received:   { bg: "rgba(16,185,129,0.15)",  text: "#10b981" },
  cancelled:  { bg: "rgba(239,68,68,0.15)",   text: "#ef4444" },
};

// ── Supplier Detail Drawer ────────────────────────────────────

interface DrawerProps {
  supplierId: string;
  onClose: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
}

const SupplierDrawer: React.FC<DrawerProps> = ({ supplierId, onClose, onEdit, onDeactivate }) => {
  const t   = useAppStore((s) => s.theme);
  const sym = useAppStore((s) => s.currency.symbol);

  const { data: supplier, isLoading } = trpc.supplier.getById.useQuery({ id: supplierId });
  const { data: posData } = trpc.purchaseOrder.list.useQuery(
    { supplierId, pageSize: 8, page: 1 },
    { enabled: !!supplierId }
  );
  const recentPOs = (posData?.data ?? []) as any[];
  const s = supplier as any;

  const fl: React.CSSProperties = { color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" };
  const fv: React.CSSProperties = { color: t.text, fontSize: "13px", fontWeight: 500 };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 56,
        width: "460px", maxWidth: "100vw",
        background: t.surface, borderLeft: `1px solid ${t.borderStrong}`,
        boxShadow: "-16px 0 48px rgba(0,0,0,0.25)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Supplier Detail</h2>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "9px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {isLoading ? (
            <p style={{ color: t.textFaint, fontSize: "13px", textAlign: "center", paddingTop: "40px" }}>Loading…</p>
          ) : !s ? null : (
            <>
              {/* Identity block */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  width: "96px", height: "96px", borderRadius: "20px", flexShrink: 0, overflow: "hidden",
                  background: s.logoUrl ? "#fff" : "var(--primary-15)",
                  border: s.logoUrl ? `1px solid ${t.border}` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {s.logoUrl
                    ? <img src={s.logoUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }} />
                    : <Icon name="supplier" size={38} style={{ color: "var(--primary)" }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h3 style={{ color: t.text, fontSize: "17px", fontWeight: 800, letterSpacing: "-0.3px" }}>{s.name}</h3>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
                      background: s.isActive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                      color: s.isActive ? "#10b981" : "#ef4444",
                    }}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {s.contactName && <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>{s.contactName}</p>}
                </div>
              </div>

              {/* Outstanding balance */}
              {Number(s.outstandingBalance) > 0 && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 700 }}>Outstanding Balance</span>
                  <span style={{ color: "#ef4444", fontSize: "16px", fontWeight: 800 }}>{sym}{Number(s.outstandingBalance).toLocaleString()}</span>
                </div>
              )}

              {/* Contact info */}
              <div style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Contact Info</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {[
                    ["Phone",   s.phone],
                    ["Email",   s.email],
                    ["Tax ID",  s.taxId],
                    ["Address", s.address],
                  ].map(([label, val]) => val ? (
                    <div key={label} style={{ gridColumn: label === "Address" ? "1 / -1" : undefined }}>
                      <p style={fl}>{label}</p>
                      <p style={fv}>{val}</p>
                    </div>
                  ) : null)}
                </div>
                {!s.phone && !s.email && !s.taxId && !s.address && (
                  <p style={{ color: t.textFaint, fontSize: "12px" }}>No contact details added</p>
                )}
              </div>

              {/* Recent POs */}
              <div>
                <p style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Recent Purchase Orders</p>
                {recentPOs.length === 0 ? (
                  <p style={{ color: t.textFaint, fontSize: "12px" }}>No purchase orders yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {recentPOs.map((po: any) => {
                      const sc = PO_STATUS_COLORS[po.status] ?? PO_STATUS_COLORS.draft;
                      return (
                        <div key={po.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "10px", background: t.inputBg, border: `1px solid ${t.border}` }}>
                          <div>
                            <p style={{ color: t.text, fontSize: "12px", fontWeight: 700 }}>{po.poNumber}</p>
                            <p style={{ color: t.textFaint, fontSize: "10px", marginTop: "1px" }}>{new Date(po.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: t.text, fontSize: "12px", fontWeight: 600 }}>{sym}{Number(po.totalAmount).toLocaleString()}</span>
                            <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: sc.bg, color: sc.text, textTransform: "capitalize" }}>{po.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Meta */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 12px" }}>
                  <p style={fl}>Created</p>
                  <p style={{ ...fv, fontSize: "12px" }}>{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 12px" }}>
                  <p style={fl}>Last Updated</p>
                  <p style={{ ...fv, fontSize: "12px" }}>{new Date(s.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!isLoading && s && (
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "8px", flexShrink: 0 }}>
            {s.isActive && (
              <button
                onClick={onDeactivate}
                style={{ padding: "9px 16px", borderRadius: "10px", border: `1px solid rgba(239,68,68,0.3)`, background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Deactivate
              </button>
            )}
            <button
              onClick={onEdit}
              style={{ flex: 1, padding: "9px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Edit Supplier
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────

export const SuppliersPage: React.FC = () => {
  const t = useAppStore((s) => s.theme);
  const tr = useAppStore((s) => s.tr);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isActive, setIsActive] = useState<boolean | undefined>(true);
  const [modal, setModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [form, setForm] = useState<SupplierForm>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 20;
  const { data, isLoading, refetch } = trpc.supplier.list.useQuery({ page, pageSize: PAGE_SIZE, search: search || undefined, isActive });
  const suppliers = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  const createMut = trpc.supplier.create.useMutation({ onSuccess: () => { closeModal(); refetch(); } });
  const updateMut = trpc.supplier.update.useMutation({ onSuccess: () => { closeModal(); refetch(); } });
  const deactivateMut = trpc.supplier.deactivate.useMutation({ onSuccess: () => { setDeleteId(null); setDetailId(null); refetch(); } });

  const closeModal = () => { setModal({ open: false, id: null }); setForm(EMPTY); };
  const openCreate = () => { setForm(EMPTY); setModal({ open: true, id: null }); };
  const openEdit = (s: typeof suppliers[0]) => {
    setForm({ name: s.name, contactName: s.contactName ?? "", email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "", logoUrl: (s as any).logoUrl ?? "" });
    setModal({ open: true, id: s.id });
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      contactName: form.contactName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      logoUrl: form.logoUrl || null,
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
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "280px" }}>
          <div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}><Icon name="search" size={13} /></div>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search suppliers..." style={{ ...inputStyle, padding: "9px 12px 9px 33px" }} />
        </div>
        <div style={{ display: "flex", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "3px", gap: "2px" }}>
          {(["all", "active", "inactive"] as const).map((f) => {
            const active = f === "all" ? isActive === undefined : f === "active" ? isActive === true : isActive === false;
            return (
              <button key={f} onClick={() => { setIsActive(f === "all" ? undefined : f === "active"); setPage(1); }} style={{ padding: "6px 11px", borderRadius: "8px", border: "none", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: active ? t.surface : "transparent", color: active ? t.text : t.textMuted, boxShadow: active ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s", textTransform: "capitalize" }}>
                {f}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            <Icon name="plus" size={13} /> New Supplier
          </button>
        </div>
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
            onClick={() => setDetailId(s.id)}
            style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 60px", gap: "10px", padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s", cursor: "pointer", background: detailId === s.id ? t.surfaceHover : "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = detailId === s.id ? t.surfaceHover : "transparent")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: (s as any).logoUrl ? "#fff" : "var(--primary-15)", border: (s as any).logoUrl ? `1px solid ${t.border}` : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {(s as any).logoUrl
                  ? <img src={(s as any).logoUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "3px" }} />
                  : <Icon name="supplier" size={13} style={{ color: "var(--primary-light)" }} />
                }
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
              <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={11} /></button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={11} /></button>
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

      {/* Detail Drawer */}
      {detailId && (
        <SupplierDrawer
          supplierId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            const s = suppliers.find((x) => x.id === detailId);
            if (s) { setDetailId(null); openEdit(s); }
          }}
          onDeactivate={() => setDeleteId(detailId)}
        />
      )}

      {/* Deactivate Confirm */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
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
              {/* Logo upload */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ width: "72px", height: "72px", borderRadius: "14px", border: `2px dashed ${t.inputBorder}`, background: t.inputBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}
                >
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "6px" }} />
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <Icon name="supplier" size={22} style={{ color: t.textFaint, display: "block", margin: "0 auto 4px" }} />
                      <span style={{ color: t.textFaint, fontSize: "9px" }}>Logo</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: t.textMuted, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Supplier Logo</p>
                  <p style={{ color: t.textFaint, fontSize: "11px", lineHeight: 1.5 }}>Click the box to upload. PNG, JPG under 2 MB.</p>
                  {form.logoUrl && (
                    <button onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))} style={{ marginTop: "6px", background: "none", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Remove logo</button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoFile} />
              </div>
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
