import React, { useState } from "react";
import { AppSelect } from '../../components/ui/AppSelect';
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

// ── PO Detail Drawer ──────────────────────────────────────────

interface PODetailDrawerProps {
  poId: string;
  onClose: () => void;
  onRefetch: () => void;
  onReceive: (poId: string) => void;
}

const PODetailDrawer: React.FC<PODetailDrawerProps> = ({ poId, onClose, onRefetch, onReceive }) => {
  const t   = useAppStore((s) => s.theme);
  const sym = useAppStore((s) => s.currency.symbol);

  const { data: po, isLoading, refetch: refetchDetail } = trpc.purchaseOrder.getById.useQuery({ id: poId });

  const sendMut   = trpc.purchaseOrder.send.useMutation({ onSuccess: () => { refetchDetail(); onRefetch(); } });
  const cancelMut = trpc.purchaseOrder.cancel.useMutation({ onSuccess: () => { refetchDetail(); onRefetch(); } });

  const status = ((po as any)?.status ?? "draft") as POStatus;
  const sc     = STATUS_COLORS[status];
  const items  = (po?.items as any[]) ?? [];

  const totalOrdered  = items.reduce((s, i) => s + Number(i.qtyOrdered),  0);
  const totalReceived = items.reduce((s, i) => s + Number(i.qtyReceived ?? 0), 0);
  const pct           = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  const fieldStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: "2px",
  };
  const fieldLabel: React.CSSProperties = {
    color: t.textFaint, fontSize: "10px", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.5px",
  };
  const fieldValue: React.CSSProperties = {
    color: t.text, fontSize: "13px", fontWeight: 500,
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.35)" }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 56,
          width: "480px", maxWidth: "100vw",
          background: t.surface, borderLeft: `1px solid ${t.borderStrong}`,
          boxShadow: "-16px 0 48px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column",
          animation: "slideInRight 0.22s ease",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            {isLoading ? (
              <div style={{ color: t.textFaint, fontSize: "14px" }}>Loading…</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ color: t.text, fontWeight: 800, fontSize: "16px", letterSpacing: "-0.3px" }}>
                    {(po as any)?.poNumber ?? "—"}
                  </h2>
                  <span style={{ padding: "3px 10px", borderRadius: "7px", fontSize: "10px", fontWeight: 700, background: sc.bg, color: sc.text, textTransform: "capitalize" }}>
                    {status}
                  </span>
                </div>
                <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>
                  {(po as any)?.supplierName ?? "No supplier"} · {(po as any)?.locationName ?? "No location"}
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ width: "30px", height: "30px", borderRadius: "9px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {isLoading ? (
            <p style={{ color: t.textFaint, fontSize: "13px", textAlign: "center", paddingTop: "40px" }}>Loading order details…</p>
          ) : (
            <>
              {/* Meta grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={fieldStyle}>
                  <span style={fieldLabel}>Supplier</span>
                  <span style={fieldValue}>{(po as any)?.supplierName ?? "—"}</span>
                </div>
                <div style={fieldStyle}>
                  <span style={fieldLabel}>Location</span>
                  <span style={fieldValue}>{(po as any)?.locationName ?? "—"}</span>
                </div>
                <div style={fieldStyle}>
                  <span style={fieldLabel}>Created By</span>
                  <span style={fieldValue}>{(po as any)?.createdBy ?? "—"}</span>
                </div>
                <div style={fieldStyle}>
                  <span style={fieldLabel}>Expected Date</span>
                  <span style={fieldValue}>
                    {(po as any)?.expectedAt
                      ? new Date((po as any).expectedAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div style={fieldStyle}>
                  <span style={fieldLabel}>Created At</span>
                  <span style={fieldValue}>
                    {(po as any)?.createdAt
                      ? new Date((po as any).createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div style={fieldStyle}>
                  <span style={fieldLabel}>Total Amount</span>
                  <span style={{ ...fieldValue, color: "var(--primary)", fontWeight: 800, fontSize: "15px" }}>
                    {sym}{Number((po as any)?.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {(po as any)?.notes && (
                <div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 14px" }}>
                  <p style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Notes</p>
                  <p style={{ color: t.textMuted, fontSize: "13px" }}>{(po as any).notes}</p>
                </div>
              )}

              {/* Receiving progress (only for non-draft) */}
              {status !== "draft" && status !== "cancelled" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ color: t.textMuted, fontSize: "11px", fontWeight: 600 }}>Receiving Progress</span>
                    <span style={{ color: t.text, fontSize: "11px", fontWeight: 700 }}>{totalReceived} / {totalOrdered} units ({pct}%)</span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "4px", background: t.inputBg, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10b981" : "#f59e0b", borderRadius: "4px", transition: "width 0.3s" }} />
                  </div>
                </div>
              )}

              {/* Line items */}
              <div>
                <p style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Line Items ({items.length})
                </p>
                <div style={{ background: t.inputBg, borderRadius: "12px", overflow: "hidden" }}>
                  {/* Col headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 55px 60px 60px 80px", gap: "6px", padding: "8px 14px", borderBottom: `1px solid ${t.borderMid}` }}>
                    {["Product", "Order", "Recvd", "Pend", "Total"].map((h, i) => (
                      <span key={i} style={{ color: t.textFaint, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
                    ))}
                  </div>

                  {items.length === 0 ? (
                    <p style={{ color: t.textFaint, fontSize: "12px", textAlign: "center", padding: "20px" }}>No items</p>
                  ) : items.map((item) => {
                    const pending       = Math.max(0, Number(item.qtyOrdered) - Number(item.qtyReceived ?? 0));
                    const fullyReceived = pending === 0;
                    return (
                      <div
                        key={item.id}
                        style={{ display: "grid", gridTemplateColumns: "1.6fr 55px 60px 60px 80px", gap: "6px", padding: "10px 14px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}` }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: t.text, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productName}</p>
                          <p style={{ color: t.textFaint, fontSize: "10px", fontFamily: "monospace" }}>{item.productSku}</p>
                          <p style={{ color: t.textFaint, fontSize: "10px" }}>{sym}{Number(item.unitCost).toFixed(2)} / unit</p>
                        </div>
                        <span style={{ color: t.textMuted, fontSize: "12px" }}>{Number(item.qtyOrdered)}</span>
                        <span style={{ color: Number(item.qtyReceived) > 0 ? "#10b981" : t.textFaint, fontSize: "12px", fontWeight: 600 }}>
                          {Number(item.qtyReceived ?? 0)}
                        </span>
                        <span style={{ color: pending > 0 ? "#f59e0b" : "#10b981", fontSize: "12px", fontWeight: 600 }}>
                          {fullyReceived ? "✓" : pending}
                        </span>
                        <span style={{ color: t.text, fontSize: "12px", fontWeight: 600 }}>
                          {sym}{Number(item.totalCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}

                  {/* Totals row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 55px 60px 60px 80px", gap: "6px", padding: "10px 14px", borderTop: `1px solid ${t.borderMid}`, background: `${t.surface}80` }}>
                    <span style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700 }}>Total</span>
                    <span style={{ color: t.text, fontSize: "12px", fontWeight: 700 }}>{totalOrdered}</span>
                    <span style={{ color: "#10b981", fontSize: "12px", fontWeight: 700 }}>{totalReceived}</span>
                    <span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 700 }}>{totalOrdered - totalReceived}</span>
                    <span style={{ color: "var(--primary)", fontSize: "12px", fontWeight: 800 }}>
                      {sym}{Number((po as any)?.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!isLoading && (
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "8px", flexShrink: 0 }}>
            {status === "draft" && (
              <button
                onClick={() => sendMut.mutate({ id: poId })}
                disabled={sendMut.isPending}
                style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "rgba(59,130,246,0.15)", color: "#3b82f6", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                {sendMut.isPending ? "Sending…" : "Send to Supplier"}
              </button>
            )}
            {(status === "sent" || status === "partial") && (
              <button
                onClick={() => onReceive(poId)}
                style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "rgba(16,185,129,0.15)", color: "#10b981", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                Receive Goods
              </button>
            )}
            {(status === "draft" || status === "sent") && (
              <button
                onClick={() => cancelMut.mutate({ id: poId })}
                disabled={cancelMut.isPending}
                style={{ padding: "10px 16px", borderRadius: "11px", border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                {cancelMut.isPending ? "Cancelling…" : "Cancel Order"}
              </button>
            )}
            {(status === "received" || status === "cancelled") && (
              <div style={{ flex: 1, padding: "10px", borderRadius: "11px", background: t.inputBg, textAlign: "center" }}>
                <span style={{ color: t.textFaint, fontSize: "12px" }}>
                  {status === "received" ? "This order is fully received." : "This order has been cancelled."}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ── Receive Modal ─────────────────────────────────────────────

interface ReceiveModalProps {
  poId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReceiveModal: React.FC<ReceiveModalProps> = ({ poId, onClose, onSuccess }) => {
  const t   = useAppStore((s) => s.theme);
  const sym = useAppStore((s) => s.currency.symbol);

  const { data: po, isLoading } = trpc.purchaseOrder.getById.useQuery({ id: poId });
  const { data: usersData }     = trpc.user.list.useQuery({ pageSize: 100 });
  const users = usersData?.data ?? [];

  const [receivedBy, setReceivedBy] = useState("");
  const [receiveMap, setReceiveMap] = useState<Record<string, { qty: string; cost: string }>>({});

  const receiveMut = trpc.purchaseOrder.receive.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  React.useEffect(() => {
    if (!po?.items) return;
    const init: Record<string, { qty: string; cost: string }> = {};
    for (const item of po.items as any[]) {
      const pending = Math.max(0, Number(item.qtyOrdered) - Number(item.qtyReceived ?? 0));
      init[item.id] = { qty: String(pending), cost: String(item.unitCost) };
    }
    setReceiveMap(init);
  }, [(po?.items as any[])?.length]);

  const setField = (itemId: string, field: "qty" | "cost", val: string) => {
    setReceiveMap((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: val } }));
  };

  const handleReceive = () => {
    if (!receivedBy) return;
    const receivedItems = (po?.items as any[])
      .filter((item) => parseFloat(receiveMap[item.id]?.qty ?? "0") > 0)
      .map((item) => ({
        purchaseOrderItemId: item.id,
        productId: item.productId,
        qtyReceived: parseFloat(receiveMap[item.id].qty),
        unitCost: parseFloat(receiveMap[item.id].cost) || undefined,
      }));
    if (receivedItems.length === 0) return;
    receiveMut.mutate({ poId, receivedItems, receivedBy });
  };

  const inputStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "9px",
    padding: "7px 10px", color: t.text, fontSize: "12px", outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  const canSubmit = !!receivedBy && !receiveMut.isPending &&
    (po?.items as any[] ?? []).some((item) => parseFloat(receiveMap[item.id]?.qty ?? "0") > 0);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: "620px", margin: "0 16px",
          background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)", overflow: "hidden",
          animation: "slideUp 0.22s ease", display: "flex", flexDirection: "column", maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Receive Goods</h2>
            <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>
              {po ? `${(po as any).poNumber} · ${(po as any).supplierName ?? ""}` : "Loading…"}
            </p>
          </div>
          <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          {isLoading ? (
            <p style={{ color: t.textFaint, fontSize: "13px", textAlign: "center", padding: "32px 0" }}>Loading order…</p>
          ) : (
            <>
              <div>
                <label style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "5px" }}>
                  Received By *
                </label>
               <AppSelect
                value={receivedBy}
                onChange={setReceivedBy}
                options={[{ value: '', label: 'Select user' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                isSearchable={false}
              />
              </div>

              <div style={{ background: t.inputBg, borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 70px 70px 70px 90px 90px", gap: "8px", padding: "9px 14px", borderBottom: `1px solid ${t.borderMid}` }}>
                  {["Product", "Ordered", "Received", "Pending", "Receive Now", `Cost (${sym})`].map((h, i) => (
                    <span key={i} style={{ color: t.textFaint, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
                  ))}
                </div>
                {(po?.items as any[] ?? []).map((item) => {
                  const pending       = Math.max(0, Number(item.qtyOrdered) - Number(item.qtyReceived ?? 0));
                  const entry         = receiveMap[item.id] ?? { qty: "0", cost: String(item.unitCost) };
                  const fullyReceived = pending === 0;
                  return (
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 70px 70px 70px 90px 90px", gap: "8px", padding: "9px 14px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, opacity: fullyReceived ? 0.5 : 1 }}>
                      <div>
                        <p style={{ color: t.text, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productName}</p>
                        <p style={{ color: t.textFaint, fontSize: "10px", fontFamily: "monospace" }}>{item.productSku}</p>
                      </div>
                      <span style={{ color: t.textMuted, fontSize: "12px" }}>{Number(item.qtyOrdered)}</span>
                      <span style={{ color: Number(item.qtyReceived) > 0 ? "#10b981" : t.textFaint, fontSize: "12px" }}>{Number(item.qtyReceived ?? 0)}</span>
                      <span style={{ color: pending > 0 ? "#f59e0b" : "#10b981", fontSize: "12px", fontWeight: 600 }}>{pending}</span>
                      <input type="number" min="0" max={pending} step="1" value={entry.qty}
                        onChange={(e) => setField(item.id, "qty", e.target.value)}
                        disabled={fullyReceived}
                        style={{ ...inputStyle, textAlign: "center", opacity: fullyReceived ? 0.5 : 1 }} />
                      <input type="number" min="0" step="0.01" value={entry.cost}
                        onChange={(e) => setField(item.id, "cost", e.target.value)}
                        disabled={fullyReceived}
                        style={{ ...inputStyle, opacity: fullyReceived ? 0.5 : 1 }} />
                    </div>
                  );
                })}
              </div>

              <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px", padding: "10px 14px" }}>
                <p style={{ color: "#10b981", fontSize: "11px", fontWeight: 600 }}>
                  Stock will be added to <strong>{(po as any)?.locationName ?? ""}</strong>. Items not fully received will move the order to <em>Partial</em> status.
                </p>
              </div>

              {receiveMut.isError && (
                <p style={{ color: "#ef4444", fontSize: "12px" }}>{(receiveMut.error as any)?.message ?? "Failed to receive goods."}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "8px", flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={handleReceive} disabled={!canSubmit}
            style={{ flex: 2, padding: "10px", borderRadius: "11px", border: "none", background: canSubmit ? "#10b981" : t.inputBg, color: canSubmit ? "#fff" : t.textFaint, fontSize: "13px", fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s" }}>
            {receiveMut.isPending ? "Receiving…" : "Confirm Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main PurchasePage ─────────────────────────────────────────

export const PurchasePage: React.FC = () => {
  const t   = useAppStore((s) => s.theme);
  const sym = useAppStore((s) => s.currency.symbol);
  const tr  = useAppStore((s) => s.tr);

  const [statusFilter, setStatusFilter] = useState<POStatus | undefined>(undefined);
  const [page, setPage]               = useState(1);
  const [createOpen, setCreateOpen]   = useState(false);
  const [detailPoId, setDetailPoId]   = useState<string | null>(null);
  const [receivePoId, setReceivePoId] = useState<string | null>(null);

  // Create form state
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [createdBy, setCreatedBy]   = useState("");
  const [notes, setNotes]           = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [items, setItems]           = useState<POItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.purchaseOrder.list.useQuery({ page, pageSize: PAGE_SIZE, status: statusFilter });
  const orders     = data?.data ?? [];
  const total      = data?.total ?? 0;
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

  const createMut = trpc.purchaseOrder.create.useMutation({ onSuccess: () => { closeCreate(); refetch(); } });

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
      supplierId, locationId, createdBy,
      notes: notes.trim() || undefined,
      expectedAt: expectedAt || undefined,
      items: items.map(({ productId, qtyOrdered, unitCost }) => ({ productId, qtyOrdered, unitCost })),
    });
  };

  const totalValue = items.reduce((sum, it) => sum + it.qtyOrdered * it.unitCost, 0);
  const canCreate  = !!(supplierId && locationId && createdBy && items.length > 0 && items.every((i) => i.qtyOrdered > 0 && i.unitCost > 0));

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
        <button onClick={() => setCreateOpen(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Icon name="plus" size={13} /> New Order
        </button>
      </div>

      {/* Status Tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {([undefined, "draft", "sent", "partial", "received", "cancelled"] as (POStatus | undefined)[]).map((s) => {
          const label  = s ?? "All";
          const active = statusFilter === s;
          const col    = s ? STATUS_COLORS[s] : null;
          return (
            <button key={String(s)} onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{ padding: "7px 14px", borderRadius: "10px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize", background: active ? (col?.bg ?? "var(--primary)20") : t.inputBg, color: active ? (col?.text ?? "var(--primary)") : t.textMuted }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1.2fr 1fr 90px 70px 90px 110px", gap: "8px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
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
          const status       = ((o as any).status ?? "draft") as POStatus;
          const sc           = STATUS_COLORS[status];
          const supplierName = (o as any).supplierName ?? (o as any).supplier?.name ?? "—";
          const locationName = (o as any).locationName ?? (o as any).location?.name ?? "—";
          const itemCount    = (o as any).itemCount ?? (o as any).items?.length ?? 0;
          const totalAmt     = Number((o as any).totalAmount ?? 0);
          const poNumber     = (o as any).poNumber ?? `#${String(o.id).slice(-8).toUpperCase()}`;
          const isSelected   = detailPoId === o.id;
          return (
            <div
              key={o.id}
              onClick={() => setDetailPoId(o.id)}
              style={{
                display: "grid", gridTemplateColumns: "120px 1.2fr 1fr 90px 70px 90px 110px",
                gap: "8px", padding: "13px 18px", alignItems: "center",
                borderBottom: `1px solid ${t.borderMid}`, cursor: "pointer",
                transition: "background 0.15s",
                background: isSelected ? `${sc.bg}` : "transparent",
                borderLeft: isSelected ? `3px solid ${sc.text}` : "3px solid transparent",
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = t.surfaceHover; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: t.textFaint, fontSize: "11px", fontFamily: "monospace" }}>{poNumber}</span>
              <span style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{supplierName}</span>
              <span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{locationName}</span>
              <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, background: sc.bg, color: sc.text, textTransform: "capitalize", width: "fit-content" }}>{status}</span>
              <span style={{ color: t.textMuted, fontSize: "12px" }}>{itemCount}</span>
              <span style={{ color: t.text, fontSize: "12px", fontWeight: 600 }}>{sym}{totalAmt.toLocaleString()}</span>

              {/* Action buttons — stopPropagation so they don't open the drawer */}
              <div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                {status === "draft" && (
                  <button
                    onClick={() => setDetailPoId(o.id)}
                    title="View details"
                    style={{ padding: "4px 9px", borderRadius: "6px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", fontSize: "10px", fontWeight: 700, fontFamily: "inherit" }}
                  >
                    VIEW
                  </button>
                )}
                {(status === "sent" || status === "partial") && (
                  <button
                    onClick={() => setReceivePoId(o.id)}
                    title="Receive goods"
                    style={{ padding: "4px 9px", borderRadius: "6px", border: "none", background: "rgba(16,185,129,0.15)", color: "#10b981", cursor: "pointer", fontSize: "10px", fontWeight: 700, fontFamily: "inherit" }}
                  >
                    RECEIVE
                  </button>
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
                <button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "var(--primary)" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
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
            <div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
              <div>
                <h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>New Purchase Order</h2>
                <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>Create a draft purchase order</p>
              </div>
              <button onClick={closeCreate} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} /></button>
            </div>

            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Supplier *</label>
                 <AppSelect
                  value={supplierId}
                  onChange={setSupplierId}
                  options={[{ value: '', label: 'Select supplier' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]}
                />
                </div>
                <div>
                  <label style={labelStyle}>Location *</label>
                 <AppSelect
                  value={locationId}
                  onChange={setLocationId}
                  options={[{ value: '', label: 'Select location' }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
                  isSearchable={false}
                />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Created By *</label>
                 <AppSelect
                  value={createdBy}
                  onChange={setCreatedBy}
                  options={[{ value: '', label: 'Select user' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                  isSearchable={false}
                />
                  {users.length === 0 && <p style={{ color: "#f59e0b", fontSize: "11px", marginTop: "4px" }}>No users found — create a user first</p>}
                </div>
                <div>
                  <label style={labelStyle}>Expected Date</label>
                  <input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" style={inputStyle} />
              </div>

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
                        <span style={{ color: "var(--primary)", fontSize: "12px" }}><Icon name="plus" size={12} /></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                    <span style={{ color: t.text, fontSize: "13px", fontWeight: 700 }}>Total: {sym}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "0 22px 22px", display: "flex", gap: "10px", flexShrink: 0 }}>
              <button onClick={closeCreate} disabled={createMut.isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
              <button onClick={handleCreate} disabled={createMut.isPending || !canCreate} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: !canCreate ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: createMut.isPending || !canCreate ? 0.7 : 1 }}>
                {createMut.isPending ? "Creating..." : "Create Draft PO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detailPoId && (
        <PODetailDrawer
          poId={detailPoId}
          onClose={() => setDetailPoId(null)}
          onRefetch={refetch}
          onReceive={(id) => { setReceivePoId(id); }}
        />
      )}

      {/* Receive Modal */}
      {receivePoId && (
        <ReceiveModal
          poId={receivePoId}
          onClose={() => setReceivePoId(null)}
          onSuccess={() => { refetch(); setReceivePoId(null); }}
        />
      )}
    </div>
  );
};
