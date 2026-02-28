import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getGroupedRowModel,
	getExpandedRowModel,
	flexRender,
	type ColumnDef,
	type ExpandedState,
	type GroupingState,
	type SortingState,
} from "@tanstack/react-table";
import { AppSelect } from '../../components/ui/AppSelect';
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";
import { ProductModal, type ProductForEdit } from "./ProductModal";
import type { IconKey } from "../../constants/icons";

// ── Variant Stock Modal ───────────────────────────────────────

interface VariantStockModalProps {
	productId: string;
	productName: string;
	locationId: string;
	onClose: () => void;
	onSuccess: () => void;
}

type VariantRow = {
	id: string;
	optionLabel: string;
	groupKey: string;
	subLabel: string;
	sku: string;
	qtyOnHand: number;
	hasStockRecord: boolean;
};

const VARIANT_COLS = "1fr 160px 90px 170px";

const VariantStockModal: React.FC<VariantStockModalProps> = ({ productId, productName, locationId, onClose, onSuccess }) => {
	const t = useAppStore((s) => s.theme);
	const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
	const [expanded, setExpanded] = useState<ExpandedState>(true);

	const { data: variants, isLoading, refetch } = trpc.variant.listWithStock.useQuery(
		{ productId, locationId },
		{ enabled: !!productId && !!locationId }
	);

	const setStock = trpc.variant.setStock.useMutation({
		onSuccess: () => { refetch(); onSuccess(); },
	});

	// Parse optionLabel "Color: Red / Size: XL" → groupKey + subLabel
	const tableData = useMemo<VariantRow[]>(() => {
		return (variants ?? []).map((v: any) => {
			const parts = (v.optionLabel ?? "").split(" / ");
			return {
				id: v.id,
				optionLabel: v.optionLabel ?? "",
				groupKey: parts[0] ?? "—",
				subLabel: parts.length > 1 ? parts.slice(1).join(" / ") : "",
				sku: v.sku,
				qtyOnHand: v.qtyOnHand,
				hasStockRecord: v.hasStockRecord,
			};
		});
	}, [variants]);

	// Group by first attribute only when there are 2+ attributes
	const isMultiAttr = useMemo(() => tableData.some((r) => r.subLabel !== ""), [tableData]);
	const groupingState = useMemo<GroupingState>(() => isMultiAttr ? ["groupKey"] : [], [isMultiAttr]);

	const columns = useMemo<ColumnDef<VariantRow>[]>(() => [
		{ id: "groupKey", accessorKey: "groupKey", enableGrouping: true },
	], []);

	const table = useReactTable({
		data: tableData,
		columns,
		state: { grouping: groupingState, expanded },
		onExpandedChange: setExpanded,
		getCoreRowModel: getCoreRowModel(),
		getGroupedRowModel: getGroupedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		groupedColumnMode: false,
		autoResetExpanded: false,
	});

	const inputStyle: React.CSSProperties = {
		background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "8px",
		padding: "6px 10px", color: t.text, fontSize: "13px", outline: "none",
		fontFamily: "inherit", width: "80px", textAlign: "right" as const,
	};

	return (
		<div
			style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}
			onClick={onClose}
		>
			<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
			<div
				onClick={(e) => e.stopPropagation()}
				style={{ position: "relative", width: "100%", maxWidth: "720px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)", overflow: "hidden", animation: "slideUp 0.22s ease", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
			>
				{/* Header */}
				<div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
					<div>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Variant Stock</h2>
						<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{productName}</p>
					</div>
					<button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<Icon name="close" size={13} />
					</button>
				</div>

				{/* Body */}
				<div style={{ overflowY: "auto", flex: 1 }}>
					{isLoading && (
						<p style={{ padding: "40px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</p>
					)}
					{!isLoading && (!variants || variants.length === 0) && (
						<p style={{ padding: "40px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>
							No active variants found. Add attributes and generate variants in the Products tab first.
						</p>
					)}
					{!isLoading && variants && variants.length > 0 && (
						<>
							{/* Sticky column headers */}
							<div style={{ display: "grid", gridTemplateColumns: VARIANT_COLS, gap: "8px", padding: "9px 18px", borderBottom: `1px solid ${t.borderMid}`, background: t.inputBg, position: "sticky", top: 0, zIndex: 1 }}>
								{["Variant", "SKU", "On Hand", "Set Qty"].map((h) => (
									<span key={h} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
								))}
							</div>

							{/* TanStack Table rows */}
							{table.getRowModel().rows.map((row) => {
								// ── Group header row ───────────────────────────────
								if (row.getIsGrouped()) {
									return (
										<div
											key={row.id}
											onClick={row.getToggleExpandedHandler()}
											style={{ padding: "8px 18px", background: `${t.inputBg}99`, borderBottom: `1px solid ${t.borderMid}`, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" as const }}
										>
											<span style={{ color: t.textFaint, fontSize: "11px", width: "14px", display: "inline-block" }}>
												{row.getIsExpanded() ? "▾" : "▸"}
											</span>
											<span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "13px" }}>
												{String(row.groupingValue)}
											</span>
											<span style={{ color: t.textFaint, fontSize: "11px" }}>
												— {row.subRows.length} variant{row.subRows.length !== 1 ? "s" : ""}
											</span>
										</div>
									);
								}

								// ── Leaf row ───────────────────────────────────────
								const v = row.original;
								const inputVal = qtyInputs[v.id] ?? "";
								return (
									<div
										key={row.id}
										style={{ display: "grid", gridTemplateColumns: VARIANT_COLS, gap: "8px", padding: "10px 18px", paddingLeft: isMultiAttr ? "40px" : "18px", borderBottom: `1px solid ${t.borderMid}`, alignItems: "center" }}
									>
										<div>
											<p style={{ color: t.text, fontSize: "12px", fontWeight: 600 }}>
												{isMultiAttr ? (v.subLabel || v.optionLabel) : v.optionLabel}
											</p>
											{!v.hasStockRecord && (
												<span style={{ fontSize: "9px", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "1px 5px", borderRadius: "4px" }}>UNSET</span>
											)}
										</div>
										<span style={{ color: t.textFaint, fontSize: "11px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.sku}</span>
										<span style={{ color: v.hasStockRecord ? t.text : t.textFaint, fontSize: "13px", fontWeight: 600 }}>
											{v.hasStockRecord ? Number(v.qtyOnHand).toLocaleString() : "—"}
										</span>
										<div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
											<input
												type="number" min="0" step="1"
												value={inputVal}
												onChange={(e) => setQtyInputs((p) => ({ ...p, [v.id]: e.target.value }))}
												placeholder={v.hasStockRecord ? String(v.qtyOnHand) : "0"}
												style={inputStyle}
											/>
											<button
												onClick={() => {
													const qty = Number(inputVal);
													if (inputVal === "" || isNaN(qty) || qty < 0) return;
													setStock.mutate({ variantId: v.id, locationId, qty });
													setQtyInputs((p) => { const n = { ...p }; delete n[v.id]; return n; });
												}}
												disabled={inputVal === "" || setStock.isPending}
												style={{ padding: "6px 10px", borderRadius: "7px", border: "none", background: inputVal !== "" ? "var(--primary)" : t.inputBg, color: inputVal !== "" ? "#fff" : t.textFaint, fontSize: "11px", fontWeight: 700, cursor: inputVal !== "" ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" as const }}
											>
												Set
											</button>
										</div>
									</div>
								);
							})}
						</>
					)}
				</div>

				{/* Footer */}
				<div style={{ padding: "12px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
					<button onClick={onClose} style={{ padding: "9px 18px", borderRadius: "11px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
};

// ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const COLS = "40px 80px 1.5fr 55px 85px 90px 80px";

// ── Set Qty Modal ─────────────────────────────────────────────

interface SetQtyModalProps {
	product: {
		productId: string;
		name: string;
		sku: string;
		costPrice: number;
		qtyOnHand: number;
		hasRecord: boolean;
	};
	locationId: string;
	onClose: () => void;
	onSuccess: () => void;
}

const SetQtyModal: React.FC<SetQtyModalProps> = ({ product, locationId, onClose, onSuccess }) => {
	const t = useAppStore((s) => s.theme)
	const sym = useAppStore((s) => s.currency.symbol);
	const [qty, setQty] = useState(String(product.qtyOnHand));
	const [cost, setCost] = useState(String(product.costPrice));

	const setQtyMutation = trpc.stock.setQty.useMutation({
		onSuccess: () => { onSuccess(); onClose(); },
	});

	const handleSave = () => {
		const qtyNum = Number(qty);
		const costNum = Number(cost);
		if (isNaN(qtyNum) || qtyNum < 0) return;
		if (isNaN(costNum) || costNum < 0) return;
		setQtyMutation.mutate({ productId: product.productId, locationId, qty: qtyNum, unitCost: costNum });
	};

	const inputStyle: React.CSSProperties = {
		background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "10px",
		padding: "9px 12px", color: t.text, fontSize: "14px", outline: "none",
		fontFamily: "inherit", width: "100%",
	};

	return (
		<div
			style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}
			onClick={onClose}
		>
			<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
			<div
				onClick={(e) => e.stopPropagation()}
				style={{ position: "relative", width: "100%", maxWidth: "380px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)", overflow: "hidden", animation: "slideUp 0.22s ease" }}
			>
				{/* Header */}
				<div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
					<div>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Set Stock Quantity</h2>
						<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>{product.name}</p>
						<p style={{ color: t.textFaint, fontSize: "11px", fontFamily: "monospace" }}>{product.sku}</p>
					</div>
					<button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<Icon name="close" size={13} />
					</button>
				</div>

				{/* Body */}
				<div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
					<div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<span style={{ color: t.textFaint, fontSize: "12px" }}>Current Quantity</span>
						<span style={{ color: product.hasRecord ? t.text : "#f59e0b", fontSize: "14px", fontWeight: 700 }}>
							{product.hasRecord ? product.qtyOnHand : "Not initialized"}
						</span>
					</div>

					<div>
						<label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>New Quantity *</label>
						<input type="number" min="0" step="1" value={qty} onChange={(e) => setQty(e.target.value)} style={inputStyle} autoFocus />
					</div>

					<div>
						<label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Unit Cost ({sym})</label>
						<input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} style={inputStyle} />
						<p style={{ color: t.textFaint, fontSize: "10px", marginTop: "4px" }}>Used for stock valuation and COGS</p>
					</div>

					{setQtyMutation.isError && (
						<p style={{ color: "#ef4444", fontSize: "12px" }}>
							{(setQtyMutation.error as any)?.message ?? "Failed to update stock."}
						</p>
					)}

					<div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
						<button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: "11px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={setQtyMutation.isPending || qty === ""}
							style={{ flex: 2, padding: "11px", borderRadius: "11px", border: "none", background: setQtyMutation.isPending || qty === "" ? t.inputBg : "var(--primary)", color: setQtyMutation.isPending || qty === "" ? t.textFaint : "#fff", fontSize: "13px", fontWeight: 700, cursor: setQtyMutation.isPending || qty === "" ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
						>
							{setQtyMutation.isPending ? "Saving..." : "Save"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

// ── Main StockPage ────────────────────────────────────────────

export const StockPage: React.FC = () => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);
	const sym = useAppStore((s) => s.currency.symbol);
	const lowStockThreshold = useAppStore((s) => s.lowStockThreshold);
	const [locationId, setLocationId] = useState("");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [editQty, setEditQty] = useState<any | null>(null);
	const [variantStockItem, setVariantStockItem] = useState<any | null>(null);
	const [productModal, setProductModal] = useState<null | "create" | ProductForEdit>(null);

	const { data: locationsData } = trpc.location.list.useQuery({ isActive: true, pageSize: 100 });
	const locations = locationsData?.data ?? [];

	useEffect(() => {
		if (!locationId && locations.length > 0) setLocationId(locations[0].id);
	}, [locations, locationId]);

	const { data: inventoryData, isLoading, refetch } = trpc.stock.allProducts.useQuery(
		{ locationId, page, pageSize: PAGE_SIZE, search: search || undefined, isActive: statusFilter === "active" },
		{ enabled: !!locationId }
	);
	const { data: valueData } = trpc.stock.inventoryValue.useQuery({ locationId }, { enabled: !!locationId });

	const inventory = inventoryData?.data ?? [];
	const total = inventoryData?.total ?? 0;
	const totalPages = Math.max(inventoryData?.totalPages ?? 1, 1);
	const uninitializedCount = inventory.filter((i: any) => !i.hasRecord).length;

	const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
		const start = Math.max(1, Math.min(page - 2, totalPages - 4));
		return start + i;
	}).filter((p) => p >= 1 && p <= totalPages);

	const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
	const handleStatusChange = (s: "active" | "inactive") => { setStatusFilter(s); setPage(1); setSearch(""); };

	const summaryCards: { label: string; value: string; color: string; icon: IconKey }[] = [
		{ label: "Total Value", value: `${sym}${Number(valueData?.totalValue ?? 0).toLocaleString()}`, color: "var(--primary)", icon: "product" },
		{ label: "Total SKUs", value: String(valueData?.totalItems ?? 0), color: "#3b82f6", icon: "stock" },
		{ label: "Not Initialized", value: String(uninitializedCount), color: uninitializedCount > 0 ? "#f59e0b" : "#10b981", icon: "plus" },
	];

	const rowToProduct = useCallback((item: any): ProductForEdit => ({
		id: item.productId,
		sku: item.sku,
		barcode: item.barcode ?? null,
		name: item.name,
		description: item.description ?? null,
		categoryId: item.categoryId ?? null,
		unitOfMeasure: item.unitOfMeasure,
		costPrice: item.costPrice,
		sellingPrice: item.sellingPrice,
		taxRate: item.taxRate ?? 0,
		isSerialized: item.isSerialized ?? false,
		imageUrl: item.imageUrl ?? null,
	}), []);

	// ── TanStack column definitions ───────────────────────────
	const stockColumns = useMemo<ColumnDef<any>[]>(() => [
		{
			id: "image",
			header: "",
			enableSorting: false,
			cell: ({ row }) => {
				const item = row.original;
				return (
					<div style={{ width: "32px", height: "32px", borderRadius: "8px", overflow: "hidden", background: t.inputBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
						{item.imageUrl
							? <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
							: <Icon name="product" size={13} style={{ color: t.textFaint }} />
						}
					</div>
				);
			},
		},
		{
			id: "sku",
			accessorKey: "sku",
			header: "SKU",
			cell: ({ getValue }) => (
				<span style={{ color: t.textFaint, fontSize: "11px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
					{getValue<string>()}
				</span>
			),
		},
		{
			id: "name",
			accessorKey: "name",
			header: "Product",
			cell: ({ row }) => {
				const item = row.original;
				const uninitialized = !item.hasRecord;
				return (
					<div style={{ minWidth: 0 }}>
						<p style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
						<div style={{ display: "flex", gap: "4px", marginTop: "2px", flexWrap: "wrap" }}>
							{uninitialized && !item.hasVariants && (
								<span style={{ fontSize: "9px", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "1px 6px", borderRadius: "4px" }}>UNINITIALIZED</span>
							)}
							{!uninitialized && !item.hasVariants && Number(item.qtyAvailable) <= lowStockThreshold && (
								<span style={{ fontSize: "9px", fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: "4px" }}>LOW</span>
							)}
							{!!item.hasVariants && (
								<span style={{ fontSize: "9px", fontWeight: 700, color: "var(--primary)", background: "var(--primary-10)", padding: "1px 6px", borderRadius: "4px" }}>VARIANTS</span>
							)}
						</div>
					</div>
				);
			},
		},
		{
			id: "unitOfMeasure",
			accessorKey: "unitOfMeasure",
			header: "Unit",
			cell: ({ getValue }) => (
				<span style={{ color: t.textMuted, fontSize: "12px" }}>{getValue<string>()}</span>
			),
		},
		{
			id: "qtyOnHand",
			accessorKey: "qtyOnHand",
			header: "On Hand",
			cell: ({ row }) => {
				const item = row.original;
				return (
					<span style={{ color: !item.hasRecord ? t.textFaint : t.text, fontSize: "13px", fontWeight: 500 }}>
						{!item.hasRecord ? "—" : Number(item.qtyOnHand).toLocaleString()}
					</span>
				);
			},
		},
		{
			id: "qtyAvailable",
			accessorKey: "qtyAvailable",
			header: "Available",
			cell: ({ row }) => {
				const item = row.original;
				return (
					<span style={{ color: !item.hasRecord ? t.textFaint : Number(item.qtyAvailable) <= 0 ? "#ef4444" : t.text, fontSize: "13px", fontWeight: 600 }}>
						{!item.hasRecord ? "—" : Number(item.qtyAvailable).toLocaleString()}
					</span>
				);
			},
		},
		{
			id: "actions",
			header: "",
			enableSorting: false,
			cell: ({ row }) => {
				const item = row.original;
				return (
					<div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
						<button
							title="Edit product"
							onClick={() => setProductModal(rowToProduct(item))}
							style={{ width: "28px", height: "28px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
							onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-15)")}
							onMouseLeave={(e) => (e.currentTarget.style.background = t.inputBg)}
						>
							<Icon name="edit" size={12} />
						</button>
					</div>
				);
			},
		},
	], [t, lowStockThreshold, rowToProduct, setProductModal]);

	const stockTable = useReactTable({
		data: inventory,
		columns: stockColumns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		manualPagination: true,
	});

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
				<div>
					<h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>{tr.stock}</h1>
					<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>
						Click a row to set quantity · Edit or deactivate with the action buttons
					</p>
				</div>
				<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
					<button
						onClick={() => setProductModal("create")}
						style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
					>
						<Icon name="plus" size={13} style={{ color: "#fff" }} />
						Add Product
					</button>
					{locations.length > 0 ? (
						<AppSelect
					value={locationId}
					onChange={(v) => { setLocationId(v); setPage(1); setSearch(""); }}
					options={locations.map((l) => ({ value: l.id, label: l.name }))}
					isSearchable={false}
					minWidth={180}
				/>
					) : (
						<span style={{ color: t.textFaint, fontSize: "13px" }}>No locations configured</span>
					)}
				</div>
			</div>

			{/* Summary cards */}
			{locationId && (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
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

			{/* Uninitialized warning */}
			{locationId && uninitializedCount > 0 && (
				<div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
					<Icon name="bell" size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
					<p style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 600 }}>
						{uninitializedCount} product{uninitializedCount !== 1 ? "s" : ""} have no stock record at this location. Click them to set an opening quantity before selling.
					</p>
				</div>
			)}

			{/* Filter bar */}
			{locationId && (
				<div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
					{/* Active / Inactive toggle */}
					<div style={{ display: "flex", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "3px", gap: "2px" }}>
						{(["active", "inactive"] as const).map((s) => (
							<button
								key={s}
								onClick={() => handleStatusChange(s)}
								style={{
									padding: "5px 13px", borderRadius: "8px", border: "none", cursor: "pointer",
									fontSize: "12px", fontWeight: 500, fontFamily: "inherit", textTransform: "capitalize",
									background: statusFilter === s ? t.surface : "transparent",
									color: statusFilter === s ? t.text : t.textMuted,
									boxShadow: statusFilter === s ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
									transition: "all 0.15s",
								}}
							>
								{s.charAt(0).toUpperCase() + s.slice(1)}
							</button>
						))}
					</div>

					{/* Search */}
					<div style={{ position: "relative", maxWidth: "260px", flex: 1 }}>
						<div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}>
							<Icon name="search" size={13} />
						</div>
						<input
							value={search}
							onChange={(e) => handleSearchChange(e.target.value)}
							placeholder="Search products..."
							style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px 9px 33px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
						/>
					</div>
				</div>
			)}

			{/* Table */}
			{!locationId ? (
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "56px", textAlign: "center" }}>
					<Icon name="stock" size={32} style={{ color: t.textFaint, display: "block", margin: "0 auto 12px" }} />
					<p style={{ color: t.textFaint, fontSize: "13px" }}>Select a location to view inventory</p>
				</div>
			) : (
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
					{/* TanStack column headers with sort indicators */}
					{stockTable.getHeaderGroups().map((headerGroup) => (
						<div key={headerGroup.id} style={{ display: "grid", gridTemplateColumns: COLS, gap: "8px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
							{headerGroup.headers.map((header) => {
								const canSort = header.column.getCanSort();
								const sorted = header.column.getIsSorted();
								return (
									<div
										key={header.id}
										onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
										style={{
											display: "flex", alignItems: "center", gap: "4px",
											cursor: canSort ? "pointer" : "default",
											userSelect: "none",
											color: sorted ? "var(--primary)" : t.textFaint,
											fontSize: "10px", fontWeight: 700,
											textTransform: "uppercase", letterSpacing: "0.7px",
										}}
									>
										{flexRender(header.column.columnDef.header, header.getContext())}
										{canSort && (
											<span style={{ fontSize: "9px", opacity: sorted ? 1 : 0.35 }}>
												{sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
											</span>
										)}
									</div>
								);
							})}
						</div>
					))}

					{isLoading ? (
						<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
					) : stockTable.getRowModel().rows.length === 0 ? (
						<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>No products found</div>
					) : (
						stockTable.getRowModel().rows.map((row) => {
							const item = row.original;
							return (
								<div
									key={row.id}
									onClick={() => item.hasVariants ? setVariantStockItem(item) : setEditQty(item)}
									style={{ display: "grid", gridTemplateColumns: COLS, gap: "8px", padding: "10px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, cursor: "pointer", transition: "background 0.15s" }}
									onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
									onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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

					{/* Pagination */}
					<div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {inventory.length} {tr.of} {total}</span>
						{totalPages > 1 && (
							<div style={{ display: "flex", gap: "3px" }}>
								{pageButtons.map((p) => (
									<button key={p} onClick={(e) => { e.stopPropagation(); setPage(p); }} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "var(--primary)" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Variant Stock modal */}
			{variantStockItem && (
				<VariantStockModal
					productId={variantStockItem.productId}
					productName={variantStockItem.name}
					locationId={locationId}
					onClose={() => setVariantStockItem(null)}
					onSuccess={() => refetch()}
				/>
			)}

			{/* Set Qty modal */}
			{editQty && (
				<SetQtyModal
					product={editQty}
					locationId={locationId}
					onClose={() => setEditQty(null)}
					onSuccess={() => refetch()}
				/>
			)}

			{/* Product create / edit modal */}
			{productModal !== null && (
				<ProductModal
					product={productModal === "create" ? undefined : productModal}
					onClose={() => setProductModal(null)}
					onSuccess={() => { refetch(); setProductModal(null); }}
				/>
			)}
		</div>
	);
};
