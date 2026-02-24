import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";
import type { IconKey } from "../../constants/icons";

const PAGE_SIZE = 50;

export const StockPage: React.FC = () => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	const [locationId, setLocationId] = useState("");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	const { data: locationsData } = trpc.location.list.useQuery({ isActive: true, pageSize: 100 });
	const locations = locationsData?.data ?? [];

	// Auto-select first location when list loads
	useEffect(() => {
		if (!locationId && locations.length > 0) setLocationId(locations[0].id);
	}, [locations, locationId]);

	const { data: inventoryData, isLoading } = trpc.stock.locationInventory.useQuery(
		{ locationId, page, pageSize: PAGE_SIZE, search: search || undefined },
		{ enabled: !!locationId }
	);
	const { data: valueData } = trpc.stock.inventoryValue.useQuery({ locationId }, { enabled: !!locationId });
	const { data: lowStockList } = trpc.stock.lowStock.useQuery({ locationId }, { enabled: !!locationId });

	const inventory = inventoryData?.data ?? [];
	const total = inventoryData?.total ?? 0;
	const totalPages = Math.max(inventoryData?.totalPages ?? 1, 1);
	const lowStockCount = lowStockList?.length ?? 0;

	const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
		const start = Math.max(1, Math.min(page - 2, totalPages - 4));
		return start + i;
	}).filter((p) => p >= 1 && p <= totalPages);

	const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };

	const summaryCards: { label: string; value: string; color: string; icon: IconKey }[] = [
		{ label: "Total Value", value: `฿${Number(valueData?.totalValue ?? 0).toLocaleString()}`, color: "#7c3aed", icon: "product" },
		{ label: "Total SKUs", value: String(valueData?.totalItems ?? 0), color: "#3b82f6", icon: "stock" },
		{ label: "Low Stock Alerts", value: String(lowStockCount), color: lowStockCount > 0 ? "#ef4444" : "#10b981", icon: "bell" },
	];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
				<div>
					<h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>{tr.stock}</h1>
					<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>Inventory levels by location</p>
				</div>
				{locations.length > 0 ? (
					<select
						value={locationId}
						onChange={(e) => { setLocationId(e.target.value); setPage(1); setSearch(""); }}
						style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 14px", color: t.text, fontSize: "13px", outline: "none", fontFamily: "inherit", minWidth: "180px" }}
					>
						{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
					</select>
				) : (
					<span style={{ color: t.textFaint, fontSize: "13px" }}>No locations configured</span>
				)}
			</div>

			{/* Summary cards */}
			{locationId && (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
					{summaryCards.map((card) => (
						<div key={card.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
							<div style={{ width: "38px", height: "38px", borderRadius: "10px", background: `${card.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
								<Icon name={card.icon} size={17} style={{ color: card.color }} />
							</div>
							<div>
								<p style={{ color: t.textFaint, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{card.label}</p>
								<p style={{ color: t.text, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", marginTop: "2px" }}>{card.value}</p>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Search */}
			{locationId && (
				<div style={{ position: "relative", maxWidth: "280px" }}>
					<div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}><Icon name="search" size={13} /></div>
					<input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search products..." style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px 9px 33px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
				</div>
			)}

			{/* Table or empty state */}
			{!locationId ? (
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "56px", textAlign: "center" }}>
					<Icon name="stock" size={32} style={{ color: t.textFaint, display: "block", margin: "0 auto 12px" }} />
					<p style={{ color: t.textFaint, fontSize: "13px" }}>Select a location to view inventory</p>
				</div>
			) : (
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
					<div style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 55px 80px 80px 90px 80px 80px", gap: "8px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
						{["SKU", "Product", "Unit", "On Hand", "Reserved", "Available", "Reorder", "Value"].map((h, i) => (
							<span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
						))}
					</div>

					{isLoading ? (
						<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
					) : inventory.length === 0 ? (
						<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>No inventory found for this location</div>
					) : inventory.map((item) => (
						<div key={(item as any).productId}
							style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 55px 80px 80px 90px 80px 80px", gap: "8px", padding: "12px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s" }}
							onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
							onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
						>
							<span style={{ color: t.textFaint, fontSize: "11px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(item as any).sku}</span>
							<div style={{ minWidth: 0 }}>
								<p style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(item as any).name}</p>
								{(item as any).isLowStock && <span style={{ fontSize: "9px", fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: "4px" }}>LOW</span>}
							</div>
							<span style={{ color: t.textMuted, fontSize: "12px" }}>{(item as any).unitOfMeasure}</span>
							<span style={{ color: t.text, fontSize: "13px", fontWeight: 500 }}>{Number((item as any).qtyOnHand).toLocaleString()}</span>
							<span style={{ color: t.textMuted, fontSize: "12px" }}>{Number((item as any).qtyReserved).toLocaleString()}</span>
							<span style={{ color: Number((item as any).qtyAvailable) <= 0 ? "#ef4444" : t.text, fontSize: "13px", fontWeight: 600 }}>{Number((item as any).qtyAvailable).toLocaleString()}</span>
							<span style={{ color: t.textFaint, fontSize: "12px" }}>{Number((item as any).reorderPoint).toLocaleString()}</span>
							<span style={{ color: t.textMuted, fontSize: "12px" }}>฿{Number((item as any).stockValue).toLocaleString()}</span>
						</div>
					))}

					{/* Pagination */}
					<div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {inventory.length} {tr.of} {total}</span>
						{totalPages > 1 && (
							<div style={{ display: "flex", gap: "3px" }}>
								{pageButtons.map((p) => (
									<button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "#7c3aed" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
