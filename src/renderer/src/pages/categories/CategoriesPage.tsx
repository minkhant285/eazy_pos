import React, { useState } from "react";
import { AppSelect } from '../../components/ui/AppSelect';
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

interface CatForm { name: string; description: string; parentId: string; }
interface ModalState { open: boolean; category: { id: string; name: string; description: string | null; parentId: string | null } | null; }

export const CategoriesPage: React.FC = () => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	const [search, setSearch] = useState("");
	const [modal, setModal] = useState<ModalState>({ open: false, category: null });
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [form, setForm] = useState<CatForm>({ name: "", description: "", parentId: "" });

	const { data: categories = [], isLoading, refetch } = trpc.category.list.useQuery({});
	const createCat = trpc.category.create.useMutation({ onSuccess: () => { setModal({ open: false, category: null }); refetch(); } });
	const updateCat = trpc.category.update.useMutation({ onSuccess: () => { setModal({ open: false, category: null }); refetch(); } });
	const deleteCat = trpc.category.delete.useMutation({ onSuccess: () => { setDeleteId(null); refetch(); } });

	const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

	const openModal = (cat?: (typeof categories)[0]) => {
		setForm({ name: cat?.name ?? "", description: cat?.description ?? "", parentId: cat?.parentId ?? "" });
		setModal({ open: true, category: cat ?? null });
	};

	const handleSubmit = () => {
		if (!form.name.trim()) return;
		const payload = { name: form.name.trim(), description: form.description.trim() || undefined, parentId: form.parentId || undefined };
		if (!modal.category) createCat.mutate(payload);
		else updateCat.mutate({ id: modal.category.id, data: payload });
	};

	const isPending = createCat.isPending || updateCat.isPending;
	const isNew = !modal.category;

	const inputStyle = { width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };
	const labelStyle = { color: t.textMuted, fontSize: "10.5px", fontWeight: 700, display: "block", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.5px" };

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
				<div>
					<h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>{tr.categories}</h1>
					<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{filtered.length} categories</p>
				</div>
				<button onClick={() => openModal()} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px var(--primary-30)", fontFamily: "inherit" }}>
					<Icon name="plus" size={13} /> New Category
				</button>
			</div>

			{/* Search */}
			<div style={{ position: "relative", maxWidth: "280px" }}>
				<div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}><Icon name="search" size={13} /></div>
				<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." style={{ ...inputStyle, padding: "9px 12px 9px 33px", maxWidth: "280px" }} />
			</div>

			{/* Table */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 72px", gap: "10px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
					{["Name", "Description", "Parent", ""].map((h, i) => (
						<span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
					))}
				</div>

				{isLoading ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
				) : filtered.length === 0 ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>No categories found</div>
				) : filtered.map((c) => {
					const parent = categories.find((p) => p.id === c.parentId);
					return (
						<div key={c.id}
							style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 72px", gap: "10px", padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s" }}
							onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
							onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "var(--primary-15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
									<Icon name="category" size={12} style={{ color: "var(--primary-light)" }} />
								</div>
								<span style={{ color: t.text, fontSize: "13px", fontWeight: 600 }}>{c.name}</span>
							</div>
							<span style={{ color: t.textMuted, fontSize: "12px" }}>{c.description ?? "—"}</span>
							<span style={{ color: t.textFaint, fontSize: "12px" }}>{parent?.name ?? "—"}</span>
							<div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }}>
								<button onClick={() => openModal(c)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={11} /></button>
								<button onClick={() => setDeleteId(c.id)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={11} /></button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Delete confirm */}
			{deleteId && (
				<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
					<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={() => setDeleteId(null)} />
					<div style={{ position: "relative", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "18px", padding: "22px", maxWidth: "340px", width: "calc(100% - 32px)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.2s ease" }}>
						<h3 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Delete Category?</h3>
						<p style={{ color: t.textMuted, fontSize: "13px", marginTop: "8px", lineHeight: 1.5 }}>{tr.delete_warning}</p>
						<div style={{ display: "flex", gap: "9px", marginTop: "18px" }}>
							<button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
							<button onClick={() => deleteCat.mutate({ id: deleteId })} disabled={deleteCat.isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: deleteCat.isPending ? 0.7 : 1 }}>
								{deleteCat.isPending ? "..." : tr.delete}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Create / Edit Modal */}
			{modal.open && (
				<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModal({ open: false, category: null })}>
					<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
					<div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "400px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden", animation: "slideUp 0.22s ease" }}>
						<div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
							<div>
								<h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>{isNew ? "New Category" : "Edit Category"}</h2>
								<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>{isNew ? "Add a new product category" : modal.category?.name}</p>
							</div>
							<button onClick={() => setModal({ open: false, category: null })} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} /></button>
						</div>
						<div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "13px" }}>
							<div>
								<label style={labelStyle}>Name *</label>
								<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Beverages" style={inputStyle} />
							</div>
							<div>
								<label style={labelStyle}>Description</label>
								<input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" style={inputStyle} />
							</div>
							<div>
								<label style={labelStyle}>Parent Category</label>
							<AppSelect
						value={form.parentId}
						onChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
						options={[{ value: '', label: 'None (top-level)' }, ...categories.filter((c) => c.id !== modal.category?.id).map((c) => ({ value: c.id, label: c.name }))]}
						isSearchable={false}
					/>
							</div>
						</div>
						<div style={{ padding: "0 22px 22px", display: "flex", gap: "10px" }}>
							<button onClick={() => setModal({ open: false, category: null })} disabled={isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
							<button onClick={handleSubmit} disabled={isPending || !form.name.trim()} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px var(--primary-35)", opacity: isPending || !form.name.trim() ? 0.7 : 1 }}>
								{isPending ? "..." : isNew ? "Create" : tr.save_changes}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
