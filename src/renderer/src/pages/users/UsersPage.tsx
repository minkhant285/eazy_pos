import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

type UserRole = "admin" | "manager" | "cashier";
interface UserForm { name: string; email: string; password: string; role: UserRole; }
const EMPTY: UserForm = { name: "", email: "", password: "", role: "cashier" };

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
	admin: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
	manager: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
	cashier: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
};

export const UsersPage: React.FC = () => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
	const [modal, setModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
	const [form, setForm] = useState<UserForm>(EMPTY);
	const [pwdModal, setPwdModal] = useState<{ open: boolean; id: string } | null>(null);
	const [newPwd, setNewPwd] = useState("");
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const PAGE_SIZE = 20;
	const { data, isLoading, refetch } = trpc.user.list.useQuery({ page, pageSize: PAGE_SIZE, search: search || undefined, role: roleFilter, isActive: undefined });
	const users = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(data?.totalPages ?? 1, 1);

	const createMut = trpc.user.create.useMutation({ onSuccess: () => { closeModal(); refetch(); } });
	const updateMut = trpc.user.update.useMutation({ onSuccess: () => { closeModal(); refetch(); } });
	const deactivateMut = trpc.user.deactivate.useMutation({ onSuccess: () => { setDeleteId(null); refetch(); } });
	const changePwdMut = trpc.user.changePassword.useMutation({ onSuccess: () => { setPwdModal(null); setNewPwd(""); } });

	const closeModal = () => { setModal({ open: false, id: null }); setForm(EMPTY); };
	const openCreate = () => { setForm(EMPTY); setModal({ open: true, id: null }); };
	const openEdit = (u: typeof users[0]) => {
		setForm({ name: u.name, email: u.email, password: "", role: (u.role as UserRole) ?? "cashier" });
		setModal({ open: true, id: u.id });
	};

	const handleSubmit = () => {
		if (!form.name.trim() || !form.email.trim()) return;
		if (!modal.id) {
			if (!form.password || form.password.length < 6) return;
			createMut.mutate({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
		} else {
			updateMut.mutate({ id: modal.id, data: { name: form.name.trim(), email: form.email.trim(), role: form.role } });
		}
	};

	const isPending = createMut.isPending || updateMut.isPending;
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
					<h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>Users</h1>
					<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{total} users</p>
				</div>
				<button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
					<Icon name="plus" size={13} /> New User
				</button>
			</div>

			{/* Filters */}
			<div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
				<div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "280px" }}>
					<div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}><Icon name="search" size={13} /></div>
					<input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." style={{ ...inputStyle, padding: "9px 12px 9px 33px" }} />
				</div>
				{([undefined, "admin", "manager", "cashier"] as (UserRole | undefined)[]).map((r) => {
					const label = r ?? "All";
					const active = roleFilter === r;
					return (
						<button key={String(r)} onClick={() => { setRoleFilter(r); setPage(1); }} style={{ padding: "7px 14px", borderRadius: "10px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: active ? "#7c3aed" : t.inputBg, color: active ? "#fff" : t.textMuted, textTransform: "capitalize" }}>
							{label}
						</button>
					);
				})}
			</div>

			{/* Table */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
				<div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 90px 80px 80px", gap: "10px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
					{["Name", "Email", "Role", "Status", ""].map((h, i) => (
						<span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
					))}
				</div>
				{isLoading ? (
					<div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
				) : users.length === 0 ? (
					<div style={{ padding: "56px", textAlign: "center" }}>
						<Icon name="users" size={32} style={{ color: t.textFaint, display: "block", margin: "0 auto 12px" }} />
						<p style={{ color: t.textFaint, fontSize: "13px" }}>No users found</p>
					</div>
				) : users.map((u) => {
					const role = (u.role ?? "cashier") as UserRole;
					const rc = ROLE_COLORS[role];
					return (
						<div key={u.id}
							style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 90px 80px 80px", gap: "10px", padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s" }}
							onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
							onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
								<div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "12px", fontWeight: 700, color: "#a78bfa" }}>
									{u.name.charAt(0).toUpperCase()}
								</div>
								<span style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
							</div>
							<span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</span>
							<span style={{ display: "inline-flex", alignSelf: "center", padding: "3px 9px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, background: rc.bg, color: rc.text, textTransform: "capitalize", width: "fit-content" }}>{role}</span>
							<span style={{ color: u.isActive ? "#10b981" : "#ef4444", fontSize: "11px", fontWeight: 600 }}>{u.isActive ? "Active" : "Inactive"}</span>
							<div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }}>
								<button onClick={() => openEdit(u)} title="Edit" style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={11} /></button>
								<button onClick={() => { setPwdModal({ open: true, id: u.id }); setNewPwd(""); }} title="Change password" style={{
									width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800,
									// color: t.textFaint

								} as React.CSSProperties}>
									PWD
								</button>
								{u.isActive && <button onClick={() => setDeleteId(u.id)} title="Deactivate" style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={11} /></button>}
							</div>
						</div>
					);
				})}
				<div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {users.length} {tr.of} {total}</span>
					{totalPages > 1 && (
						<div style={{ display: "flex", gap: "3px" }}>
							{pageButtons.map((p) => (
								<button key={p} onClick={() => setPage(p)} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "#7c3aed" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Deactivate Confirm */}
			{deleteId && (
				<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
					<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={() => setDeleteId(null)} />
					<div style={{ position: "relative", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "18px", padding: "22px", maxWidth: "340px", width: "calc(100% - 32px)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.2s ease" }}>
						<h3 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Deactivate User?</h3>
						<p style={{ color: t.textMuted, fontSize: "13px", marginTop: "8px", lineHeight: 1.5 }}>{tr.delete_warning}</p>
						<div style={{ display: "flex", gap: "9px", marginTop: "18px" }}>
							<button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
							<button onClick={() => deactivateMut.mutate({ id: deleteId })} disabled={deactivateMut.isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: deactivateMut.isPending ? 0.7 : 1 }}>
								{deactivateMut.isPending ? "..." : "Deactivate"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Change Password Modal */}
			{pwdModal?.open && (
				<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPwdModal(null)}>
					<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
					<div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "360px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", padding: "22px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.22s ease" }}>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px", marginBottom: "16px" }}>Change Password</h2>
						<div>
							<label style={labelStyle}>New Password (min 6 chars)</label>
							<input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="New password" style={inputStyle} />
						</div>
						<div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
							<button onClick={() => setPwdModal(null)} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
							<button onClick={() => changePwdMut.mutate({ id: pwdModal.id, newPassword: newPwd })} disabled={changePwdMut.isPending || newPwd.length < 6} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: changePwdMut.isPending || newPwd.length < 6 ? 0.7 : 1 }}>
								{changePwdMut.isPending ? "..." : "Update"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Create / Edit Modal */}
			{modal.open && (
				<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
					<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
					<div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "400px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden", animation: "slideUp 0.22s ease" }}>
						<div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
							<div>
								<h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>{modal.id ? "Edit User" : "New User"}</h2>
								<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>{modal.id ? "Update user information" : "Create a new system user"}</p>
							</div>
							<button onClick={closeModal} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} /></button>
						</div>
						<div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "12px" }}>
							<div>
								<label style={labelStyle}>Name *</label>
								<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" style={inputStyle} />
							</div>
							<div>
								<label style={labelStyle}>Email *</label>
								<input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@example.com" style={inputStyle} />
							</div>
							{!modal.id && (
								<div>
									<label style={labelStyle}>Password * (min 6 chars)</label>
									<input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" style={inputStyle} />
								</div>
							)}
							<div>
								<label style={labelStyle}>Role</label>
								<div style={{ display: "flex", gap: "6px" }}>
									{(["cashier", "manager", "admin"] as const).map((r) => {
										const rc = ROLE_COLORS[r];
										return (
											<button key={r} onClick={() => setForm((f) => ({ ...f, role: r }))} style={{ flex: 1, padding: "8px", borderRadius: "9px", border: `2px solid ${form.role === r ? rc.text : t.inputBorder}`, background: form.role === r ? rc.bg : "transparent", color: form.role === r ? rc.text : t.textMuted, fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize", transition: "all 0.15s" }}>
												{r}
											</button>
										);
									})}
								</div>
							</div>
						</div>
						<div style={{ padding: "0 22px 22px", display: "flex", gap: "10px" }}>
							<button onClick={closeModal} disabled={isPending} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{tr.cancel}</button>
							<button onClick={handleSubmit} disabled={isPending || !form.name.trim() || !form.email.trim() || (!modal.id && form.password.length < 6)} style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isPending || !form.name.trim() || !form.email.trim() || (!modal.id && form.password.length < 6) ? 0.7 : 1 }}>
								{isPending ? "..." : modal.id ? tr.save_changes : "Create"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
