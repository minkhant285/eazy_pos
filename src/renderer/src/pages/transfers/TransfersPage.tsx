import React, { useState } from "react";
import { AppSelect } from '../../components/ui/AppSelect';
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

type TransferStatus = "draft" | "in_transit" | "partial" | "received" | "cancelled";
type StatusFilter   = "all" | TransferStatus;

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
	draft:      { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", label: "Draft"      },
	in_transit: { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b", label: "In Transit" },
	partial:    { bg: "rgba(59,130,246,0.12)",  color: "#3b82f6", label: "Partial"    },
	received:   { bg: "rgba(16,185,129,0.12)",  color: "#10b981", label: "Received"   },
	cancelled:  { bg: "rgba(239,68,68,0.12)",   color: "#ef4444", label: "Cancelled"  },
};

const PAGE_SIZE = 20;

// ── Shared user select hook ───────────────────────────────────
const useUsers = () => {
	const { data } = trpc.user.list.useQuery({ pageSize: 100 });
	return data?.data ?? [];
};

// ── Receive Modal ─────────────────────────────────────────────

const ReceiveModal: React.FC<{ transferId: string; onClose: () => void; onSuccess: () => void }> = ({
	transferId, onClose, onSuccess,
}) => {
	const t    = useAppStore((s) => s.theme);
	const users = useUsers();

	const { data: transfer, isLoading } = trpc.stockTransfer.getById.useQuery({ id: transferId });
	const receiveMut = trpc.stockTransfer.receive.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

	const [receivedBy, setReceivedBy] = useState("");
	const [qtyMap, setQtyMap]         = useState<Record<string, string>>({});

	React.useEffect(() => {
		if (!transfer?.items) return;
		const init: Record<string, string> = {};
		for (const item of transfer.items as any[]) {
			const pending = Math.max(0, Number(item.qtySent) - Number(item.qtyReceived ?? 0));
			init[item.id] = String(pending);
		}
		setQtyMap(init);
	}, [(transfer?.items as any[])?.length]);

	const handleReceive = () => {
		if (!receivedBy) return;
		const receivedItems = (transfer?.items as any[])
			.filter((item) => parseFloat(qtyMap[item.id] ?? "0") > 0)
			.map((item) => ({ transferItemId: item.id, qtyReceived: parseFloat(qtyMap[item.id]) }));
		if (!receivedItems.length) return;
		receiveMut.mutate({ transferId, receivedItems, receivedBy });
	};

	const canSubmit = !!receivedBy && !receiveMut.isPending &&
		(transfer?.items as any[] ?? []).some((i) => parseFloat(qtyMap[i.id] ?? "0") > 0);

	const inp: React.CSSProperties = {
		background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "9px",
		padding: "7px 10px", color: t.text, fontSize: "12px", outline: "none",
		fontFamily: "inherit", width: "100%", boxSizing: "border-box",
	};

	return (
		<div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
			<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
			<div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "580px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)", animation: "slideUp 0.22s ease", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
				{/* Header */}
				<div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
					<div>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Receive Transfer</h2>
						<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>
							{transfer ? `${(transfer as any).transferNo} · To: ${(transfer as any).toLocationName ?? "destination"}` : "Loading…"}
						</p>
					</div>
					<button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<Icon name="close" size={13} />
					</button>
				</div>

				{/* Body */}
				<div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
					{isLoading ? (
						<p style={{ color: t.textFaint, fontSize: "13px", textAlign: "center", padding: "32px 0" }}>Loading…</p>
					) : (
						<>
							{/* Received By */}
							<div>
								<label style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "5px" }}>Received By *</label>
							<AppSelect
						value={receivedBy}
						onChange={setReceivedBy}
						options={[{ value: '', label: 'Select user' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
						isSearchable={false}
					/>
							</div>

							{/* Items */}
							<div style={{ background: t.inputBg, borderRadius: "12px", overflow: "hidden" }}>
								<div style={{ display: "grid", gridTemplateColumns: "1.8fr 70px 70px 70px 90px", gap: "8px", padding: "9px 14px", borderBottom: `1px solid ${t.borderMid}` }}>
									{["Product", "Sent", "Recvd", "Pend", "Receive Now"].map((h, i) => (
										<span key={i} style={{ color: t.textFaint, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
									))}
								</div>
								{(transfer?.items as any[] ?? []).map((item) => {
									const pending = Math.max(0, Number(item.qtySent) - Number(item.qtyReceived ?? 0));
									const done    = pending === 0;
									return (
										<div key={item.id} style={{ display: "grid", gridTemplateColumns: "1.8fr 70px 70px 70px 90px", gap: "8px", padding: "10px 14px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, opacity: done ? 0.5 : 1 }}>
											<div style={{ minWidth: 0 }}>
												<p style={{ color: t.text, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productName}</p>
												<p style={{ color: t.textFaint, fontSize: "10px", fontFamily: "monospace" }}>{item.productSku}</p>
											</div>
											<span style={{ color: t.textMuted, fontSize: "12px" }}>{Number(item.qtySent)}</span>
											<span style={{ color: Number(item.qtyReceived) > 0 ? "#10b981" : t.textFaint, fontSize: "12px" }}>{Number(item.qtyReceived ?? 0)}</span>
											<span style={{ color: pending > 0 ? "#f59e0b" : "#10b981", fontSize: "12px", fontWeight: 600 }}>{done ? "✓" : pending}</span>
											<input type="number" min="0" max={pending} step="1"
												value={qtyMap[item.id] ?? "0"}
												onChange={(e) => setQtyMap((prev) => ({ ...prev, [item.id]: e.target.value }))}
												disabled={done}
												style={{ ...inp, textAlign: "center", opacity: done ? 0.5 : 1 }}
											/>
										</div>
									);
								})}
							</div>

							{/* Info */}
							<div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px", padding: "10px 14px" }}>
								<p style={{ color: "#10b981", fontSize: "11px", fontWeight: 600 }}>
									Received stock will be added to the destination location. Stock was already deducted from source when the transfer was created.
								</p>
							</div>

							{receiveMut.isError && (
								<p style={{ color: "#ef4444", fontSize: "12px" }}>{(receiveMut.error as any)?.message ?? "Failed to receive transfer."}</p>
							)}
						</>
					)}
				</div>

				{/* Footer */}
				<div style={{ padding: "14px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "8px", flexShrink: 0 }}>
					<button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
					<button onClick={handleReceive} disabled={!canSubmit} style={{ flex: 2, padding: "10px", borderRadius: "11px", border: "none", background: canSubmit ? "#10b981" : t.inputBg, color: canSubmit ? "#fff" : t.textFaint, fontSize: "13px", fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s" }}>
						{receiveMut.isPending ? "Receiving…" : "Confirm Receipt"}
					</button>
				</div>
			</div>
		</div>
	);
};

// ── Detail Drawer ─────────────────────────────────────────────

const TransferDetailDrawer: React.FC<{
	transferId: string;
	onClose: () => void;
	onRefetch: () => void;
	onReceive: (id: string) => void;
}> = ({ transferId, onClose, onRefetch, onReceive }) => {
	const t     = useAppStore((s) => s.theme);
	const users = useUsers();

	const { data: transfer, isLoading, refetch: refetchDetail } = trpc.stockTransfer.getById.useQuery({ id: transferId });

	const [cancelledBy, setCancelledBy]       = useState("");
	const [confirmCancel, setConfirmCancel]   = useState(false);

	const cancelMut = trpc.stockTransfer.cancel.useMutation({
		onSuccess: () => { refetchDetail(); onRefetch(); setConfirmCancel(false); },
	});

	const status = ((transfer as any)?.status ?? "in_transit") as TransferStatus;
	const sc     = STATUS_STYLE[status];
	const items  = (transfer?.items as any[]) ?? [];

	const totalSent     = items.reduce((s, i) => s + Number(i.qtySent),       0);
	const totalReceived = items.reduce((s, i) => s + Number(i.qtyReceived ?? 0), 0);
	const pct           = totalSent > 0 ? Math.round((totalReceived / totalSent) * 100) : 0;

	const { data: locationsData } = trpc.location.list.useQuery({ pageSize: 100 });
	const locations = locationsData?.data ?? [];
	const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? "—";

	return (
		<>
			<div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.35)" }} />
			<div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 56, width: "460px", maxWidth: "100vw", background: t.surface, borderLeft: `1px solid ${t.borderStrong}`, boxShadow: "-16px 0 48px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease" }}>
				{/* Header */}
				<div style={{ padding: "18px 20px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
					<div>
						{isLoading ? <p style={{ color: t.textFaint }}>Loading…</p> : (
							<>
								<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
									<h2 style={{ color: t.text, fontWeight: 800, fontSize: "16px", letterSpacing: "-0.3px" }}>{(transfer as any)?.transferNo ?? "—"}</h2>
									<span style={{ padding: "3px 10px", borderRadius: "7px", fontSize: "10px", fontWeight: 700, background: sc.bg, color: sc.color, textTransform: "capitalize" }}>{sc.label}</span>
								</div>
								<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>
									{locName((transfer as any)?.fromLocationId)} → {locName((transfer as any)?.toLocationId)}
								</p>
							</>
						)}
					</div>
					<button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "9px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
						<Icon name="close" size={13} />
					</button>
				</div>

				{/* Body */}
				<div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "18px" }}>
					{isLoading ? (
						<p style={{ color: t.textFaint, fontSize: "13px", textAlign: "center", paddingTop: "40px" }}>Loading details…</p>
					) : (
						<>
							{/* Meta */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
								{[
									{ label: "From", value: locName((transfer as any)?.fromLocationId) },
									{ label: "To",   value: locName((transfer as any)?.toLocationId) },
									{ label: "Created By", value: (transfer as any)?.createdBy ?? "—" },
									{ label: "Created At", value: String((transfer as any)?.createdAt ?? "").slice(0, 10) },
									{ label: "Received At", value: (transfer as any)?.receivedAt ? String((transfer as any).receivedAt).slice(0, 10) : "—" },
									{ label: "Status", value: sc.label },
								].map(({ label, value }) => (
									<div key={label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
										<span style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
										<span style={{ color: t.text, fontSize: "13px", fontWeight: 500 }}>{value}</span>
									</div>
								))}
							</div>

							{/* Notes */}
							{(transfer as any)?.notes && (
								<div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 14px" }}>
									<p style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Notes</p>
									<p style={{ color: t.textMuted, fontSize: "13px" }}>{(transfer as any).notes}</p>
								</div>
							)}

							{/* Progress bar (in_transit / partial) */}
							{(status === "in_transit" || status === "partial") && (
								<div>
									<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
										<span style={{ color: t.textMuted, fontSize: "11px", fontWeight: 600 }}>Receipt Progress</span>
										<span style={{ color: t.text, fontSize: "11px", fontWeight: 700 }}>{totalReceived} / {totalSent} units ({pct}%)</span>
									</div>
									<div style={{ height: "6px", borderRadius: "4px", background: t.inputBg, overflow: "hidden" }}>
										<div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10b981" : "#f59e0b", borderRadius: "4px", transition: "width 0.3s" }} />
									</div>
								</div>
							)}

							{/* Items table */}
							<div>
								<p style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Items ({items.length})</p>
								<div style={{ background: t.inputBg, borderRadius: "12px", overflow: "hidden" }}>
									<div style={{ display: "grid", gridTemplateColumns: "1.6fr 60px 60px 60px", gap: "6px", padding: "8px 14px", borderBottom: `1px solid ${t.borderMid}` }}>
										{["Product", "Sent", "Recvd", "Pend"].map((h, i) => (
											<span key={i} style={{ color: t.textFaint, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
										))}
									</div>
									{items.length === 0 ? (
										<p style={{ color: t.textFaint, fontSize: "12px", textAlign: "center", padding: "20px" }}>No items</p>
									) : items.map((item) => {
										const pending = Math.max(0, Number(item.qtySent) - Number(item.qtyReceived ?? 0));
										return (
											<div key={item.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 60px 60px 60px", gap: "6px", padding: "10px 14px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}` }}>
												<div style={{ minWidth: 0 }}>
													<p style={{ color: t.text, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productName}</p>
													<p style={{ color: t.textFaint, fontSize: "10px", fontFamily: "monospace" }}>{item.productSku}</p>
												</div>
												<span style={{ color: t.textMuted, fontSize: "12px" }}>{Number(item.qtySent)}</span>
												<span style={{ color: Number(item.qtyReceived) > 0 ? "#10b981" : t.textFaint, fontSize: "12px", fontWeight: 600 }}>{Number(item.qtyReceived ?? 0)}</span>
												<span style={{ color: pending > 0 ? "#f59e0b" : "#10b981", fontSize: "12px", fontWeight: 600 }}>{pending === 0 ? "✓" : pending}</span>
											</div>
										);
									})}
									{/* Totals */}
									<div style={{ display: "grid", gridTemplateColumns: "1.6fr 60px 60px 60px", gap: "6px", padding: "9px 14px", borderTop: `1px solid ${t.borderMid}`, background: `${t.surface}80` }}>
										<span style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700 }}>Total</span>
										<span style={{ color: t.text, fontSize: "12px", fontWeight: 700 }}>{totalSent}</span>
										<span style={{ color: "#10b981", fontSize: "12px", fontWeight: 700 }}>{totalReceived}</span>
										<span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 700 }}>{totalSent - totalReceived}</span>
									</div>
								</div>
							</div>

							{/* Cancel section (in_transit / partial) */}
							{(status === "in_transit" || status === "partial") && confirmCancel && (
								<div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "14px" }}>
									<p style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600, marginBottom: "10px" }}>
										Cancel this transfer? Unsent stock will be returned to the source location.
									</p>
									<div style={{ marginBottom: "10px" }}>
										<label style={{ color: "#ef4444", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "5px" }}>Cancelled By *</label>
									<AppSelect
							value={cancelledBy}
							onChange={setCancelledBy}
							options={[{ value: '', label: 'Select user' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
							isSearchable={false}
						/>
									</div>
									<div style={{ display: "flex", gap: "8px" }}>
										<button onClick={() => { setConfirmCancel(false); setCancelledBy(""); }} style={{ flex: 1, padding: "8px", borderRadius: "9px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Back</button>
										<button
											onClick={() => cancelMut.mutate({ transferId, cancelledBy })}
											disabled={!cancelledBy || cancelMut.isPending}
											style={{ flex: 1, padding: "8px", borderRadius: "9px", border: "none", background: cancelledBy ? "#ef4444" : t.inputBg, color: cancelledBy ? "#fff" : t.textFaint, fontSize: "12px", fontWeight: 700, cursor: cancelledBy ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
											{cancelMut.isPending ? "Cancelling…" : "Confirm Cancel"}
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{/* Footer */}
				{!isLoading && (
					<div style={{ padding: "14px 20px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "8px", flexShrink: 0 }}>
						{(status === "in_transit" || status === "partial") && !confirmCancel && (
							<>
								<button onClick={() => onReceive(transferId)} style={{ flex: 2, padding: "10px", borderRadius: "11px", border: "none", background: "rgba(16,185,129,0.15)", color: "#10b981", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
									Receive Stock
								</button>
								<button onClick={() => setConfirmCancel(true)} style={{ padding: "10px 16px", borderRadius: "11px", border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
									Cancel
								</button>
							</>
						)}
						{(status === "received" || status === "cancelled") && (
							<div style={{ flex: 1, padding: "10px", borderRadius: "11px", background: t.inputBg, textAlign: "center" }}>
								<span style={{ color: t.textFaint, fontSize: "12px" }}>
									{status === "received" ? "This transfer has been fully received." : "This transfer was cancelled."}
								</span>
							</div>
						)}
					</div>
				)}
			</div>
		</>
	);
};

// ── Create Transfer Modal ─────────────────────────────────────

interface TransferItem { productId: string; productName: string; productSku: string; qtySent: number; }

const CreateTransferModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
	const t   = useAppStore((s) => s.theme);
	const tr  = useAppStore((s) => s.tr);
	const users = useUsers();

	const [fromLocationId, setFromLocationId] = useState("");
	const [toLocationId, setToLocationId]     = useState("");
	const [createdBy, setCreatedBy]           = useState("");
	const [notes, setNotes]                   = useState("");
	const [items, setItems]                   = useState<TransferItem[]>([]);
	const [selectedProductId, setSelectedProductId] = useState("");
	const [productSearch, setProductSearch]   = useState("");
	const [qty, setQty]                       = useState("1");

	const { data: locationsData } = trpc.location.list.useQuery({ isActive: true, pageSize: 100 });
	const locations = locationsData?.data ?? [];

	const { data: productsData } = trpc.product.list.useQuery({ search: productSearch || undefined, pageSize: 50, isActive: true });
	const products = productsData?.data ?? [];

	const create = trpc.stockTransfer.create.useMutation({ onSuccess });

	const addItem = () => {
		const product = products.find((p) => p.id === selectedProductId);
		if (!product || Number(qty) <= 0) return;
		setItems((prev) => {
			const existing = prev.find((i) => i.productId === selectedProductId);
			if (existing) return prev.map((i) => i.productId === selectedProductId ? { ...i, qtySent: i.qtySent + Number(qty) } : i);
			return [...prev, { productId: product.id, productName: product.name, productSku: product.sku, qtySent: Number(qty) }];
		});
		setSelectedProductId(""); setQty("1");
	};

	const removeItem = (productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId));

	const handleSubmit = () => {
		if (!fromLocationId || !toLocationId || fromLocationId === toLocationId || !createdBy || items.length === 0) return;
		create.mutate({ fromLocationId, toLocationId, createdBy, notes: notes.trim() || undefined, items: items.map((i) => ({ productId: i.productId, qtySent: i.qtySent })) });
	};

	const canSubmit = !!fromLocationId && !!toLocationId && fromLocationId !== toLocationId && !!createdBy && items.length > 0;
	const labelStyle = { color: t.textMuted, fontSize: "10.5px", fontWeight: 700, display: "block", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
	const selStyle   = (v: boolean) => ({ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px", color: v ? t.text : t.textFaint, fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const });

	return (
		<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
			<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
			<div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "560px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.22s ease", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
				<div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
					<div>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>New Stock Transfer</h2>
						<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>Stock is deducted from source immediately on creation</p>
					</div>
					<button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} /></button>
				</div>

				<div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
					{/* From → To */}
					<div style={{ display: "grid", gridTemplateColumns: "1fr 28px 1fr", gap: "8px", alignItems: "end" }}>
						<div>
							<label style={labelStyle}>From Location</label>
						<AppSelect
						value={fromLocationId}
						onChange={setFromLocationId}
						options={[{ value: '', label: 'Select location' }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
						isSearchable={false}
					/>
						</div>
						<div style={{ paddingBottom: "10px", color: t.textFaint, textAlign: "center", fontSize: "16px" }}>→</div>
						<div>
							<label style={labelStyle}>To Location</label>
						<AppSelect
						value={toLocationId}
						onChange={setToLocationId}
						options={[{ value: '', label: 'Select location' }, ...locations.filter((l) => l.id !== fromLocationId).map((l) => ({ value: l.id, label: l.name }))]}
						isSearchable={false}
					/>
						</div>
					</div>

					{/* Created By + Notes */}
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
						<div>
							<label style={labelStyle}>Created By *</label>
						<AppSelect
						value={createdBy}
						onChange={setCreatedBy}
						options={[{ value: '', label: 'Select user' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
						isSearchable={false}
					/>
						</div>
						<div>
							<label style={labelStyle}>Notes</label>
							<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional..." style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
						</div>
					</div>

					{/* Add item */}
					<div>
						<label style={labelStyle}>Items</label>
						<div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
							<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
								<input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search product..." style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "9px", padding: "7px 10px", color: t.text, fontSize: "12px", outline: "none", fontFamily: "inherit" }} />
							<AppSelect
							value={selectedProductId}
							onChange={setSelectedProductId}
							options={[{ value: '', label: 'Select product' }, ...products.map((p) => ({ value: p.id, label: `${p.name} — ${p.sku}` }))]}
							isSearchable={true}
						/>
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
								<div style={{ height: "29px" }} />
								<input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="1" placeholder="Qty" style={{ width: "70px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 10px", color: t.text, fontSize: "13px", outline: "none", fontFamily: "inherit", textAlign: "center" }} />
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
								<div style={{ height: "29px" }} />
								<button onClick={addItem} disabled={!selectedProductId || Number(qty) <= 0} style={{ width: "38px", height: "38px", borderRadius: "11px", border: "none", background: selectedProductId && Number(qty) > 0 ? "var(--primary)" : t.inputBg, color: selectedProductId && Number(qty) > 0 ? "#fff" : t.textFaint, cursor: selectedProductId ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
									<Icon name="plus" size={14} />
								</button>
							</div>
						</div>

						{items.length > 0 ? (
							<div style={{ background: t.inputBg, borderRadius: "12px", overflow: "hidden", border: `1px solid ${t.border}` }}>
								{items.map((item, idx) => (
									<div key={item.productId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderBottom: idx < items.length - 1 ? `1px solid ${t.borderMid}` : "none" }}>
										<div style={{ flex: 1, minWidth: 0 }}>
											<p style={{ color: t.text, fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productName}</p>
											<p style={{ color: t.textFaint, fontSize: "11px" }}>{item.productSku}</p>
										</div>
										<span style={{ color: "var(--primary-light)", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>× {item.qtySent}</span>
										<button onClick={() => removeItem(item.productId)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={11} /></button>
									</div>
								))}
							</div>
						) : (
							<div style={{ padding: "20px", textAlign: "center", color: t.textFaint, fontSize: "12px", background: t.inputBg, borderRadius: "12px", border: `1px dashed ${t.borderMid}` }}>
								No items added yet. Search and select a product above.
							</div>
						)}
					</div>
				</div>

				<div style={{ padding: "16px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "10px" }}>
					<button onClick={onClose} disabled={create.isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
					<button onClick={handleSubmit} disabled={create.isPending || !canSubmit} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: !canSubmit ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px var(--primary-35)", opacity: create.isPending || !canSubmit ? 0.7 : 1 }}>
						{create.isPending ? "Creating…" : "Create Transfer"}
					</button>
				</div>
			</div>
		</div>
	);
};

// ── Transfers Page ────────────────────────────────────────────

export const TransfersPage: React.FC = () => {
	const t  = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [page, setPage]                 = useState(1);
	const [createOpen, setCreateOpen]     = useState(false);
	const [detailId, setDetailId]         = useState<string | null>(null);
	const [receiveId, setReceiveId]       = useState<string | null>(null);

	const { data: locationsData } = trpc.location.list.useQuery({ pageSize: 100 });
	const locations = locationsData?.data ?? [];
	const locName   = (id: string) => locations.find((l) => l.id === id)?.name ?? id.slice(0, 8) + "…";

	const { data, isLoading, refetch } = trpc.stockTransfer.list.useQuery({
		status: statusFilter === "all" ? undefined : statusFilter as Exclude<StatusFilter, "all">,
		page,
		pageSize: PAGE_SIZE,
	});

	const transfers  = data?.data ?? [];
	const total      = data?.total ?? 0;
	const totalPages = Math.max(data?.totalPages ?? 1, 1);

	const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
		const start = Math.max(1, Math.min(page - 2, totalPages - 4));
		return start + i;
	}).filter((p) => p >= 1 && p <= totalPages);

	const statusOptions: { key: StatusFilter; label: string }[] = [
		{ key: "all",        label: tr.all        },
		{ key: "in_transit", label: "In Transit"  },
		{ key: "partial",    label: "Partial"     },
		{ key: "received",   label: "Received"    },
		{ key: "cancelled",  label: "Cancelled"   },
	];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
			{/* Toolbar */}
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<div style={{ display: "flex", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "3px", gap: "2px" }}>
					{statusOptions.map((s) => (
						<button key={s.key} onClick={() => { setStatusFilter(s.key); setPage(1); }}
							style={{ padding: "6px 11px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: statusFilter === s.key ? t.surface : "transparent", color: statusFilter === s.key ? t.text : t.textMuted, boxShadow: statusFilter === s.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}
						>{s.label}</button>
					))}
				</div>
				<div style={{ marginLeft: "auto" }}>
					<button onClick={() => setCreateOpen(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
						<Icon name="plus" size={13} /> New Transfer
					</button>
				</div>
			</div>

			{/* Table */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
				<div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 100px 90px", gap: "10px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
					{["Transfer No", "From", "To", tr.status, "Date", ""].map((h, i) => (
						<span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
					))}
				</div>

				{isLoading ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
				) : transfers.length === 0 ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>No transfers found</div>
				) : transfers.map((row) => {
					const sc         = STATUS_STYLE[row.status] ?? STATUS_STYLE.in_transit;
					const isSelected = detailId === row.id;
					return (
						<div key={row.id}
							onClick={() => setDetailId(row.id)}
							style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 100px 90px", gap: "10px", padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, cursor: "pointer", transition: "background 0.15s", background: isSelected ? sc.bg : "transparent", borderLeft: isSelected ? `3px solid ${sc.color}` : "3px solid transparent" }}
							onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = t.surfaceHover; }}
							onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
						>
							<span style={{ color: "var(--primary-light)", fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}>{row.transferNo}</span>
							<div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
								<Icon name="location" size={11} style={{ color: t.textFaint, flexShrink: 0 }} />
								<span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{locName(row.fromLocationId)}</span>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
								<Icon name="location" size={11} style={{ color: t.textFaint, flexShrink: 0 }} />
								<span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{locName(row.toLocationId)}</span>
							</div>
							<span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", whiteSpace: "nowrap", background: sc.bg, color: sc.color, width: "fit-content" }}>{sc.label}</span>
							<span style={{ color: t.textFaint, fontSize: "11px" }}>{String(row.createdAt).slice(0, 10)}</span>

							{/* Actions */}
							<div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
								{(row.status === "in_transit" || row.status === "partial") && (
									<button
										onClick={() => setReceiveId(row.id)}
										title="Receive stock"
										style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "rgba(16,185,129,0.15)", color: "#10b981", cursor: "pointer", fontSize: "10px", fontWeight: 700, fontFamily: "inherit" }}
									>
										RECEIVE
									</button>
								)}
							</div>
						</div>
					);
				})}

				<div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {transfers.length} {tr.of} {total}</span>
					{totalPages > 1 && (
						<div style={{ display: "flex", gap: "3px" }}>
							{pageButtons.map((p) => (
								<button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "var(--primary)" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Modals / Drawers */}
			{createOpen && <CreateTransferModal onClose={() => setCreateOpen(false)} onSuccess={() => { setCreateOpen(false); refetch(); }} />}

			{detailId && (
				<TransferDetailDrawer
					transferId={detailId}
					onClose={() => setDetailId(null)}
					onRefetch={refetch}
					onReceive={(id) => setReceiveId(id)}
				/>
			)}

			{receiveId && (
				<ReceiveModal
					transferId={receiveId}
					onClose={() => setReceiveId(null)}
					onSuccess={() => { refetch(); setReceiveId(null); if (detailId) setDetailId(detailId); }}
				/>
			)}
		</div>
	);
};
