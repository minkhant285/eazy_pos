import React, { useState, useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { CustomerModal } from "./CustomerModal";
import { trpc } from "../../trpc-client/trpc";
import type { Customer } from "../../types";
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
	createColumnHelper,
} from "@tanstack/react-table";

// ── Address Book Modal ────────────────────────────────────────

type Address = {
	id: string;
	receiverName: string;
	phoneNumber: string;
	detailAddress: string;
	isDefault: boolean;
};

type AddrForm = { receiverName: string; phoneNumber: string; detailAddress: string };
const emptyForm = (): AddrForm => ({ receiverName: "", phoneNumber: "", detailAddress: "" });

const AddressBookModal: React.FC<{ customer: Customer; onClose: () => void }> = ({ customer, onClose }) => {
	const t = useAppStore((s) => s.theme);
	const currentUser = useAppStore((s) => s.currentUser);
	const [form, setForm] = useState<AddrForm | null>(null);
	const [editId, setEditId] = useState<string | null>(null);

	const { data: addresses = [], refetch } = trpc.customerAddress.list.useQuery({ customerId: customer.id });
	const createMut  = trpc.customerAddress.create.useMutation({ onSuccess: () => { refetch(); setForm(null); } });
	const updateMut  = trpc.customerAddress.update.useMutation({ onSuccess: () => { refetch(); setForm(null); setEditId(null); } });
	const deleteMut  = trpc.customerAddress.delete.useMutation({ onSuccess: () => refetch() });
	const defaultMut = trpc.customerAddress.setDefault.useMutation({ onSuccess: () => refetch() });

	const openAdd  = () => { setEditId(null); setForm(emptyForm()); };
	const openEdit = (a: Address) => { setEditId(a.id); setForm({ receiverName: a.receiverName, phoneNumber: a.phoneNumber, detailAddress: a.detailAddress }); };
	const cancelForm = () => { setForm(null); setEditId(null); };

	const handleSave = () => {
		if (!form) return;
		if (!form.receiverName.trim() || !form.phoneNumber.trim() || !form.detailAddress.trim()) return;
		if (editId) {
			updateMut.mutate({ id: editId, data: form });
		} else {
			createMut.mutate({ customerId: customer.id, ...form });
		}
	};

	const inp: React.CSSProperties = {
		background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "9px",
		padding: "8px 11px", color: t.text, fontSize: "13px", outline: "none",
		fontFamily: "inherit", width: "100%", boxSizing: "border-box",
	};

	const isPending = createMut.isPending || updateMut.isPending;

	return (
		<div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
			<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
			<div
				onClick={(e) => e.stopPropagation()}
				style={{ position: "relative", width: "100%", maxWidth: "520px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)", overflow: "hidden", animation: "slideUp 0.22s ease", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
			>
				<div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
					<div>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Address Book</h2>
						<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{customer.name}</p>
					</div>
					<button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<Icon name="close" size={13} />
					</button>
				</div>

				<div style={{ overflowY: "auto", flex: 1, padding: "16px 22px", display: "flex", flexDirection: "column", gap: "10px" }}>
					{(addresses as Address[]).length === 0 && !form && (
						<p style={{ color: t.textFaint, fontSize: "13px", textAlign: "center", padding: "24px 0" }}>No addresses yet</p>
					)}

					{(addresses as Address[]).map((a) => (
						<div key={a.id} style={{ background: t.inputBg, border: `1px solid ${a.isDefault ? "var(--primary)" : t.border}`, borderRadius: "12px", padding: "12px 14px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
										<span style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{a.receiverName}</span>
										{a.isDefault && (
											<span style={{ fontSize: "9px", fontWeight: 700, color: "var(--primary)", background: "var(--primary-10)", padding: "1px 6px", borderRadius: "4px" }}>DEFAULT</span>
										)}
									</div>
									<p style={{ color: t.textMuted, fontSize: "12px", marginBottom: "3px" }}>{a.phoneNumber}</p>
									<p style={{ color: t.textSubtle, fontSize: "12px", lineHeight: 1.4 }}>{a.detailAddress}</p>
								</div>
								<div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
									{!a.isDefault && (
										<button
											title="Set as default"
											onClick={() => defaultMut.mutate({ id: a.id, customerId: customer.id })}
											style={{ padding: "4px 8px", borderRadius: "6px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textFaint, fontSize: "10px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
										>
											Set Default
										</button>
									)}
									<button onClick={() => openEdit(a)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.surface, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
										<Icon name="edit" size={11} />
									</button>
									{currentUser?.role !== 'cashier' && (
									<button onClick={() => deleteMut.mutate({ id: a.id })} disabled={deleteMut.isPending} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
										<Icon name="trash" size={11} />
									</button>
								)}
								</div>
							</div>
						</div>
					))}

					{form !== null && (
						<div style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "12px", padding: "14px" }}>
							<p style={{ color: t.text, fontWeight: 700, fontSize: "12px", marginBottom: "12px" }}>
								{editId ? "Edit Address" : "New Address"}
							</p>
							<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
								<div>
									<label style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>Receiver Name *</label>
									<input value={form.receiverName} onChange={(e) => setForm((f) => f ? { ...f, receiverName: e.target.value } : f)} style={inp} placeholder="e.g. John Smith" />
								</div>
								<div>
									<label style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>Phone Number *</label>
									<input value={form.phoneNumber} onChange={(e) => setForm((f) => f ? { ...f, phoneNumber: e.target.value } : f)} style={inp} placeholder="e.g. +95 9123456789" />
								</div>
								<div>
									<label style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>Detail Address *</label>
									<textarea value={form.detailAddress} onChange={(e) => setForm((f) => f ? { ...f, detailAddress: e.target.value } : f)} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} placeholder="Street, city, township..." />
								</div>
								<div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
									<button onClick={cancelForm} style={{ flex: 1, padding: "9px", borderRadius: "9px", border: "none", background: t.surface, color: t.textMuted, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
									<button onClick={handleSave} disabled={isPending} style={{ flex: 2, padding: "9px", borderRadius: "9px", border: "none", background: isPending ? t.inputBg : "var(--primary)", color: isPending ? t.textFaint : "#fff", fontSize: "12px", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
										{isPending ? "Saving…" : editId ? "Update" : "Add Address"}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>

				{form === null && (
					<div style={{ padding: "12px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
						<button onClick={onClose} style={{ padding: "9px 16px", borderRadius: "11px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
						<button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "9px 16px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
							<Icon name="plus" size={12} style={{ color: "#fff" }} />
							Add Address
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

// ── Customer Drawer ───────────────────────────────────────────

const CustomerDrawer: React.FC<{ customer: Customer; onClose: () => void; onEdit: () => void; onDeactivate: () => void }> = ({ customer, onClose, onEdit, onDeactivate }) => {
	const t   = useAppStore((s) => s.theme);
	const sym = useAppStore((s) => s.currency.symbol);
	const c = customer as any;

	const fl: React.CSSProperties = { color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" };
	const fv: React.CSSProperties = { color: t.text, fontSize: "13px", fontWeight: 500 };

	return (
		<>
			<div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.35)" }} />
			<div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 56, width: "420px", maxWidth: "100vw", background: t.surface, borderLeft: `1px solid ${t.borderStrong}`, boxShadow: "-16px 0 48px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease" }}>
				{/* Header */}
				<div style={{ padding: "18px 20px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
					<h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Customer Detail</h2>
					<button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "9px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<Icon name="close" size={13} />
					</button>
				</div>

				{/* Body */}
				<div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
					{/* Identity */}
					<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
						<div style={{ width: "96px", height: "96px", borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: c.photoUrl ? "#fff" : "linear-gradient(135deg,var(--primary-light),var(--primary))", border: c.photoUrl ? `1px solid ${t.border}` : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
							{c.photoUrl
								? <img src={c.photoUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
								: <span style={{ color: "#fff", fontSize: "32px", fontWeight: 700 }}>{c.name.charAt(0)}</span>
							}
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
								<h3 style={{ color: t.text, fontSize: "17px", fontWeight: 800, letterSpacing: "-0.3px" }}>{c.name}</h3>
								<span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: c.isActive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: c.isActive ? "#10b981" : "#ef4444" }}>
									{c.isActive ? "Active" : "Inactive"}
								</span>
							</div>
							{c.customerType && (
								<span style={{ fontSize: "10px", fontWeight: 700, color: c.customerType === "wholesale" ? "#f59e0b" : "var(--primary)", background: c.customerType === "wholesale" ? "rgba(245,158,11,0.12)" : "var(--primary-10)", padding: "2px 8px", borderRadius: "20px", marginTop: "4px", display: "inline-block" }}>
									{c.customerType === "wholesale" ? "Wholesale" : "Retail"}
								</span>
							)}
						</div>
					</div>

					{/* Outstanding balance */}
					{Number(c.outstandingBalance) > 0 && (
						<div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 700 }}>Outstanding Balance</span>
							<span style={{ color: "#ef4444", fontSize: "16px", fontWeight: 800 }}>{sym}{Number(c.outstandingBalance).toLocaleString()}</span>
						</div>
					)}

					{/* Contact & stats */}
					<div style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
						<p style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Contact</p>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
							{[["Phone", c.phone], ["Email", c.email], ["Address", c.address]].map(([label, val]) => val ? (
								<div key={label} style={{ gridColumn: label === "Email" || label === "Address" ? "1 / -1" : undefined }}>
									<p style={fl}>{label}</p>
									<p style={fv}>{val}</p>
								</div>
							) : null)}
						</div>
						{!c.phone && !c.email && !c.address && (
							<p style={{ color: t.textFaint, fontSize: "12px" }}>No contact details</p>
						)}
					</div>

					{/* Stats */}
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
						<div style={{ background: t.inputBg, borderRadius: "10px", padding: "12px 14px" }}>
							<p style={fl}>Loyalty Points</p>
							<p style={{ ...fv, color: "#f59e0b", fontSize: "18px", fontWeight: 800 }}>{Number(c.loyaltyPoints).toLocaleString()}</p>
						</div>
						<div style={{ background: t.inputBg, borderRadius: "10px", padding: "12px 14px" }}>
							<p style={fl}>Credit Limit</p>
							<p style={{ ...fv, fontSize: "14px", fontWeight: 700 }}>{sym}{Number(c.creditLimit).toLocaleString()}</p>
						</div>
					</div>

					{/* Meta */}
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
						<div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 12px" }}>
							<p style={fl}>Joined</p>
							<p style={{ ...fv, fontSize: "12px" }}>{new Date(c.createdAt).toLocaleDateString()}</p>
						</div>
						<div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 12px" }}>
							<p style={fl}>Last Updated</p>
							<p style={{ ...fv, fontSize: "12px" }}>{new Date(c.updatedAt).toLocaleDateString()}</p>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div style={{ padding: "14px 20px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "8px", flexShrink: 0 }}>
					{c.isActive && (
						<button onClick={onDeactivate} style={{ padding: "9px 16px", borderRadius: "10px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
							Deactivate
						</button>
					)}
					<button onClick={onEdit} style={{ flex: 1, padding: "9px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
						Edit Customer
					</button>
				</div>
			</div>
		</>
	);
};

// ── Customers Page ────────────────────────────────────────────

type FilterKey = "all" | "active" | "inactive" | "wholesale";
interface ModalState { open: boolean; customer: Customer | null; }

const PAGE_SIZE = 20;
const colHelper = createColumnHelper<Customer>();

export const CustomersPage: React.FC = () => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);
	const currentUser = useAppStore((s) => s.currentUser);

	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<FilterKey>("all");
	const [modal, setModal] = useState<ModalState>({ open: false, customer: null });
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [addressBookCustomer, setAddressBookCustomer] = useState<Customer | null>(null);
	const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
	const [page, setPage] = useState(1);

	const isActiveFilter = filter === "wholesale" || filter === "all" ? undefined : filter === "active";
	const customerTypeFilter = filter === "wholesale" ? "wholesale" : undefined;

	const { data, isLoading, refetch } = trpc.customer.list.useQuery({
		page,
		pageSize: PAGE_SIZE,
		search: search || undefined,
		isActive: isActiveFilter,
		customerType: customerTypeFilter,
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
		{ key: "wholesale", label: "Wholesale" },
	];

	const handleSearchChange = (value: string) => { setSearch(value); setPage(1); };
	const handleFilterChange = (key: FilterKey) => { setFilter(key); setPage(1); };
	const handleModalSuccess = () => { setModal({ open: false, customer: null }); refetch(); };

	const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
		const start = Math.max(1, Math.min(page - 2, totalPages - 4));
		return start + i;
	}).filter((p) => p >= 1 && p <= totalPages);

	// ── TanStack Table ─────────────────────────────────────────
	const columns = useMemo(() => [
		colHelper.display({
			id: "customer",
			header: tr.customer_col,
			cell: ({ row: { original: c } }) => (
				<div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
					<div style={{ width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,var(--primary-light),var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: 700 }}>
						{c.name.charAt(0)}
					</div>
					<div style={{ minWidth: 0 }}>
						<div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
							<p style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</p>
							{(c as any).customerType === 'wholesale' && (
								<span style={{ fontSize: "8px", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "1px 5px", borderRadius: "3px", flexShrink: 0 }}>W</span>
							)}
						</div>
						<p style={{ color: t.textFaint, fontSize: "10.5px", marginTop: "1px" }}>{String(c.createdAt).slice(0, 10)}</p>
					</div>
				</div>
			),
		}),
		colHelper.display({
			id: "contact",
			header: tr.contact,
			cell: ({ row: { original: c } }) => (
				<div style={{ minWidth: 0 }}>
					<p style={{ color: t.textSubtle, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email ?? "—"}</p>
					<p style={{ color: t.textMuted, fontSize: "11px", marginTop: "1px" }}>{c.phone ?? "—"}</p>
				</div>
			),
		}),
		colHelper.accessor("loyaltyPoints", {
			header: tr.loyalty_points,
			cell: ({ getValue }) => (
				<div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
					<span style={{ color: "#f59e0b", fontWeight: 700, fontSize: "13px" }}>{Number(getValue()).toLocaleString()}</span>
					<span style={{ color: t.textFaint, fontSize: "11px" }}>{tr.pts}</span>
				</div>
			),
		}),
		colHelper.accessor("isActive", {
			header: tr.status,
			cell: ({ getValue }) => (
				<span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", whiteSpace: "nowrap", background: getValue() ? "rgba(16,185,129,0.12)" : t.inputBg, color: getValue() ? "#10b981" : t.textFaint }}>
					{getValue() ? tr.active : tr.inactive}
				</span>
			),
		}),
		colHelper.display({
			id: "actions",
			header: "",
			cell: ({ row: { original: c } }) => (
				<div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }}>
					<button title="Address book" onClick={(e) => { e.stopPropagation(); setAddressBookCustomer(c); }} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<Icon name="location" size={11} />
					</button>
					<button onClick={(e) => { e.stopPropagation(); setModal({ open: true, customer: c }); }} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<Icon name="edit" size={11} />
					</button>
					{currentUser?.role !== 'cashier' && (
					<button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<Icon name="trash" size={11} />
					</button>
				)}
				</div>
			),
		}),
	// eslint-disable-next-line react-hooks/exhaustive-deps
	], [t, tr, currentUser]);

	const table = useReactTable({
		data: customers,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
			{/* Toolbar */}
			<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
				<div style={{ position: "relative", flex: 1, minWidth: "180px", maxWidth: "280px" }}>
					<div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}>
						<Icon name="search" size={13} />
					</div>
					<input
						value={search}
						onChange={(e) => handleSearchChange(e.target.value)}
						placeholder={tr.search_placeholder}
						style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px 9px 33px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
					/>
				</div>

				<div style={{ display: "flex", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "3px", gap: "2px" }}>
					{filterOptions.map((f) => (
						<button key={f.key} onClick={() => handleFilterChange(f.key)} style={{ padding: "6px 11px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: filter === f.key ? t.surface : "transparent", color: filter === f.key ? t.text : t.textMuted, boxShadow: filter === f.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
							{f.label}
						</button>
					))}
				</div>

				<button style={{ display: "flex", alignItems: "center", gap: "5px", padding: "9px 12px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
					<Icon name="download" size={13} />{tr.export}
				</button>
				<div style={{ marginLeft: "auto" }}>
					<button onClick={() => setModal({ open: true, customer: null })} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
						<Icon name="plus" size={13} />{tr.new_customer}
					</button>
				</div>
			</div>

			{/* Table */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
				<table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
					<colgroup>
						<col style={{ width: "30%" }} />
						<col style={{ width: "26%" }} />
						<col style={{ width: "18%" }} />
						<col style={{ width: "12%" }} />
						<col style={{ width: "14%" }} />
					</colgroup>

					<thead>
						{table.getHeaderGroups().map((hg) => (
							<tr key={hg.id} style={{ borderBottom: `1px solid ${t.borderMid}` }}>
								{hg.headers.map((header) => (
									<th key={header.id} style={{ padding: "10px 18px", textAlign: "left", color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>
										{flexRender(header.column.columnDef.header, header.getContext())}
									</th>
								))}
							</tr>
						))}
					</thead>

					<tbody>
						{isLoading ? (
							<tr><td colSpan={5} style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</td></tr>
						) : table.getRowCount() === 0 ? (
							<tr><td colSpan={5} style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>{tr.no_customers}</td></tr>
						) : table.getRowModel().rows.map((row) => (
							<tr
								key={row.id}
								onClick={() => setDetailCustomer(row.original)}
								style={{ borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s", cursor: "pointer", background: detailCustomer?.id === row.original.id ? t.surfaceHover : "transparent" }}
								onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
								onMouseLeave={(e) => (e.currentTarget.style.background = detailCustomer?.id === row.original.id ? t.surfaceHover : "transparent")}
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} style={{ padding: "13px 18px", verticalAlign: "middle", overflow: "hidden" }}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>

				{/* Pagination */}
				<div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {customers.length} {tr.of} {total}</span>
					{totalPages > 1 && (
						<div style={{ display: "flex", gap: "3px" }}>
							{pageButtons.map((p) => (
								<button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "var(--primary)" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>
									{p}
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Detail Drawer */}
			{detailCustomer && (
				<CustomerDrawer
					customer={detailCustomer}
					onClose={() => setDetailCustomer(null)}
					onEdit={() => { setModal({ open: true, customer: detailCustomer }); setDetailCustomer(null); }}
					onDeactivate={() => setDeleteId(detailCustomer.id)}
				/>
			)}

			{/* Delete confirm */}
			{deleteId && (
				<div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
					<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={() => setDeleteId(null)} />
					<div style={{ position: "relative", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "18px", padding: "22px", maxWidth: "340px", width: "calc(100% - 32px)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.2s ease" }}>
						<h3 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>{tr.delete_customer}</h3>
						<p style={{ color: t.textMuted, fontSize: "13px", marginTop: "8px", lineHeight: 1.5 }}>{tr.delete_warning}</p>
						<div style={{ display: "flex", gap: "9px", marginTop: "18px" }}>
							<button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
							<button onClick={() => deactivate.mutate({ id: deleteId })} disabled={deactivate.isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: deactivate.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: deactivate.isPending ? 0.7 : 1 }}>
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

			{addressBookCustomer && (
				<AddressBookModal
					customer={addressBookCustomer}
					onClose={() => setAddressBookCustomer(null)}
				/>
			)}
		</div>
	);
};
