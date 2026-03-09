import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { AppSelect } from '../../components/ui/AppSelect';
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";
import { SingleDatePicker } from '../../components/ui/SingleDatePicker';

type POStatus = "draft" | "sent" | "partial" | "received" | "cancelled";

const STATUS_COLORS: Record<POStatus, { bg: string; text: string }> = {
  draft:      { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  sent:       { bg: "rgba(59,130,246,0.15)",  text: "#3b82f6" },
  partial:    { bg: "rgba(245,158,11,0.15)",  text: "#f59e0b" },
  received:   { bg: "rgba(16,185,129,0.15)",  text: "#10b981" },
  cancelled:  { bg: "rgba(239,68,68,0.15)",   text: "#ef4444" },
};

interface POItem { productId: string; productName: string; productSku: string; imageUrl: string | null; qtyOrdered: number; unitCost: number; }

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

  const sendMut    = trpc.purchaseOrder.send.useMutation({ onSuccess: () => { refetchDetail(); onRefetch(); } });
  const cancelMut  = trpc.purchaseOrder.cancel.useMutation({ onSuccess: () => { refetchDetail(); onRefetch(); } });
  const payDebtMut = trpc.purchaseOrder.payDebt.useMutation({ onSuccess: () => { refetchDetail(); onRefetch(); setDebtPayAmount(""); } });

  const [debtPayAmount, setDebtPayAmount] = React.useState("");

  const status = ((po as any)?.status ?? "draft") as POStatus;
  const sc     = STATUS_COLORS[status];
  const items  = (po?.items as any[]) ?? [];

  const totalOrdered  = items.reduce((s, i) => s + Number(i.qtyOrdered),  0);
  const totalReceived = items.reduce((s, i) => s + Number(i.qtyReceived ?? 0), 0);
  const pct           = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  const poTotalAmount = Number((po as any)?.totalAmount ?? 0);
  const poPaidAmount  = Number((po as any)?.paidAmount ?? 0);
  const poDebtAmount  = Math.max(0, poTotalAmount - poPaidAmount);

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
                    {sym}{poTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={fieldStyle}>
                  <span style={fieldLabel}>Paid</span>
                  <span style={{ ...fieldValue, color: poPaidAmount >= poTotalAmount ? "#10b981" : "#f59e0b", fontWeight: 700 }}>
                    {sym}{poPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {poDebtAmount > 0 && (
                  <div style={fieldStyle}>
                    <span style={fieldLabel}>Outstanding Debt</span>
                    <span style={{ ...fieldValue, color: "#ef4444", fontWeight: 800 }}>
                      {sym}{poDebtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Debt payment section */}
              {poDebtAmount > 0 && (
                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "14px" }}>
                  <p style={{ color: "#ef4444", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                    Record Debt Payment
                  </p>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="number" min="0.01" max={poDebtAmount} step="0.01"
                      value={debtPayAmount}
                      onChange={(e) => setDebtPayAmount(e.target.value)}
                      placeholder={`Max ${sym}${poDebtAmount.toFixed(2)}`}
                      style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "9px", padding: "8px 12px", color: t.text, fontSize: "13px", outline: "none", fontFamily: "inherit" }}
                    />
                    <button
                      onClick={() => {
                        const amt = parseFloat(debtPayAmount);
                        if (!amt || amt <= 0) return;
                        payDebtMut.mutate({ poId, amount: amt });
                      }}
                      disabled={!debtPayAmount || parseFloat(debtPayAmount) <= 0 || payDebtMut.isPending}
                      style={{ padding: "8px 16px", borderRadius: "9px", border: "none", background: "#ef4444", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                    >
                      {payDebtMut.isPending ? "Saving…" : "Pay"}
                    </button>
                  </div>
                  {payDebtMut.error && (
                    <p style={{ color: "#ef4444", fontSize: "11px", marginTop: "6px" }}>{(payDebtMut.error as any)?.message}</p>
                  )}
                </div>
              )}

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

const RECEIVE_COLS = "1.8fr 65px 65px 65px 95px 95px";

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
    background: t.surface, border: `1px solid ${t.inputBorder}`, borderRadius: "8px",
    padding: "6px 9px", color: t.text, fontSize: "12px", outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  // Merge items with current receiveMap so TanStack rows stay consistent
  const tableData = useMemo(() =>
    (po?.items as any[] ?? []).map((item) => ({
      ...item,
      _entry:   receiveMap[item.id] ?? { qty: "0", cost: String(item.unitCost) },
      _pending: Math.max(0, Number(item.qtyOrdered) - Number(item.qtyReceived ?? 0)),
    })),
    [po?.items, receiveMap]
  );

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: "product",
      header: "Product",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div style={{ minWidth: 0 }}>
            <p style={{ color: t.text, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productName}</p>
            <p style={{ color: t.textFaint, fontSize: "10px", fontFamily: "monospace" }}>{item.productSku}</p>
            <p style={{ color: t.textFaint, fontSize: "10px" }}>{sym}{Number(item.unitCost).toFixed(2)} / unit</p>
          </div>
        );
      },
    },
    {
      id: "ordered",
      header: "Ordered",
      cell: ({ row }) => (
        <span style={{ color: t.textMuted, fontSize: "12px", fontWeight: 500 }}>
          {Number(row.original.qtyOrdered)}
        </span>
      ),
    },
    {
      id: "received",
      header: "Received",
      cell: ({ row }) => {
        const qty = Number(row.original.qtyReceived ?? 0);
        return (
          <span style={{ color: qty > 0 ? "#10b981" : t.textFaint, fontSize: "12px", fontWeight: 600 }}>
            {qty}
          </span>
        );
      },
    },
    {
      id: "pending",
      header: "Pending",
      cell: ({ row }) => {
        const p = row.original._pending;
        return (
          <span style={{ color: p > 0 ? "#f59e0b" : "#10b981", fontSize: "12px", fontWeight: 700 }}>
            {p === 0 ? "✓" : p}
          </span>
        );
      },
    },
    {
      id: "receiveNow",
      header: "Receive Now",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <input
            type="number" min="0" max={item._pending} step="1"
            value={item._entry.qty}
            onChange={(e) => setField(item.id, "qty", e.target.value)}
            disabled={item._pending === 0}
            style={{ ...inputStyle, textAlign: "center" as const }}
          />
        );
      },
    },
    {
      id: "unitCost",
      header: `Cost (${sym})`,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <input
            type="number" min="0" step="0.01"
            value={item._entry.cost}
            onChange={(e) => setField(item.id, "cost", e.target.value)}
            disabled={item._pending === 0}
            style={inputStyle}
          />
        );
      },
    },
  ], [t, sym]);  // setField is stable (functional update), inputStyle deps covered by t

  const receiveTable = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalOrdered  = tableData.reduce((s, i) => s + Number(i.qtyOrdered), 0);
  const totalReceived = tableData.reduce((s, i) => s + Number(i.qtyReceived ?? 0), 0);
  const totalPending  = tableData.reduce((s, i) => s + i._pending, 0);
  const totalNow      = tableData.reduce((s, i) => s + (parseFloat(i._entry.qty) || 0), 0);

  const canSubmit = !!receivedBy && !receiveMut.isPending && totalNow > 0;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: "720px", margin: "0 16px",
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
              {/* Received By */}
              <div style={{ maxWidth: "280px" }}>
                <label style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "5px" }}>
                  Received By *
                </label>
                <AppSelect
                  value={receivedBy}
                  onChange={setReceivedBy}
                  options={[{ value: "", label: "Select user" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                  isSearchable={false}
                />
              </div>

              {/* TanStack Table */}
              <div style={{ border: `1px solid ${t.borderMid}`, borderRadius: "12px", overflow: "hidden" }}>
                {/* Column headers */}
                {receiveTable.getHeaderGroups().map((hg) => (
                  <div key={hg.id} style={{ display: "grid", gridTemplateColumns: RECEIVE_COLS, gap: "8px", padding: "9px 14px", borderBottom: `1px solid ${t.borderMid}`, background: t.inputBg }}>
                    {hg.headers.map((header) => (
                      <span key={header.id} style={{ color: t.textFaint, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                    ))}
                  </div>
                ))}

                {/* Rows */}
                {receiveTable.getRowModel().rows.length === 0 ? (
                  <p style={{ color: t.textFaint, fontSize: "12px", textAlign: "center", padding: "24px" }}>No items</p>
                ) : (
                  receiveTable.getRowModel().rows.map((row) => {
                    const fullyReceived = row.original._pending === 0;
                    return (
                      <div
                        key={row.id}
                        style={{
                          display: "grid", gridTemplateColumns: RECEIVE_COLS, gap: "8px",
                          padding: "10px 14px", alignItems: "center",
                          borderBottom: `1px solid ${t.borderMid}`,
                          background: fullyReceived ? `${t.inputBg}60` : "transparent",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { if (!fullyReceived) e.currentTarget.style.background = t.surfaceHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = fullyReceived ? `${t.inputBg}60` : "transparent"; }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <div key={cell.id} style={{ overflow: "hidden", display: "flex", alignItems: "center" }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ))}
                      </div>
                    );
                  })
                )}

                {/* Summary footer */}
                {tableData.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: RECEIVE_COLS, gap: "8px", padding: "9px 14px", borderTop: `1px solid ${t.borderMid}`, background: `${t.inputBg}80` }}>
                    <span style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700 }}>Total</span>
                    <span style={{ color: t.text, fontSize: "12px", fontWeight: 700 }}>{totalOrdered}</span>
                    <span style={{ color: "#10b981", fontSize: "12px", fontWeight: 700 }}>{totalReceived}</span>
                    <span style={{ color: totalPending > 0 ? "#f59e0b" : "#10b981", fontSize: "12px", fontWeight: 700 }}>{totalPending}</span>
                    <span style={{ color: "var(--primary)", fontSize: "12px", fontWeight: 800 }}>{totalNow}</span>
                    <span />
                  </div>
                )}
              </div>

              {/* Info banner */}
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
          <button
            onClick={handleReceive}
            disabled={!canSubmit}
            style={{ flex: 2, padding: "10px", borderRadius: "11px", border: "none", background: canSubmit ? "#10b981" : t.inputBg, color: canSubmit ? "#fff" : t.textFaint, fontSize: "13px", fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s" }}
          >
            {receiveMut.isPending ? "Receiving…" : "Confirm Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main PurchasePage ─────────────────────────────────────────

export const PurchasePage: React.FC = () => {
  const t      = useAppStore((s) => s.theme);
  const isDark = useAppStore((s) => s.isDark);
  const sym    = useAppStore((s) => s.currency.symbol);
  const tr     = useAppStore((s) => s.tr);

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
  const [paidAmount, setPaidAmount] = useState("");

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

  const { data: productsData, isFetching: productsFetching } = trpc.product.list.useQuery(
    { search: productSearch || undefined, pageSize: 30, isActive: true },
    { enabled: createOpen }
  );
  const productResults = productsData?.data ?? [];

  const createMut = trpc.purchaseOrder.create.useMutation({ onSuccess: () => { closeCreate(); refetch(); } });

  const closeCreate = () => {
    setCreateOpen(false); setSupplierId(""); setLocationId(""); setCreatedBy("");
    setNotes(""); setExpectedAt(""); setItems([]); setProductSearch(""); setPaidAmount("");
  };

  const addItem = (p: typeof productResults[0]) => {
    if (items.find((i) => i.productId === p.id)) return;
    setItems((prev) => [...prev, {
      productId: p.id,
      productName: p.name,
      productSku: (p as any).sku ?? "",
      imageUrl: (p as any).imageUrl ?? null,
      qtyOrdered: 1,
      unitCost: Number((p as any).costPrice ?? 0),
    }]);
    setProductSearch("");
  };

  const updateItem = (idx: number, field: "qtyOrdered" | "unitCost", val: number) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleCreate = () => {
    if (!supplierId || !locationId || !createdBy || items.length === 0) return;
    const paid = parseFloat(paidAmount) || 0;
    createMut.mutate({
      supplierId, locationId, createdBy,
      notes: notes.trim() || undefined,
      expectedAt: expectedAt || undefined,
      items: items.map(({ productId, qtyOrdered, unitCost }) => ({ productId, qtyOrdered, unitCost })),
      paidAmount: paid > 0 ? paid : undefined,
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
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "3px", gap: "2px" }}>
          {([undefined, "draft", "sent", "partial", "received", "cancelled"] as (POStatus | undefined)[]).map((s) => {
            const label  = s ?? "All";
            const active = statusFilter === s;
            const col    = s ? STATUS_COLORS[s] : null;
            return (
              <button key={String(s)} onClick={() => { setStatusFilter(s); setPage(1); }}
                style={{ padding: "6px 11px", borderRadius: "8px", border: "none", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize", transition: "all 0.15s", background: active ? (col?.bg ?? t.surface) : "transparent", color: active ? (col?.text ?? t.text) : t.textMuted, boxShadow: active ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setCreateOpen(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            <Icon name="plus" size={13} /> New Order
          </button>
        </div>
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
          const paidAmt      = Number((o as any).paidAmount ?? 0);
          const hasDebt      = paidAmt < totalAmt;
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
              <div>
                <span style={{ color: t.text, fontSize: "12px", fontWeight: 600 }}>{sym}{totalAmt.toLocaleString()}</span>
                {hasDebt && (
                  <p style={{ color: "#ef4444", fontSize: "10px", fontWeight: 700, marginTop: "1px" }}>
                    Debt {sym}{(totalAmt - paidAmt).toLocaleString()}
                  </p>
                )}
              </div>

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

      {/* Create PO Modal — full window, two-column */}
      {createOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeCreate}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(95vw, 1140px)", height: "min(90vh, 780px)", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 32px 100px rgba(0,0,0,0.35)", animation: "slideUp 0.22s ease", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Header */}
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>New Purchase Order</h2>
                <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>Search and add products on the left, fill order details on the right</p>
              </div>
              <button onClick={closeCreate} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={13} /></button>
            </div>

            {/* Two-column body */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", overflow: "hidden" }}>

              {/* ── LEFT: Stock search + selected items ── */}
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: `1px solid ${t.borderMid}` }}>

                {/* Search bar */}
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.borderMid}`, flexShrink: 0 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: productSearch ? t.textMuted : t.textFaint }}>
                      {productsFetching && productSearch
                        ? <div style={{ width: "13px", height: "13px", border: `2px solid ${t.border}`, borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                        : <Icon name="search" size={13} />
                      }
                    </div>
                    <input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products to add…"
                      style={{ ...inputStyle, paddingLeft: "33px" }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Search results — shown in-flow when searching */}
                {productSearch && (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {!productsFetching && productResults.length === 0 ? (
                      <div style={{ padding: "32px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Icon name="search" size={14} style={{ color: t.textFaint, flexShrink: 0 }} />
                        <p style={{ color: t.textFaint, fontSize: "12px" }}>No products found for "<span style={{ color: t.textMuted, fontWeight: 600 }}>{productSearch}</span>"</p>
                      </div>
                    ) : (
                      productResults.map((p, pi) => {
                        const alreadyAdded = items.some((i) => i.productId === p.id);
                        return (
                          <div key={p.id} onClick={() => !alreadyAdded && addItem(p)}
                            style={{ padding: "9px 20px", cursor: alreadyAdded ? "default" : "pointer", display: "flex", alignItems: "center", gap: "10px", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s, opacity 0.15s", opacity: alreadyAdded ? 0.45 : 1, animation: `rowSlideIn 0.18s ease both`, animationDelay: `${pi * 25}ms` }}
                            onMouseEnter={(e) => { if (!alreadyAdded) e.currentTarget.style.background = t.surfaceHover; }}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#fff", border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {(p as any).imageUrl
                                ? <img src={(p as any).imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                : <Icon name="product" size={16} style={{ color: t.textFaint }} />
                              }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: t.text, fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
                              <p style={{ color: t.textFaint, fontSize: "10px", fontFamily: "monospace" }}>{(p as any).sku}</p>
                            </div>
                            {alreadyAdded
                              ? <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 700, flexShrink: 0 }}>Added</span>
                              : <Icon name="plus" size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
                            }
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Selected items list — shown when not searching */}
                {!productSearch && (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {items.length === 0 ? (
                      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", opacity: 0.4 }}>
                        <Icon name="product" size={36} style={{ color: t.textFaint }} />
                        <p style={{ color: t.textFaint, fontSize: "13px" }}>Search and add products above</p>
                      </div>
                    ) : (
                      <div style={{ animation: "slideUp 0.2s ease both" }}>
                        {/* Column headers */}
                        <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 90px 110px 28px", gap: "8px", padding: "8px 20px", borderBottom: `1px solid ${t.borderMid}`, position: "sticky", top: 0, background: t.surface, zIndex: 1 }}>
                          {["", "Product", "Qty", `Cost (${sym})`, ""].map((h, i) => (
                            <span key={i} style={{ color: t.textFaint, fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{h}</span>
                          ))}
                        </div>
                        {items.map((item, idx) => (
                          <div key={item.productId} style={{ display: "grid", gridTemplateColumns: "36px 1fr 90px 110px 28px", gap: "8px", padding: "10px 20px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, animation: "rowSlideIn 0.22s cubic-bezier(0.22,1,0.36,1) both" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "7px", overflow: "hidden", background: "#fff", border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {item.imageUrl
                                ? <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                : <Icon name="product" size={14} style={{ color: t.textFaint }} />
                              }
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ color: t.text, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productName}</p>
                              <p style={{ color: t.textFaint, fontSize: "10px", fontFamily: "monospace" }}>{item.productSku}</p>
                            </div>
                            <input type="number" min={1} value={item.qtyOrdered} onChange={(e) => updateItem(idx, "qtyOrdered", Number(e.target.value))} style={{ ...inputStyle, padding: "5px 8px", fontSize: "12px", textAlign: "center" }} />
                            <input type="number" min={0} step={0.01} value={item.unitCost} onChange={(e) => updateItem(idx, "unitCost", Number(e.target.value))} style={{ ...inputStyle, padding: "5px 8px", fontSize: "12px" }} />
                            <button onClick={() => removeItem(idx)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Items count + subtotal bar */}
                {items.length > 0 && (
                  <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: t.inputBg }}>
                    <span style={{ color: t.textMuted, fontSize: "12px" }}>{items.length} product{items.length !== 1 ? "s" : ""} selected</span>
                    <span style={{ color: t.text, fontSize: "14px", fontWeight: 700 }}>{sym}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* ── RIGHT: Order form ── */}
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>

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
                    <SingleDatePicker
                      value={expectedAt}
                      onChange={setExpectedAt}
                      t={t}
                      isDark={isDark}
                      placeholder="Select expected date"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Notes</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" rows={3} style={{ ...inputStyle, resize: "none" as const, lineHeight: "1.5" }} />
                  </div>

                  {/* Payment */}
                  <div style={{ background: t.inputBg, borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Payment</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: t.textMuted, fontSize: "12px" }}>Order Total</span>
                      <span style={{ color: t.text, fontSize: "14px", fontWeight: 700 }}>{sym}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                      <label style={{ color: t.textMuted, fontSize: "12px", flexShrink: 0 }}>Paid Now</label>
                      <input
                        type="number" min="0" max={totalValue} step="0.01"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="0.00"
                        style={{ ...inputStyle, width: "130px", padding: "6px 10px", fontSize: "13px", textAlign: "right" }}
                      />
                    </div>
                    {parseFloat(paidAmount) >= 0 && parseFloat(paidAmount) < totalValue && totalValue > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "rgba(239,68,68,0.08)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600 }}>Supplier Debt</span>
                        <span style={{ color: "#ef4444", fontSize: "13px", fontWeight: 700 }}>{sym}{(totalValue - (parseFloat(paidAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ padding: "16px 20px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "10px", flexShrink: 0 }}>
                  <button onClick={closeCreate} disabled={createMut.isPending} style={{ flex: 1, padding: "11px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
                  <button onClick={handleCreate} disabled={createMut.isPending || !canCreate} style={{ flex: 2, padding: "11px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: !canCreate ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: createMut.isPending || !canCreate ? 0.7 : 1 }}>
                    {createMut.isPending ? "Creating…" : "Create Draft PO"}
                  </button>
                </div>
              </div>
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
