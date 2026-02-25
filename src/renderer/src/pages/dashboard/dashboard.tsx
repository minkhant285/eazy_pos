import React from "react";
import { useAppStore } from "../../store/useAppStore";
import type { RecentSale } from "../../types";

const METHOD_COLOR: Record<string, string> = { cash: "#10b981", card: "#3b82f6", qr_code: "#8b5cf6" };
const METHOD_BG: Record<string, string> = { cash: "rgba(16,185,129,0.12)", card: "rgba(59,130,246,0.12)", qr_code: "rgba(139,92,246,0.12)" };
const STAT_ICONS = [
	"M23 6l-9.5 9.5-5-5L1 18",
	"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
	"M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
	"M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16",
];

export const DashboardPage: React.FC = () => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);
	const sym = useAppStore((s) => s.currency.symbol);

	const recentSales: RecentSale[] = [
		{ id: "RCP-240001", customer: "Aung Kyaw Zin", amount: `${sym} 4,200`, method: "cash", time: "09:14 AM", status: "completed" },
		{ id: "RCP-240002", customer: "Walk-in", amount: `${sym} 1,550`, method: "qr_code", time: "10:02 AM", status: "completed" },
		{ id: "RCP-240003", customer: "Nwe Nwe Aye", amount: `${sym} 12,800`, method: "card", time: "10:45 AM", status: "completed" },
		{ id: "RCP-240004", customer: "Su Su Hlaing", amount: `${sym} 320`, method: "cash", time: "11:30 AM", status: "voided" },
		{ id: "RCP-240005", customer: "Zaw Lin Htut", amount: `${sym} 8,750`, method: "card", time: "12:15 PM", status: "completed" },
	];

	const stats = [
		{ label: tr.todays_revenue, value: `${sym} 84,320`, change: "+12.4%", up: true, grad: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
		{ label: tr.total_customers, value: "1,284", change: "+5.1%", up: true, grad: "linear-gradient(135deg,#06b6d4,#2563eb)" },
		{ label: tr.transactions, value: "342", change: "+8.7%", up: true, grad: "linear-gradient(135deg,#10b981,#0d9488)" },
		{ label: tr.low_stock_alerts, value: "17", change: "-3", up: false, grad: "linear-gradient(135deg,#f59e0b,#ea580c)" },
	];

	const payments = [
		{ label: tr.cash, pct: 48, amt: `${sym} 40,474`, color: "#10b981" },
		{ label: tr.card, pct: 35, amt: `${sym} 29,512`, color: "#3b82f6" },
		{ label: tr.qr_code, pct: 17, amt: `${sym} 14,334`, color: "#8b5cf6" },
	];

	const topProducts = [
		{ name: "Jasmine Rice 5kg", sold: 42 },
		{ name: "Fish Sauce 700ml", sold: 38 },
		{ name: "Coconut Milk 400ml", sold: 31 },
	];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
			{/* Header */}
			<div>
				<h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>{tr.dashboard}</h1>
				<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>Monday, 23 February 2026</p>
			</div>

			{/* Stat cards */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
				{stats.map((s, i) => (
					<div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "18px", position: "relative", overflow: "hidden" }}>
						<div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", background: s.grad, opacity: 0.1, borderRadius: "50%", filter: "blur(18px)" }} />
						<div style={{ width: "34px", height: "34px", borderRadius: "10px", background: s.grad, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
								<path d={STAT_ICONS[i]} />
							</svg>
						</div>
						<p style={{ color: t.textMuted, fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</p>
						<p style={{ color: t.text, fontSize: "22px", fontWeight: 800, marginTop: "2px", letterSpacing: "-0.5px" }}>{s.value}</p>
						<div style={{ display: "flex", gap: "4px", alignItems: "center", marginTop: "5px" }}>
							<span style={{ fontSize: "11px", fontWeight: 700, color: s.up ? "#10b981" : "#f59e0b" }}>{s.up ? "↑" : "↓"} {s.change}</span>
							<span style={{ fontSize: "11px", color: t.textFaint }}>{tr.vs_yesterday}</span>
						</div>
					</div>
				))}
			</div>

			{/* Bottom row */}
			<div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
				{/* Recent transactions */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
					<div style={{ padding: "14px 18px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{tr.recent_transactions}</h2>
						<button style={{ color: "#8b5cf6", fontSize: "12px", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>{tr.view_all}</button>
					</div>
					{recentSales.map((s) => (
						<div key={s.id} style={{ padding: "11px 18px", display: "flex", alignItems: "center", gap: "12px", borderBottom: `1px solid ${t.borderMid}` }}>
							<div style={{ flex: 1, minWidth: 0 }}>
								<p style={{ color: t.text, fontSize: "13px", fontWeight: 500 }}>{s.customer}</p>
								<p style={{ color: t.textFaint, fontSize: "11px", marginTop: "1px" }}>{s.id} · {s.time}</p>
							</div>
							<span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: METHOD_BG[s.method], color: METHOD_COLOR[s.method] }}>
								{tr[s.method as keyof typeof tr] as string}
							</span>
							<span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: s.status === "completed" ? t.inputBg : "rgba(239,68,68,0.12)", color: s.status === "completed" ? t.textMuted : "#ef4444" }}>
								{tr[s.status as keyof typeof tr] as string}
							</span>
							<p style={{ color: t.text, fontWeight: 700, fontSize: "13px", minWidth: "70px", textAlign: "right" }}>{s.amount}</p>
						</div>
					))}
				</div>

				{/* Right panel */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "18px" }}>
					<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px", marginBottom: "18px" }}>{tr.payment_methods}</h2>
					{payments.map((p) => (
						<div key={p.label} style={{ marginBottom: "14px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
								<span style={{ color: t.textMuted, fontSize: "12px" }}>{p.label}</span>
								<span style={{ color: t.text, fontSize: "12px", fontWeight: 600 }}>{p.amt}</span>
							</div>
							<div style={{ height: "5px", background: t.inputBg, borderRadius: "3px", overflow: "hidden" }}>
								<div style={{ height: "100%", width: `${p.pct}%`, background: p.color, borderRadius: "3px" }} />
							</div>
						</div>
					))}

					<div style={{ marginTop: "22px", paddingTop: "18px", borderTop: `1px solid ${t.borderMid}` }}>
						<h3 style={{ color: t.textMuted, fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>{tr.top_products}</h3>
						{topProducts.map((p, i) => (
							<div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "9px" }}>
								<span style={{ color: t.textFaint, fontSize: "11px", width: "14px" }}>{i + 1}</span>
								<span style={{ color: t.textSubtle, fontSize: "12px", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{p.name}</span>
								<span style={{ color: t.textFaint, fontSize: "11px" }}>{p.sold} {tr.sold}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
