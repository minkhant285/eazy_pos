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

const PIE_FALLBACK = ["var(--primary-light)", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#ef4444"];

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
	const { data: todaySummary, isLoading: summaryLoading, isFetching: f1, refetch: r1 } =
		trpc.sale.dailySummary.useQuery({ locationId, date: today }, { enabled });

	const { data: yesterdaySummary, isFetching: f2, refetch: r2 } =
		trpc.sale.dailySummary.useQuery({ locationId, date: yesterday }, { enabled });

	const { data: customersData, isFetching: f3, refetch: r3 } = trpc.customer.list.useQuery({ pageSize: 1 });

	const { data: lowStockData, isFetching: f4, refetch: r4 } = trpc.product.list.useQuery(
		{ lowStock: true, locationId, pageSize: 1 }, { enabled },
	);

	const { data: profitData, isFetching: f5, refetch: r5 } =
		trpc.sale.profitSummary.useQuery({ locationId, fromDate: sevenDaysFrom, toDate }, { enabled });

	const monthStart = monthFrom + "T00:00:00.000Z";
	const { data: monthlyProfitData, isFetching: f6, refetch: r6 } =
		trpc.sale.profitSummary.useQuery({ locationId, fromDate: monthStart, toDate }, { enabled });

	const { data: expenseSummaryData, isFetching: f7, refetch: r7 } =
		trpc.expense.summary.useQuery({ fromDate: monthFrom, toDate: today });

	const isRefreshing = f1 || f2 || f3 || f4 || f5 || f6 || f7;
	const handleRefresh = () => { r1(); r2(); r3(); r4(); r5(); r6(); r7(); };

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

	// Monthly aggregates
	const monthlyRevenue     = monthlyProfitData?.reduce((s, r) => s + Number(r.revenue), 0) ?? 0;
	const monthlyCogs        = monthlyProfitData?.reduce((s, r) => s + Number(r.cogs),    0) ?? 0;
	const monthlyGrossProfit = monthlyRevenue - monthlyCogs;
	const monthlyNetProfit   = monthlyGrossProfit - totalExpenses;
	const monthlyNetMargin   = monthlyRevenue > 0 ? (monthlyNetProfit / monthlyRevenue) * 100 : 0;

	const fmt = (n: number) =>
		`${sym} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

	const fmtPct = (curr: number, prev: number) => {
		if (!prev) return null;
		const pct = ((curr - prev) / prev) * 100;
		return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0 };
	};

	const stats = [
		{ label: tr.todays_revenue, value: summaryLoading ? "…" : fmt(revenue), change: fmtPct(revenue, prevRevenue), grad: "linear-gradient(135deg,var(--primary-light),var(--primary))" },
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
				borderColor: "var(--primary-light)",
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
				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					{locations.length > 1 && (
						<select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={inp}>
							{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
						</select>
					)}
					<button
						onClick={handleRefresh}
						disabled={isRefreshing}
						title="Refresh all data"
						style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 13px", borderRadius: "10px", border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "12px", fontWeight: 600, cursor: isRefreshing ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isRefreshing ? 0.6 : 1, transition: "opacity 0.15s" }}
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isRefreshing ? "spin 0.8s linear infinite" : "none" }}>
							<path d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15" />
						</svg>
						{isRefreshing ? "Refreshing…" : "Refresh"}
					</button>
				</div>
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

			{/* Financial Overview */}
		<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "16px 20px" }}>
			<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px", marginBottom: "14px" }}>{tr.financial_overview}</h2>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>

				{/* Today */}
				<div style={{ paddingRight: "20px", borderRight: `1px solid ${t.borderMid}` }}>
					<p style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>{tr.today}</p>
					<div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
						{[
							{ label: tr.total_revenue,  val: revenue,    color: t.text },
							{ label: tr.total_cost,     val: todayCogs,  color: t.textMuted },
							{ label: tr.gross_profit,   val: todayGross, color: todayGross >= 0 ? "#10b981" : "#ef4444", bold: true },
						].map((row) => (
							<div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<span style={{ color: t.textFaint, fontSize: "12px" }}>{row.label}</span>
								<span style={{ color: row.color, fontSize: "12px", fontWeight: row.bold ? 700 : 500 }}>{fmt(row.val)}</span>
							</div>
						))}
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px", paddingTop: "7px", borderTop: `1px solid ${t.borderMid}` }}>
							<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.profit_margin}</span>
							<span style={{ color: todayGross >= 0 ? "#10b981" : "#ef4444", fontSize: "12px", fontWeight: 700 }}>{todayMargin.toFixed(1)}%</span>
						</div>
					</div>
				</div>

				{/* This Month */}
				<div style={{ paddingLeft: "20px" }}>
					<p style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>{tr.this_month}</p>
					<div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
						{[
							{ label: tr.total_revenue, val: monthlyRevenue,     color: t.text },
							{ label: tr.total_cost,    val: monthlyCogs,        color: t.textMuted },
							{ label: tr.gross_profit,  val: monthlyGrossProfit, color: monthlyGrossProfit >= 0 ? "#10b981" : "#ef4444" },
							{ label: tr.expenses,      val: totalExpenses,      color: totalExpenses > 0 ? "#ef4444" : t.textFaint },
						].map((row) => (
							<div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<span style={{ color: t.textFaint, fontSize: "12px" }}>{row.label}</span>
								<span style={{ color: row.color, fontSize: "12px", fontWeight: 500 }}>{fmt(row.val)}</span>
							</div>
						))}
						<div style={{ marginTop: "2px", paddingTop: "7px", borderTop: `1px solid ${t.borderMid}`, display: "flex", flexDirection: "column", gap: "7px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<span style={{ color: t.text, fontSize: "12px", fontWeight: 700 }}>{tr.net_profit}</span>
								<span style={{ color: monthlyNetProfit >= 0 ? "#10b981" : "#ef4444", fontSize: "13px", fontWeight: 800 }}>{fmt(monthlyNetProfit)}</span>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.net_margin}</span>
								<span style={{ color: monthlyNetProfit >= 0 ? "#10b981" : "#ef4444", fontSize: "12px", fontWeight: 700 }}>{monthlyNetMargin.toFixed(1)}%</span>
							</div>
						</div>
					</div>
				</div>

			</div>
		</div>

		{/* Revenue Chart + Expense Pie */}
			<div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>

				{/* Revenue Summary — Bar chart */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "14px 16px", minWidth: 0, overflow: "hidden" }}>
					{/* Card header */}
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
						<div>
							<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{tr.revenue_summary}</h2>
							<p style={{ color: t.textFaint, fontSize: "11px", marginTop: "1px" }}>Last 7 days</p>
						</div>
						{/* Today's summary pills */}
						<div style={{ display: "flex", gap: "8px" }}>
							{[
								{ label: tr.total_revenue, val: revenue,     color: "var(--primary-light)" },
								{ label: tr.total_cost,   val: todayCogs,   color: "#f59e0b" },
								{ label: tr.gross_profit, val: todayGross,  color: "#10b981" },
							].map((item) => (
								<div key={item.label} style={{ textAlign: "right" }}>
									<p style={{ color: t.textFaint, fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{item.label}</p>
									<p style={{ color: item.val < 0 ? "#ef4444" : t.text, fontWeight: 700, fontSize: "12px" }}>{fmt(item.val)}</p>
								</div>
							))}
							<div style={{ textAlign: "right", borderLeft: `1px solid ${t.borderMid}`, paddingLeft: "8px", marginLeft: "2px" }}>
								<p style={{ color: t.textFaint, fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{tr.profit_margin}</p>
								<p style={{ color: todayGross >= 0 ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: "12px" }}>{todayMargin.toFixed(1)}%</p>
							</div>
						</div>
					</div>

					{/* Chart.js Bar */}
					<div style={{ height: "200px", width: "100%", overflow: "hidden" }}>
						<Bar data={barData} options={barOptions} />
					</div>
				</div>

				{/* Expense Breakdown — Pie chart */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "14px 16px", minWidth: 0, overflow: "hidden" }}>
					<div style={{ marginBottom: "10px" }}>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{tr.expense_breakdown}</h2>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1px" }}>
							<p style={{ color: t.textFaint, fontSize: "11px" }}>{tr.this_month}</p>
							{totalExpenses > 0 && (
								<span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 700 }}>{fmt(totalExpenses)}</span>
							)}
						</div>
					</div>

					{expenseSummary.length === 0 ? (
						<div style={{ height: "162px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
								<path d="M21 12V7H5a2 2 0 010-4h14v4 M3 5v14a2 2 0 002 2h16v-4 M18 12a1 1 0 100 2 1 1 0 000-2z" />
							</svg>
							<p style={{ color: t.textFaint, fontSize: "12px" }}>{tr.no_expenses}</p>
						</div>
					) : (
						<div style={{ height: "162px" }}>
							<Pie data={pieData} options={pieOptions} />
						</div>
					)}
				</div>
			</div>

		</div>
	);
};
