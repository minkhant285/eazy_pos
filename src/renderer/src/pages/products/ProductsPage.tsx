import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { AppSelect } from "../../components/ui/AppSelect";
import { trpc } from "../../trpc-client/trpc";

type FilterKey = "all" | "active" | "inactive";
const PAGE_SIZE = 20;

// ── Product Modal ─────────────────────────────────────────────────────────────

interface ProductModalProps {
	product: any | null;
	categories: { id: string; name: string }[];
	onClose: () => void;
	onSuccess: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, categories, onClose, onSuccess }) => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);
	const sym = useAppStore((s) => s.currency.symbol);
	const isNew = !product;

	const [form, setForm] = useState({
		sku: product?.sku ?? "",
		barcode: product?.barcode ?? "",
		name: product?.name ?? "",
		categoryId: product?.categoryId ?? "",
		unitOfMeasure: product?.unitOfMeasure ?? "pcs",
		costPrice: String(product?.costPrice ?? "0"),
		sellingPrice: String(product?.sellingPrice ?? "0"),
		description: product?.description ?? "",
	});

	const create = trpc.product.create.useMutation({ onSuccess });
	const update = trpc.product.update.useMutation({ onSuccess });
	const isPending = create.isPending || update.isPending;

	const handleSubmit = () => {
		if (!form.name.trim() || (!isNew ? false : !form.sku.trim())) return;
		const base = {
			name: form.name.trim(),
			barcode: form.barcode.trim() || undefined,
			categoryId: form.categoryId || undefined,
			unitOfMeasure: form.unitOfMeasure.trim() || undefined,
			costPrice: Number(form.costPrice) || 0,
			sellingPrice: Number(form.sellingPrice) || 0,
			description: form.description.trim() || undefined,
		};
		if (isNew) create.mutate({ sku: form.sku.trim(), ...base });
		else update.mutate({ id: product.id, data: base });
	};

	const labelStyle = { color: t.textMuted, fontSize: "10.5px", fontWeight: 700, display: "block", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
	const inputStyle = (readonly = false) => ({ width: "100%", background: readonly ? "transparent" : t.inputBg, border: `1px solid ${readonly ? t.border : t.inputBorder}`, borderRadius: "11px", padding: "9px 12px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit", opacity: readonly ? 0.6 : 1 });

	const field = (label: string, key: keyof typeof form, ph: string, type = "text", readonly = false) => (
		<div key={key}>
			<label style={labelStyle}>{label}</label>
			<input value={form[key]} onChange={(e) => !readonly && setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={ph} type={type} readOnly={readonly} style={inputStyle(readonly)} />
		</div>
	);

	return (
		<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
			<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
			<div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "500px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.22s ease", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
				{/* Header */}
				<div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
					<div>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>{isNew ? "New Product" : "Edit Product"}</h2>
						<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>{isNew ? "Add a new product to inventory" : product?.name}</p>
					</div>
					<button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} /></button>
				</div>
				{/* Form */}
				<div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "13px" }}>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
						{field("SKU *", "sku", "e.g. SKU-001", "text", !isNew)}
						{field("Barcode", "barcode", "e.g. 8850123456789")}
					</div>
					{field("Product Name *", "name", "e.g. Jasmine Rice 5kg")}
					<div>
						<label style={labelStyle}>Category</label>
						<AppSelect
					value={form.categoryId}
					onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
					options={[{ value: '', label: 'No category' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
				/>
					</div>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
						{field(`Cost Price (${sym})` as string, "costPrice", "0", "number")}
						{field(`Selling Price (${sym}) *` as string, "sellingPrice", "0", "number")}
					</div>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
						{field("Unit of Measure", "unitOfMeasure", "pcs")}
							</div>
					{field("Description", "description", "Optional product description")}
				</div>
				{/* Footer */}
				<div style={{ padding: "16px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "10px" }}>
					<button onClick={onClose} disabled={isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
					<button onClick={handleSubmit} disabled={isPending || !form.name.trim()} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px var(--primary-35)", opacity: isPending || !form.name.trim() ? 0.7 : 1 }}>
						{isPending ? "..." : isNew ? "Create Product" : tr.save_changes}
					</button>
				</div>
			</div>
		</div>
	);
};

// ── Products Page ─────────────────────────────────────────────────────────────

export const ProductsPage: React.FC = () => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);
	const sym = useAppStore((s) => s.currency.symbol);

	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<FilterKey>("all");
	const [page, setPage] = useState(1);
	const [modal, setModal] = useState<{ open: boolean; product: any | null }>({ open: false, product: null });
	const [deactivateId, setDeactivateId] = useState<string | null>(null);

	const isActiveFilter = filter === "all" ? undefined : filter === "active";

	const { data, isLoading, refetch } = trpc.product.list.useQuery({
		page, pageSize: PAGE_SIZE,
		search: search || undefined,
		isActive: isActiveFilter,
	});

	const { data: categoriesData } = trpc.category.list.useQuery({});
	const categories = (categoriesData ?? []) as { id: string; name: string }[];

	const products = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(data?.totalPages ?? 1, 1);

	const deactivate = trpc.product.deactivate.useMutation({ onSuccess: () => { setDeactivateId(null); refetch(); } });

	const filterOptions: { key: FilterKey; label: string }[] = [
		{ key: "all", label: tr.all },
		{ key: "active", label: tr.active },
		{ key: "inactive", label: tr.inactive },
	];

	const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
		const start = Math.max(1, Math.min(page - 2, totalPages - 4));
		return start + i;
	}).filter((p) => p >= 1 && p <= totalPages);

	const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
	const handleFilterChange = (k: FilterKey) => { setFilter(k); setPage(1); };
	const handleModalSuccess = () => { setModal({ open: false, product: null }); refetch(); };

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
				<div>
					<h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>{tr.products}</h1>
					<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{total} products</p>
				</div>
				<button onClick={() => setModal({ open: true, product: null })} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px var(--primary-30)", fontFamily: "inherit", whiteSpace: "nowrap" }}>
					<Icon name="plus" size={13} /> New Product
				</button>
			</div>

			{/* Filter bar */}
			<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
				<div style={{ position: "relative", flex: 1, minWidth: "180px", maxWidth: "280px" }}>
					<div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}><Icon name="search" size={13} /></div>
					<input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search name, SKU..." style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px 9px 33px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
				</div>
				<div style={{ display: "flex", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "3px", gap: "2px" }}>
					{filterOptions.map((f) => (
						<button key={f.key} onClick={() => handleFilterChange(f.key)} style={{ padding: "6px 11px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: filter === f.key ? t.surface : "transparent", color: filter === f.key ? t.text : t.textMuted, boxShadow: filter === f.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>{f.label}</button>
					))}
				</div>
				<button style={{ display: "flex", alignItems: "center", gap: "5px", padding: "9px 12px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
					<Icon name="download" size={13} />{tr.export}
				</button>
			</div>

			{/* Table */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
				<div style={{ display: "grid", gridTemplateColumns: "90px 1.5fr 1fr 90px 90px 55px auto 64px", gap: "8px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
					{["SKU", "Product", "Category", "Cost", "Price", "Unit", tr.status, ""].map((h, i) => (
						<span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
					))}
				</div>

				{isLoading ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
				) : products.length === 0 ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>No products found</div>
				) : products.map((p) => (
					<div key={p.id}
						style={{ display: "grid", gridTemplateColumns: "90px 1.5fr 1fr 90px 90px 55px auto 64px", gap: "8px", padding: "12px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s" }}
						onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
						onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
					>
						<span style={{ color: t.textFaint, fontSize: "11px", fontFamily: "monospace", background: t.inputBg, padding: "2px 6px", borderRadius: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.sku}</span>
						<div style={{ minWidth: 0 }}>
							<p style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
							{p.barcode && <p style={{ color: t.textFaint, fontSize: "10.5px" }}>{p.barcode}</p>}
						</div>
						<span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(p as any).categoryName ?? "—"}</span>
						<span style={{ color: t.textSubtle, fontSize: "12px" }}>{sym}{Number(p.costPrice).toLocaleString()}</span>
						<span style={{ color: t.text, fontSize: "13px", fontWeight: 500 }}>{sym}{Number(p.sellingPrice).toLocaleString()}</span>
						<span style={{ color: t.textMuted, fontSize: "11px" }}>{p.unitOfMeasure}</span>
						<span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", whiteSpace: "nowrap", background: p.isActive ? "rgba(16,185,129,0.12)" : t.inputBg, color: p.isActive ? "#10b981" : t.textFaint }}>{p.isActive ? tr.active : tr.inactive}</span>
						<div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }}>
							<button onClick={() => setModal({ open: true, product: p })} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={11} /></button>
							<button onClick={() => setDeactivateId(p.id)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={11} /></button>
						</div>
					</div>
				))}

				{/* Pagination */}
				<div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {products.length} {tr.of} {total}</span>
					{totalPages > 1 && (
						<div style={{ display: "flex", gap: "3px" }}>
							{pageButtons.map((p) => (
								<button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "var(--primary)" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Deactivate confirm */}
			{deactivateId && (
				<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
					<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={() => setDeactivateId(null)} />
					<div style={{ position: "relative", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "18px", padding: "22px", maxWidth: "340px", width: "calc(100% - 32px)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.2s ease" }}>
						<h3 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Deactivate Product?</h3>
						<p style={{ color: t.textMuted, fontSize: "13px", marginTop: "8px", lineHeight: 1.5 }}>{tr.delete_warning}</p>
						<div style={{ display: "flex", gap: "9px", marginTop: "18px" }}>
							<button onClick={() => setDeactivateId(null)} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
							<button onClick={() => deactivate.mutate({ id: deactivateId })} disabled={deactivate.isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: deactivate.isPending ? 0.7 : 1 }}>
								{deactivate.isPending ? "..." : "Deactivate"}
							</button>
						</div>
					</div>
				</div>
			)}

			{modal.open && <ProductModal product={modal.product} categories={categories} onClose={() => setModal({ open: false, product: null })} onSuccess={handleModalSuccess} />}
		</div>
	);
};
