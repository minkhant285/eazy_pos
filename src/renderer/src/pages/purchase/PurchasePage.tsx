import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

type POStatus = "draft" | "sent" | "partial" | "received" | "cancelled";

const STATUS_COLORS: Record<POStatus, { bg: string; text: string }> = {
  draft:      { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  sent:       { bg: "rgba(59,130,246,0.15)",  text: "#3b82f6" },
  partial:    { bg: "rgba(245,158,11,0.15)",  text: "#f59e0b" },
  received:   { bg: "rgba(16,185,129,0.15)",  text: "#10b981" },
  cancelled:  { bg: "rgba(239,68,68,0.15)",   text: "#ef4444" },
};

interface POItem { productId: string; productName: string; qtyOrdered: number; unitCost: number; }

export const PurchasePage: React.FC = () => {
  const t = useAppStore((s) => s.theme);
  const tr = useAppStore((s) => s.tr);

  const [statusFilter, setStatusFilter] = useState<POStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.purchaseOrder.list.useQuery({ page, pageSize: PAGE_SIZE, status: statusFilter });
  const orders = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  const { data: suppliersData } = trpc.supplier.list.useQuery({ pageSize: 100, isActive: true });
  const suppliers = suppliersData?.data ?? [];

  const { data: locationsData } = trpc.location.list.useQuery({ pageSize: 100, isActive: true });
  const locations = locationsData?.data ?? [];

  const { data: usersData } = trpc.user.list.useQuery({ pageSize: 100 });
  const users = usersData?.data ?? [];

  const { data: productsData } = trpc.product.list.useQuery(
    { search: productSearch || undefined, pageSize: 30, isActive: true },
    { enabled: createOpen }
  );
  const productResults = productsData?.data ?? [];

  const createMut = trpc.purchaseOrder.create.useMutation({
    onSuccess: () => { closeCreate(); refetch(); }
  });
  const sendMut = trpc.purchaseOrder.send.useMutation({ onSuccess: () => refetch() });
  const cancelMut = trpc.purchaseOrder.cancel.useMutation({ onSuccess: () => refetch() });

  const closeCreate = () => {
    setCreateOpen(false); setSupplierId(""); setLocationId(""); setCreatedBy("");
    setNotes(""); setExpectedAt(""); setItems([]); setProductSearch("");
  };

  const addItem = (p: typeof productResults[0]) => {
    if (items.find((i) => i.productId === p.id)) return;
    setItems((prev) => [...prev, { productId: p.id, productName: p.name, qtyOrdered: 1, unitCost: Number((p as any).costPrice ?? 0) }]);
    setProductSearch("");
  };

  const updateItem = (idx: number, field: "qtyOrdered" | "unitCost", val: number) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleCreate = () => {
    if (!supplierId || !locationId || !createdBy || items.length === 0) return;
    createMut.mutate({
      supplierId,
      locationId,
      createdBy,
      notes: notes.trim() || undefined,
      expectedAt: expectedAt || undefined,
      items: items.map(({ productId, qtyOrdered, unitCost }) => ({ productId, qtyOrdered, unitCost })),
    });
  };

  const totalValue = items.reduce((sum, it) => sum + it.qtyOrdered * it.unitCost, 0);
  const canCreate = supplierId && locationId && createdBy && items.length > 0 && items.every((i) => i.qtyOrdered > 0 && i.unitCost > 0);

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
          <h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>Purchase Orders</h1>
          <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{total} orders</p>
        </div>
        <button onClick={() => setCreateOpen(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Icon name="plus" size={13} /> New Order
        </button>
      </div>

      {/* Status Tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {([undefined, "draft", "sent", "partial", "received", "cancelled"] as (POStatus | undefined)[]).map((s) => {
          const label = s ?? "All";
          const active = statusFilter === s;
          const col = s ? STATUS_COLORS[s] : null;
          return (
            <button key={String(s)} onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{ padding: "7px 14px", borderRadius: "10px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize", background: active ? (col?.bg ?? "#7c3aed20") : t.inputBg, color: active ? (col?.text ?? "#7c3aed") : t.textMuted }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1.2fr 1fr 90px 90px 90px 80px", gap: "8px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
          {["PO #", "Supplier", "Location", "Status", "Items", "Total", ""].map((h, i) => (
            <span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
          ))}
        </div>
        {isLoading ? (
          <div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: "56px", textAlign: "center" }}>
            <Icon name="purchase" size={32} style={{ color: t.textFaint, display: "block", margin: "0 auto 12px" }} />
            <p style={{ color: t.textFaint, fontSize: "13px" }}>No purchase orders found</p>
          </div>
        ) : orders.map((o) => {
          const status = ((o as any).status ?? "draft") as POStatus;
          const sc = STATUS_COLORS[status];
          const supplierName = (o as any).supplierName ?? (o as any).supplier?.name ?? "—";
          const locationName = (o as any).locationName ?? (o as any).location?.name ?? "—";
          const itemCount = (o as any).itemCount ?? (o as any).items?.length ?? 0;
          const totalAmt = Number((o as any).totalAmount ?? 0);
          return (
            <div key={o.id}
              style={{ display: "grid", gridTemplateColumns: "120px 1.2fr 1fr 90px 90px 90px 80px", gap: "8px", padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: t.textFaint, fontSize: "11px", fontFamily: "monospace" }}>#{String(o.id).slice(-8).toUpperCase()}</span>
              <span style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{supplierName}</span>
              <span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{locationName}</span>
              <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, background: sc.bg, color: sc.text, textTransform: "capitalize", width: "fit-content" }}>{status}</span>
              <span style={{ color: t.textMuted, fontSize: "12px" }}>{itemCount} items</span>
              <span style={{ color: t.text, fontSize: "12px", fontWeight: 600 }}>฿{totalAmt.toLocaleString()}</span>
              <div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }}>
                {status === "draft" && (
                  <button onClick={() => sendMut.mutate({ id: o.id })} title="Mark as Sent" style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "rgba(59,130,246,0.15)", color: "#3b82f6", cursor: "pointer", fontSize: "10px", fontWeight: 700, fontFamily: "inherit" }}>
                    SEND
                  </button>
                )}
                {(status === "draft" || status === "sent") && (
                  <button onClick={() => cancelMut.mutate({ id: o.id })} title="Cancel" style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={11} /></button>
                )}
              </div>
            </div>
          );
        })}
        <div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {orders.length} {tr.of} {total}</span>
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "3px" }}>
              {pageButtons.map((p) => (
                <button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "#7c3aed" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create PO Modal */}
      {createOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeCreate}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "560px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden", animation: "slideUp 0.22s ease", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            {/* Modal Header */}
            <div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
              <div>
                <h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>New Purchase Order</h2>
                <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>Create a draft purchase order</p>
              </div>
              <button onClick={closeCreate} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} /></button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", flex: 1 }}>
              {/* Supplier + Location */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Supplier *</label>
                  <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ ...inputStyle, color: supplierId ? t.text : t.textFaint }}>
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Location *</label>
                  <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={{ ...inputStyle, color: locationId ? t.text : t.textFaint }}>
                    <option value="">Select location</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Created By + Expected Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Created By *</label>
                  <select value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} style={{ ...inputStyle, color: createdBy ? t.text : t.textFaint }}>
                    <option value="">Select user</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  {users.length === 0 && <p style={{ color: "#f59e0b", fontSize: "11px", marginTop: "4px" }}>No users found — create a user first</p>}
                </div>
                <div>
                  <label style={labelStyle}>Expected Date</label>
                  <input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" style={inputStyle} />
              </div>

              {/* Product Search */}
              <div>
                <label style={labelStyle}>Add Products</label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}><Icon name="search" size={13} /></div>
                  <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products to add..." style={{ ...inputStyle, paddingLeft: "33px" }} />
                </div>
                {productSearch && productResults.length > 0 && (
                  <div style={{ marginTop: "4px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "10px", overflow: "hidden", maxHeight: "160px", overflowY: "auto" }}>
                    {productResults.map((p) => (
                      <div key={p.id} onClick={() => addItem(p)}
                        style={{ padding: "9px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <div>
                          <span style={{ color: t.text, fontWeight: 600 }}>{p.name}</span>
                          <span style={{ color: t.textFaint, fontSize: "11px", marginLeft: "8px" }}>{(p as any).sku}</span>
                        </div>
                        <span style={{ color: "#7c3aed", fontSize: "12px" }}><Icon name="plus" size={12} /></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div style={{ background: t.inputBg, borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 28px", gap: "8px", padding: "8px 12px", borderBottom: `1px solid ${t.borderMid}` }}>
                    {["Product", "Qty", "Unit Cost", ""].map((h, i) => (
                      <span key={i} style={{ color: t.textFaint, fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{h}</span>
                    ))}
                  </div>
                  {items.map((item, idx) => (
                    <div key={item.productId} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 28px", gap: "8px", padding: "8px 12px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}` }}>
                      <span style={{ color: t.text, fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productName}</span>
                      <input type="number" min={1} value={item.qtyOrdered} onChange={(e) => updateItem(idx, "qtyOrdered", Number(e.target.value))} style={{ ...inputStyle, padding: "5px 8px", fontSize: "12px", textAlign: "center" }} />
                      <input type="number" min={0} step={0.01} value={item.unitCost} onChange={(e) => updateItem(idx, "unitCost", Number(e.target.value))} style={{ ...inputStyle, padding: "5px 8px", fontSize: "12px" }} />
                      <button onClick={() => removeItem(idx)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={10} /></button>
                    </div>
                  ))}
                  <div style={{ padding: "10px 12px", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ color: t.text, fontSize: "13px", fontWeight: 700 }}>Total: ฿{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "0 22px 22px", display: "flex", gap: "10px", flexShrink: 0 }}>
              <button onClick={closeCreate} disabled={createMut.isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
              <button onClick={handleCreate} disabled={createMut.isPending || !canCreate} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: !canCreate ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: createMut.isPending || !canCreate ? 0.7 : 1 }}>
                {createMut.isPending ? "Creating..." : "Create Draft PO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
