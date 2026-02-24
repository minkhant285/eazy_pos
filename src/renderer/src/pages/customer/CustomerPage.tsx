import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { CustomerModal } from "./CustomerModal";
import { trpc } from "../../trpc-client/trpc";
import type { Customer } from "../../types";

type FilterKey = "all" | "active" | "inactive";
interface ModalState { open: boolean; customer: Customer | null; }

const PAGE_SIZE = 20;

export const CustomersPage: React.FC = () => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<FilterKey>("all");
	const [modal, setModal] = useState<ModalState>({ open: false, customer: null });
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [page, setPage] = useState(1);

	const isActiveFilter = filter === "all" ? undefined : filter === "active";

	const { data, isLoading, refetch } = trpc.customer.list.useQuery({
		page,
		pageSize: PAGE_SIZE,
		search: search || undefined,
		isActive: isActiveFilter,
	});

	const customers = (data?.data ?? []) as Customer[];
	const total = data?.total ?? 0;
	const totalPages = Math.max(data?.totalPages ?? 1, 1);

	const deactivate = trpc.customer.deactivate.useMutation({
		onSuccess: () => { setDeleteId(null); refetch(); },
	});

	const filterOptions: { key: FilterKey; label: string }[] = [
		{ key: "all", label: tr.all },
		{ key: "active", label: tr.active },
		{ key: "inactive", label: tr.inactive },
	];

	const handleSearchChange = (value: string) => { setSearch(value); setPage(1); };
	const handleFilterChange = (key: FilterKey) => { setFilter(key); setPage(1); };
	const handleModalSuccess = () => { setModal({ open: false, customer: null }); refetch(); };

	// Page buttons: up to 5, centred around current page
	const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
		const start = Math.max(1, Math.min(page - 2, totalPages - 4));
		return start + i;
	}).filter((p) => p >= 1 && p <= totalPages);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px" }}>
				<div>
					<h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>{tr.customers}</h1>
					<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{total} {tr.total_customers_label}</p>
				</div>
				<button
					onClick={() => setModal({ open: true, customer: null })}
					style={{
						display: "flex", alignItems: "center", gap: "6px",
						padding: "9px 16px", borderRadius: "12px", border: "none",
						background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700,
						cursor: "pointer", boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
						fontFamily: "inherit", whiteSpace: "nowrap",
					}}
				>
					<Icon name="plus" size={13} />
					{tr.new_customer}
				</button>
			</div>

			{/* Filter bar */}
			<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
				<div style={{ position: "relative", flex: 1, minWidth: "180px", maxWidth: "280px" }}>
					<div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}>
						<Icon name="search" size={13} />
					</div>
					<input
						value={search}
						onChange={(e) => handleSearchChange(e.target.value)}
						placeholder={tr.search_placeholder}
						style={{
							width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`,
							borderRadius: "11px", padding: "9px 12px 9px 33px",
							color: t.text, fontSize: "13px", outline: "none",
							boxSizing: "border-box", fontFamily: "inherit",
						}}
					/>
				</div>

				<div style={{ display: "flex", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "3px", gap: "2px" }}>
					{filterOptions.map((f) => (
						<button
							key={f.key}
							onClick={() => handleFilterChange(f.key)}
							style={{
								padding: "6px 11px", borderRadius: "8px", fontSize: "12px",
								fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit",
								background: filter === f.key ? t.surface : "transparent",
								color: filter === f.key ? t.text : t.textMuted,
								boxShadow: filter === f.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
								transition: "all 0.15s",
							}}
						>{f.label}</button>
					))}
				</div>

				<button style={{
					display: "flex", alignItems: "center", gap: "5px",
					padding: "9px 12px", borderRadius: "11px",
					border: `1px solid ${t.inputBorder}`, background: t.inputBg,
					color: t.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
				}}>
					<Icon name="download" size={13} />{tr.export}
				</button>
			</div>

			{/* Table */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
				{/* Header row */}
				<div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1fr auto auto 64px", gap: "10px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
					{[tr.customer_col, tr.contact, tr.loyalty_points, tr.balance, tr.status, ""].map((h, i) => (
						<span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
					))}
				</div>

				{isLoading ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>
						Loading...
					</div>
				) : customers.length === 0 ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>{tr.no_customers}</div>
				) : customers.map((c) => (
					<div
						key={c.id}
						style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1fr auto auto 64px", gap: "10px", padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s" }}
						onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
						onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
					>
						{/* Avatar + name */}
						<div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
							<div style={{ width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: 700 }}>
								{c.name.charAt(0)}
							</div>
							<div style={{ minWidth: 0 }}>
								<p style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</p>
								<p style={{ color: t.textFaint, fontSize: "10.5px", marginTop: "1px" }}>{String(c.createdAt).slice(0, 10)}</p>
							</div>
						</div>

						{/* Contact */}
						<div style={{ minWidth: 0 }}>
							<p style={{ color: t.textSubtle, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email ?? "—"}</p>
							<p style={{ color: t.textMuted, fontSize: "11px", marginTop: "1px" }}>{c.phone ?? "—"}</p>
						</div>

						{/* Loyalty */}
						<div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
							<span style={{ color: "#f59e0b", fontWeight: 700, fontSize: "13px" }}>{Number(c.loyaltyPoints).toLocaleString()}</span>
							<span style={{ color: t.textFaint, fontSize: "11px" }}>{tr.pts}</span>
						</div>

						{/* Balance */}
						<span style={{ fontSize: "13px", fontWeight: 500, color: Number(c.outstandingBalance) > 0 ? "#ef4444" : t.textFaint }}>
							{Number(c.outstandingBalance) > 0 ? `฿ ${Number(c.outstandingBalance).toLocaleString()}` : "—"}
						</span>

						{/* Status */}
						<span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", whiteSpace: "nowrap", background: c.isActive ? "rgba(16,185,129,0.12)" : t.inputBg, color: c.isActive ? "#10b981" : t.textFaint }}>
							{c.isActive ? tr.active : tr.inactive}
						</span>

						{/* Actions */}
						<div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }}>
							<button onClick={() => setModal({ open: true, customer: c })} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
								<Icon name="edit" size={11} />
							</button>
							<button onClick={() => setDeleteId(c.id)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
								<Icon name="trash" size={11} />
							</button>
						</div>
					</div>
				))}

				{/* Pagination */}
				<div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {customers.length} {tr.of} {total}</span>
					{totalPages > 1 && (
						<div style={{ display: "flex", gap: "3px" }}>
							{pageButtons.map((p) => (
								<button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "#7c3aed" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>
									{p}
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Delete confirm */}
			{deleteId && (
				<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
					<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={() => setDeleteId(null)} />
					<div style={{ position: "relative", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "18px", padding: "22px", maxWidth: "340px", width: "calc(100% - 32px)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.2s ease" }}>
						<h3 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>{tr.delete_customer}</h3>
						<p style={{ color: t.textMuted, fontSize: "13px", marginTop: "8px", lineHeight: 1.5 }}>{tr.delete_warning}</p>
						<div style={{ display: "flex", gap: "9px", marginTop: "18px" }}>
							<button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
							<button
								onClick={() => deactivate.mutate({ id: deleteId })}
								disabled={deactivate.isPending}
								style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: deactivate.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: deactivate.isPending ? 0.7 : 1 }}
							>
								{deactivate.isPending ? "..." : tr.delete}
							</button>
						</div>
					</div>
				</div>
			)}

			{modal.open && (
				<CustomerModal
					customer={modal.customer}
					onClose={() => setModal({ open: false, customer: null })}
					onSuccess={handleModalSuccess}
				/>
			)}
		</div>
	);
};
