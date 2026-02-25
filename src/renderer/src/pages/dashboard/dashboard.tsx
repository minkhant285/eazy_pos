import React, { useMemo } from "react";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { useAppStore } from "../../store/useAppStore";
import { trpc } from "../../trpc-client/trpc";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── Constants ─────────────────────────────────────────────────

const STAT_ICONS = [
	"M23 6l-9.5 9.5-5-5L1 18",
	"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
	"M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
	"M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16",
];

const METHOD_COLOR: Record<string, string> = {
	cash:           "#10b981",
	credit_card:    "#3b82f6",
	debit_card:     "#2563eb",
	qr_code:        "#8b5cf6",
	store_credit:   "#f59e0b",
	loyalty_points: "#ec4899",
};

const PIE_FALLBACK = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#ef4444"];

// ─────────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
	const t       = useAppStore((s) => s.theme);
	const tr      = useAppStore((s) => s.tr);
	const sym     = useAppStore((s) => s.currency.symbol);
	const setPage = useAppStore((s) => s.setPage);

	// ── UTC date helpers ──────────────────────────────────────
	const utcDate = (offset = 0) => {
		const d = new Date();
		d.setUTCDate(d.getUTCDate() - offset);
		return [
			d.getUTCFullYear(),
			String(d.getUTCMonth() + 1).padStart(2, "0"),
			String(d.getUTCDate()).padStart(2, "0"),
		].join("-");
	};

	const today     = useMemo(() => utcDate(0), []);
	const yesterday = useMemo(() => utcDate(1), []);

	// Last 7 day strings (oldest → newest)
	const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => utcDate(6 - i)), []);

	// First day of current month (plain YYYY-MM-DD for expense filter)
	const monthFrom = useMemo(() => {
		const d = new Date();
		return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
	}, []);

	const fromDate      = today + "T00:00:00.000Z";
	const toDate        = today + "T23:59:59.999Z";
	const sevenDaysFrom = last7Days[0] + "T00:00:00.000Z";

	// ── Location ─────────────────────────────────────────────
	const [locationId, setLocationId] = React.useState("");
	const { data: locationsData } = trpc.location.list.useQuery({ pageSize: 100 });
	const locations = locationsData?.data ?? [];

	React.useEffect(() => {
		if (!locationId && locations.length > 0) setLocationId(locations[0].id);
	}, [locations, locationId]);

	const enabled = !!locationId;

	// ── Queries ──────────────────────────────────────────────
	const { data: todaySummary, isLoading: summaryLoading, refetch: refetchSummary } =
		trpc.sale.dailySummary.useQuery({ locationId, date: today }, { enabled });

	const { data: yesterdaySummary } =
		trpc.sale.dailySummary.useQuery({ locationId, date: yesterday }, { enabled });

	const { data: customersData } = trpc.customer.list.useQuery({ pageSize: 1 });

	const { data: lowStockData } = trpc.product.list.useQuery(
		{ lowStock: true, locationId, pageSize: 1 }, { enabled },
	);

	const { data: recentSalesData, refetch: refetchSales, isFetching: salesFetching } =
		trpc.sale.list.useQuery({ locationId, fromDate, toDate, pageSize: 5, page: 1 }, { enabled });

	const { data: paymentData, refetch: refetchPayments } =
		trpc.sale.byPaymentMethod.useQuery({ locationId, fromDate, toDate }, { enabled });

	const { data: topProductsData, refetch: refetchTop } =
		trpc.sale.topProducts.useQuery({ locationId, fromDate, toDate, limit: 5 }, { enabled });

	const { data: profitData, refetch: refetchProfit } =
		trpc.sale.profitSummary.useQuery({ locationId, fromDate: sevenDaysFrom, toDate }, { enabled });

	const { data: expenseSummaryData } =
		trpc.expense.summary.useQuery({ fromDate: monthFrom, toDate: today, locationId: locationId || undefined }, { enabled });

	const handleRefresh = () => {
		refetchSales(); refetchPayments(); refetchTop(); refetchSummary(); refetchProfit();
	};

	// ── Derived ───────────────────────────────────────────────
	const revenue      = Number(todaySummary?.totalRevenue     ?? 0);
	const transactions = Number(todaySummary?.totalTransactions ?? 0);
	const prevRevenue  = Number(yesterdaySummary?.totalRevenue     ?? 0);
	const prevTx       = Number(yesterdaySummary?.totalTransactions ?? 0);

	const todayProfitRow = profitData?.find((r) => r.date === today);
	const todayCogs   = Number(todayProfitRow?.cogs        ?? 0);
	const todayGross  = Number(todayProfitRow?.grossProfit ?? 0);
	const todayMargin = revenue > 0 ? (todayGross / revenue) * 100 : 0;

	const expenseSummary  = expenseSummaryData ?? [];
	const totalExpenses   = expenseSummary.reduce((s, e) => s + Number(e.totalAmount), 0);

	const recentSales = recentSalesData?.data ?? [];
	const paymentRows = paymentData ?? [];
	const totalPayAmt = paymentRows.reduce((s, r) => s + Number(r.totalAmount), 0);
	const topProducts = topProductsData ?? [];

	const fmt = (n: number) =>
		`${sym} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

	const fmtPct = (curr: number, prev: number) => {
		if (!prev) return null;
		const pct = ((curr - prev) / prev) * 100;
		return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0 };
	};

	const stats = [
		{ label: tr.todays_revenue, value: summaryLoading ? "…" : fmt(revenue), change: fmtPct(revenue, prevRevenue), grad: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
		{ label: tr.total_customers, value: (customersData?.total ?? 0).toLocaleString(), change: null as { text: string; up: boolean } | null, grad: "linear-gradient(135deg,#06b6d4,#2563eb)" },
		{ label: tr.transactions, value: summaryLoading ? "…" : transactions.toLocaleString(), change: fmtPct(transactions, prevTx), grad: "linear-gradient(135deg,#10b981,#0d9488)" },
		{ label: tr.low_stock_alerts, value: (lowStockData?.total ?? 0).toLocaleString(), change: null as { text: string; up: boolean } | null, grad: "linear-gradient(135deg,#f59e0b,#ea580c)" },
	];

	// ── Chart.js data ────────────────────────────────────────

	// Bar chart — last 7 days revenue vs profit
	const chartDays = last7Days.map((date) => {
		const row = profitData?.find((r) => r.date === date);
		return {
			label: new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short" }),
			revenue: Number(row?.revenue ?? 0),
			profit:  Number(row?.grossProfit ?? 0),
		};
	});

	const barData = {
		labels: chartDays.map((d) => d.label),
		datasets: [
			{
				label: tr.total_revenue,
				data: chartDays.map((d) => d.revenue),
				backgroundColor: "rgba(139, 92, 246, 0.75)",
				borderColor: "#8b5cf6",
				borderWidth: 1,
				borderRadius: 4,
				borderSkipped: false as const,
			},
			{
				label: tr.gross_profit,
				data: chartDays.map((d) => d.profit),
				backgroundColor: "rgba(16, 185, 129, 0.75)",
				borderColor: "#10b981",
				borderWidth: 1,
				borderRadius: 4,
				borderSkipped: false as const,
			},
		],
	};

	const barOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				labels: { color: t.textMuted, font: { family: "DM Sans, sans-serif", size: 11 }, boxWidth: 12, padding: 16 },
			},
			tooltip: {
				callbacks: {
					label: (ctx: any) => ` ${sym} ${Number(ctx.raw).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
				},
			},
		},
		scales: {
			x: {
				grid: { color: t.borderMid },
				ticks: { color: t.textFaint, font: { family: "DM Sans, sans-serif", size: 10 } },
			},
			y: {
				grid: { color: t.borderMid },
				ticks: {
					color: t.textFaint,
					font: { family: "DM Sans, sans-serif", size: 10 },
					callback: (v: any) => `${sym}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
				},
			},
		},
	};

	// Pie chart — expenses by category this month
	const pieData = {
		labels: expenseSummary.map((e) => e.categoryName ?? "Other"),
		datasets: [{
			data: expenseSummary.map((e) => Number(e.totalAmount)),
			backgroundColor: expenseSummary.map((e, i) => e.categoryColor ?? PIE_FALLBACK[i % PIE_FALLBACK.length]),
			borderColor: t.surface,
			borderWidth: 2,
		}],
	};

	const pieOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: "bottom" as const,
				labels: { color: t.textMuted, font: { family: "DM Sans, sans-serif", size: 11 }, padding: 10, boxWidth: 12 },
			},
			tooltip: {
				callbacks: {
					label: (ctx: any) => ` ${sym} ${Number(ctx.raw).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
				},
			},
		},
	};

	// ── Misc helpers ─────────────────────────────────────────
	const inp: React.CSSProperties = {
		background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "10px",
		padding: "7px 12px", color: t.text, fontSize: "12px", outline: "none", fontFamily: "inherit",
	};

	const getMethodLabel = (m: string) =>
		({ cash: tr.cash, credit_card: "Credit Card", debit_card: "Debit Card", qr_code: tr.qr_code, store_credit: "Store Credit", loyalty_points: "Loyalty Points" } as Record<string, string>)[m] ?? m;

	const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

	// ─────────────────────────────────────────────────────────

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "18px", animation: "slideUp 0.2s ease" }}>

			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
				<div>
					<h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>{tr.dashboard}</h1>
					<p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{dateLabel}</p>
				</div>
				{locations.length > 1 && (
					<select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={inp}>
						{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
					</select>
				)}
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
							{s.change ? (
								<>
									<span style={{ fontSize: "11px", fontWeight: 700, color: s.change.up ? "#10b981" : "#ef4444" }}>
										{s.change.up ? "↑" : "↓"} {s.change.text}
									</span>
									<span style={{ fontSize: "11px", color: t.textFaint }}>{tr.vs_yesterday}</span>
								</>
							) : (
								<span style={{ fontSize: "11px", color: t.textFaint }}>—</span>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Revenue Chart + Expense Pie */}
			<div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>

				{/* Revenue Summary — Bar chart */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "18px" }}>
					{/* Card header */}
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
						<div>
							<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{tr.revenue_summary}</h2>
							<p style={{ color: t.textFaint, fontSize: "11px", marginTop: "2px" }}>Last 7 days</p>
						</div>
						{/* Today's summary pills */}
						<div style={{ display: "flex", gap: "8px" }}>
							{[
								{ label: tr.total_revenue, val: revenue,     color: "#8b5cf6" },
								{ label: tr.total_cost,   val: todayCogs,   color: "#f59e0b" },
								{ label: tr.gross_profit, val: todayGross,  color: "#10b981" },
							].map((item) => (
								<div key={item.label} style={{ textAlign: "right" }}>
									<p style={{ color: t.textFaint, fontSize: "9.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{item.label}</p>
									<p style={{ color: item.val < 0 ? "#ef4444" : t.text, fontWeight: 700, fontSize: "12.5px" }}>{fmt(item.val)}</p>
								</div>
							))}
							<div style={{ textAlign: "right", borderLeft: `1px solid ${t.borderMid}`, paddingLeft: "8px", marginLeft: "2px" }}>
								<p style={{ color: t.textFaint, fontSize: "9.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{tr.profit_margin}</p>
								<p style={{ color: todayGross >= 0 ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: "12.5px" }}>{todayMargin.toFixed(1)}%</p>
							</div>
						</div>
					</div>

					{/* Chart.js Bar */}
					<div style={{ height: "200px" }}>
						<Bar data={barData} options={barOptions} />
					</div>
				</div>

				{/* Expense Breakdown — Pie chart */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "18px" }}>
					<div style={{ marginBottom: "14px" }}>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{tr.expense_breakdown}</h2>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
							<p style={{ color: t.textFaint, fontSize: "11px" }}>{tr.this_month}</p>
							{totalExpenses > 0 && (
								<span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 700 }}>{fmt(totalExpenses)}</span>
							)}
						</div>
					</div>

					{expenseSummary.length === 0 ? (
						<div style={{ height: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={t.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
								<path d="M21 12V7H5a2 2 0 010-4h14v4 M3 5v14a2 2 0 002 2h16v-4 M18 12a1 1 0 100 2 1 1 0 000-2z" />
							</svg>
							<p style={{ color: t.textFaint, fontSize: "12px" }}>{tr.no_expenses}</p>
						</div>
					) : (
						<div style={{ height: "220px" }}>
							<Pie data={pieData} options={pieOptions} />
						</div>
					)}
				</div>
			</div>

			{/* Bottom row */}
			<div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>

				{/* Recent transactions */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
					<div style={{ padding: "14px 18px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{tr.recent_transactions}</h2>
						<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
							<button
								onClick={handleRefresh}
								disabled={salesFetching}
								style={{ display: "flex", alignItems: "center", gap: "4px", color: t.textFaint, fontSize: "11px", fontWeight: 500, background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: "7px", padding: "4px 9px", cursor: salesFetching ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: salesFetching ? 0.6 : 1 }}
							>
								<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
								</svg>
								{salesFetching ? "…" : "Refresh"}
							</button>
							<button onClick={() => setPage("sales")} style={{ color: "#8b5cf6", fontSize: "12px", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
								{tr.view_all}
							</button>
						</div>
					</div>

					{recentSales.length === 0 ? (
						<div style={{ padding: "40px 18px", textAlign: "center", color: t.textFaint, fontSize: "12px" }}>
							{enabled ? "No sales today" : "Loading…"}
						</div>
					) : recentSales.map((s) => (
						<div key={s.id} style={{ padding: "11px 18px", display: "flex", alignItems: "center", gap: "12px", borderBottom: `1px solid ${t.borderMid}` }}>
							<div style={{ flex: 1, minWidth: 0 }}>
								<p style={{ color: t.text, fontSize: "13px", fontWeight: 500 }}>{s.customerName ?? "Walk-in"}</p>
								<p style={{ color: t.textFaint, fontSize: "11px", marginTop: "1px" }}>{s.receiptNo} · {String(s.createdAt).slice(11, 16)}</p>
							</div>
							<span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: s.status === "completed" ? t.inputBg : "rgba(239,68,68,0.12)", color: s.status === "completed" ? t.textMuted : "#ef4444" }}>
								{(tr as Record<string, string>)[s.status] ?? s.status}
							</span>
							<p style={{ color: t.text, fontWeight: 700, fontSize: "13px", minWidth: "80px", textAlign: "right" }}>{fmt(Number(s.totalAmount))}</p>
						</div>
					))}
				</div>

				{/* Payment methods + Top products */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "18px" }}>
					<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px", marginBottom: "18px" }}>{tr.payment_methods}</h2>

					{paymentRows.length === 0 ? (
						<p style={{ color: t.textFaint, fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
							{enabled ? "No payments today" : "—"}
						</p>
					) : paymentRows.map((p) => {
						const pct   = totalPayAmt > 0 ? Math.round((Number(p.totalAmount) / totalPayAmt) * 100) : 0;
						const color = METHOD_COLOR[p.method] ?? "#8b5cf6";
						return (
							<div key={p.method} style={{ marginBottom: "14px" }}>
								<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
									<span style={{ color: t.textMuted, fontSize: "12px" }}>{getMethodLabel(p.method)}</span>
									<span style={{ color: t.text, fontSize: "12px", fontWeight: 600 }}>{fmt(Number(p.totalAmount))}</span>
								</div>
								<div style={{ height: "5px", background: t.inputBg, borderRadius: "3px", overflow: "hidden" }}>
									<div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px" }} />
								</div>
							</div>
						);
					})}

					<div style={{ marginTop: "22px", paddingTop: "18px", borderTop: `1px solid ${t.borderMid}` }}>
						<h3 style={{ color: t.textMuted, fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
							{tr.top_products}
						</h3>
						{topProducts.length === 0 ? (
							<p style={{ color: t.textFaint, fontSize: "12px" }}>{enabled ? "No data today" : "—"}</p>
						) : topProducts.map((p, i) => (
							<div key={p.productId} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "9px" }}>
								<span style={{ color: t.textFaint, fontSize: "11px", width: "14px" }}>{i + 1}</span>
								<span style={{ color: t.textSubtle, fontSize: "12px", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{p.productName}</span>
								<span style={{ color: t.textFaint, fontSize: "11px" }}>{Number(p.totalQtySold)} {tr.sold}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
