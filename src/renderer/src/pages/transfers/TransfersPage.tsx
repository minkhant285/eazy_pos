import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

type StatusFilter = "all" | "draft" | "in_transit" | "received" | "cancelled";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
	draft:       { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", label: "Draft" },
	in_transit:  { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b", label: "In Transit" },
	received:    { bg: "rgba(16,185,129,0.12)",   color: "#10b981", label: "Received" },
	cancelled:   { bg: "rgba(239,68,68,0.12)",    color: "#ef4444", label: "Cancelled" },
};

const PAGE_SIZE = 20;

// ── Create Transfer Modal ─────────────────────────────────────────────────────

interface TransferItem { productId: string; productName: string; productSku: string; qtySent: number; }

const CreateTransferModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	const [fromLocationId, setFromLocationId] = useState("");
	const [toLocationId, setToLocationId] = useState("");
	const [notes, setNotes] = useState("");
	const [items, setItems] = useState<TransferItem[]>([]);
	const [selectedProductId, setSelectedProductId] = useState("");
	const [productSearch, setProductSearch] = useState("");
	const [qty, setQty] = useState("1");

	const { data: locationsData } = trpc.location.list.useQuery({ isActive: true, pageSize: 100 });
	const locations = locationsData?.data ?? [];

	const { data: productsData } = trpc.product.list.useQuery(
		{ search: productSearch || undefined, pageSize: 50, isActive: true },
	);
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
		setSelectedProductId("");
		setQty("1");
	};

	const removeItem = (productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId));

	const handleSubmit = () => {
		if (!fromLocationId || !toLocationId || fromLocationId === toLocationId || items.length === 0) return;
		create.mutate({
			fromLocationId,
			toLocationId,
			notes: notes.trim() || undefined,
			items: items.map((i) => ({ productId: i.productId, qtySent: i.qtySent })),
		} as any); // createdBy optional — add when auth is implemented
	};

	const canSubmit = !!fromLocationId && !!toLocationId && fromLocationId !== toLocationId && items.length > 0;
	const labelStyle = { color: t.textMuted, fontSize: "10.5px", fontWeight: 700, display: "block", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
	const selectStyle = (hasValue: boolean) => ({ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px", color: hasValue ? t.text : t.textFaint, fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const });

	return (
		<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
			<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
			<div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "560px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.22s ease", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
				{/* Header */}
				<div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
					<div>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>New Stock Transfer</h2>
						<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>Transfer stock between locations</p>
					</div>
					<button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} /></button>
				</div>

				{/* Body */}
				<div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
					{/* From → To */}
					<div style={{ display: "grid", gridTemplateColumns: "1fr 28px 1fr", gap: "8px", alignItems: "end" }}>
						<div>
							<label style={labelStyle}>From Location</label>
							<select value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)} style={selectStyle(!!fromLocationId)}>
								<option value="">Select location</option>
								{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
							</select>
						</div>
						<div style={{ paddingBottom: "10px", color: t.textFaint, textAlign: "center", fontSize: "16px" }}>→</div>
						<div>
							<label style={labelStyle}>To Location</label>
							<select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} style={selectStyle(!!toLocationId)}>
								<option value="">Select location</option>
								{locations.filter((l) => l.id !== fromLocationId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
							</select>
						</div>
					</div>

					{/* Notes */}
					<div>
						<label style={labelStyle}>Notes</label>
						<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
					</div>

					{/* Add item row */}
					<div>
						<label style={labelStyle}>Items</label>
						<div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
							<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
								<input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search product..." style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "9px", padding: "7px 10px", color: t.text, fontSize: "12px", outline: "none", fontFamily: "inherit" }} />
								<select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} style={selectStyle(!!selectedProductId)}>
									<option value="">Select product</option>
									{products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>)}
								</select>
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
								<div style={{ height: "29px" }} />
								<input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="1" placeholder="Qty" style={{ width: "70px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 10px", color: t.text, fontSize: "13px", outline: "none", fontFamily: "inherit", textAlign: "center" }} />
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
								<div style={{ height: "29px" }} />
								<button onClick={addItem} disabled={!selectedProductId || Number(qty) <= 0} style={{ width: "38px", height: "38px", borderRadius: "11px", border: "none", background: selectedProductId && Number(qty) > 0 ? "#7c3aed" : t.inputBg, color: selectedProductId && Number(qty) > 0 ? "#fff" : t.textFaint, cursor: selectedProductId ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
									<Icon name="plus" size={14} />
								</button>
							</div>
						</div>

						{/* Items list */}
						{items.length > 0 ? (
							<div style={{ background: t.inputBg, borderRadius: "12px", overflow: "hidden", border: `1px solid ${t.border}` }}>
								{items.map((item, idx) => (
									<div key={item.productId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderBottom: idx < items.length - 1 ? `1px solid ${t.borderMid}` : "none" }}>
										<div style={{ flex: 1, minWidth: 0 }}>
											<p style={{ color: t.text, fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productName}</p>
											<p style={{ color: t.textFaint, fontSize: "11px" }}>{item.productSku}</p>
										</div>
										<span style={{ color: "#a78bfa", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>× {item.qtySent}</span>
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

				{/* Footer */}
				<div style={{ padding: "16px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "10px" }}>
					<button onClick={onClose} disabled={create.isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
					<button onClick={handleSubmit} disabled={create.isPending || !canSubmit} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: !canSubmit ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(124,58,237,0.35)", opacity: create.isPending || !canSubmit ? 0.7 : 1 }}>
						{create.isPending ? "..." : "Create Transfer"}
					</button>
				</div>
			</div>
		</div>
	);
};

// ── Transfers Page ────────────────────────────────────────────────────────────

export const TransfersPage: React.FC = () => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [page, setPage] = useState(1);
	const [createOpen, setCreateOpen] = useState(false);

	const { data: locationsData } = trpc.location.list.useQuery({ pageSize: 100 });
	const locations = locationsData?.data ?? [];
	const locationName = (id: string) => locations.find((l) => l.id === id)?.name ?? id.slice(0, 8) + "…";

	const { data, isLoading, refetch } = trpc.stockTransfer.list.useQuery({
		status: statusFilter === "all" ? undefined : statusFilter as Exclude<StatusFilter, "all">,
		page,
		pageSize: PAGE_SIZE,
	});

	const transfers = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(data?.totalPages ?? 1, 1);

	const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
		const start = Math.max(1, Math.min(page - 2, totalPages - 4));
		return start + i;
	}).filter((p) => p >= 1 && p <= totalPages);

	const statusOptions: { key: StatusFilter; label: string }[] = [
		{ key: "all", label: tr.all },
		{ key: "draft", label: "Draft" },
		{ key: "in_transit", label: "In Transit" },
		{ key: "received", label: "Received" },
		{ key: "cancelled", label: "Cancelled" },
	];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
				<div>
					<h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>{tr.transfers}</h1>
					<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{total} stock transfers</p>
				</div>
				<button onClick={() => setCreateOpen(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(124,58,237,0.3)", fontFamily: "inherit", whiteSpace: "nowrap" }}>
					<Icon name="plus" size={13} /> New Transfer
				</button>
			</div>

			{/* Status filter */}
			<div style={{ display: "flex", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "3px", gap: "2px", width: "fit-content" }}>
				{statusOptions.map((s) => (
					<button key={s.key} onClick={() => { setStatusFilter(s.key); setPage(1); }} style={{ padding: "6px 11px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: statusFilter === s.key ? t.surface : "transparent", color: statusFilter === s.key ? t.text : t.textMuted, boxShadow: statusFilter === s.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>{s.label}</button>
				))}
			</div>

			{/* Table */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
				<div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr auto 100px", gap: "10px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
					{["Transfer No", "From", "To", tr.status, "Date"].map((h, i) => (
						<span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
					))}
				</div>

				{isLoading ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
				) : transfers.length === 0 ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>No transfers found</div>
				) : transfers.map((row) => {
					const sc = STATUS_STYLE[row.status] ?? STATUS_STYLE.draft;
					return (
						<div key={row.id}
							style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr auto 100px", gap: "10px", padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s" }}
							onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
							onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
						>
							<span style={{ color: "#a78bfa", fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}>{row.transferNo}</span>
							<div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
								<Icon name="location" size={11} style={{ color: t.textFaint, flexShrink: 0 }} />
								<span style={{ color: t.textSubtle, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{locationName(row.fromLocationId)}</span>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
								<Icon name="location" size={11} style={{ color: t.textFaint, flexShrink: 0 }} />
								<span style={{ color: t.textSubtle, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{locationName(row.toLocationId)}</span>
							</div>
							<span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", whiteSpace: "nowrap", background: sc.bg, color: sc.color }}>{sc.label}</span>
							<span style={{ color: t.textFaint, fontSize: "11px" }}>{String(row.createdAt).slice(0, 10)}</span>
						</div>
					);
				})}

				{/* Pagination */}
				<div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {transfers.length} {tr.of} {total}</span>
					{totalPages > 1 && (
						<div style={{ display: "flex", gap: "3px" }}>
							{pageButtons.map((p) => (
								<button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "#7c3aed" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
							))}
						</div>
					)}
				</div>
			</div>

			{createOpen && <CreateTransferModal onClose={() => setCreateOpen(false)} onSuccess={() => { setCreateOpen(false); refetch(); }} />}
		</div>
	);
};
