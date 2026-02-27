import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";
import type { Customer } from "../../types";

interface Props {
	customer: Customer | null;
	onClose: () => void;
	onSuccess: () => void;
}

export const CustomerModal: React.FC<Props> = ({ customer, onClose, onSuccess }) => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);
	const isNew = !customer;

	const [form, setForm] = useState({
		name: customer?.name ?? "",
		email: customer?.email ?? "",
		phone: customer?.phone ?? "",
	});

	const create = trpc.customer.create.useMutation({ onSuccess });
	const update = trpc.customer.update.useMutation({ onSuccess });
	const isPending = create.isPending || update.isPending;

	const handleSubmit = () => {
		if (!form.name.trim()) return;
		if (isNew) {
			create.mutate({
				name: form.name.trim(),
				email: form.email.trim() || undefined,
				phone: form.phone.trim() || undefined,
			});
		} else {
			update.mutate({
				id: customer.id,
				data: {
					name: form.name.trim(),
					email: form.email.trim() || undefined,
					phone: form.phone.trim() || undefined,
				},
			});
		}
	};

	const fields: { label: string; key: keyof typeof form; icon: import("../../constants/icons").IconKey; ph: string; type?: string }[] = [
		{ label: tr.full_name, key: "name", icon: "customer", ph: "e.g. Aung Kyaw Zin" },
		{ label: tr.email_address, key: "email", icon: "mail", ph: "e.g. name@email.com" },
		{ label: tr.phone_number, key: "phone", icon: "phone", ph: "e.g. 09-4500-1234" },
	];

	return (
		<div
			style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
			onClick={onClose}
		>
			<div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					position: "relative", width: "100%", maxWidth: "430px", margin: "0 16px",
					background: t.surface, border: `1px solid ${t.borderStrong}`,
					borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
					overflow: "hidden", animation: "slideUp 0.22s ease",
				}}
			>
				{/* Header */}
				<div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
					<div>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px", letterSpacing: "-0.3px" }}>
							{isNew ? tr.new_customer : tr.edit_customer}
						</h2>
						<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>
							{isNew ? tr.add_customer_desc : customer?.name}
						</p>
					</div>
					<button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<Icon name="close" size={13} />
					</button>
				</div>

				{/* Form */}
				<div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "13px" }}>
					{fields.map((f) => (
						<div key={f.key}>
							<label style={{ color: t.textMuted, fontSize: "10.5px", fontWeight: 700, display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
								{f.label}
							</label>
							<div style={{ position: "relative" }}>
								<div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}>
									<Icon name={f.icon} size={13} />
								</div>
								<input
									value={form[f.key]}
									onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
									placeholder={f.ph}
									type={f.type ?? "text"}
									style={{
										width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`,
										borderRadius: "11px", padding: "9px 12px 9px 34px",
										color: t.text, fontSize: "13px", outline: "none",
										boxSizing: "border-box", fontFamily: "inherit",
									}}
								/>
							</div>
						</div>
					))}
				</div>

				{/* Footer */}
				<div style={{ padding: "0 22px 22px", display: "flex", gap: "10px" }}>
					<button
						onClick={onClose}
						disabled={isPending}
						style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}
					>
						{tr.cancel}
					</button>
					<button
						onClick={handleSubmit}
						disabled={isPending || !form.name.trim()}
						style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px var(--primary-35)", opacity: isPending || !form.name.trim() ? 0.7 : 1 }}
					>
						{isPending ? "..." : isNew ? tr.create_customer : tr.save_changes}
					</button>
				</div>
			</div>
		</div>
	);
};
