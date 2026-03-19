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
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useAppStore } from "../../store/useAppStore";
import { trpc } from "../../trpc-client/trpc";
import { AppSelect } from "../../components/ui/AppSelect";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── Constants ─────────────────────────────────────────────────

const STAT_ICONS = [
	"M23 6l-9.5 9.5-5-5L1 18",
	"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M9 12h6 M9 16h4",
	"M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
	"M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16",
];

const PIE_FALLBACK = ["var(--primary-light)", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#ef4444"];

type RangePreset = "today" | "yesterday" | "this_week" | "this_month" | "custom";

const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
	{ key: "today",      label: "Today" },
	{ key: "yesterday",  label: "Yesterday" },
	{ key: "this_week",  label: "This Week" },
	{ key: "this_month", label: "This Month" },
	{ key: "custom",     label: "Custom Range" },
];

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


	// ── Date range state ─────────────────────────────────────
	const [rangePreset, setRangePreset] = React.useState<RangePreset>("this_month");
	const [customFrom,  setCustomFrom]  = React.useState("");
	const [customTo,    setCustomTo]    = React.useState("");
	const [showPicker,  setShowPicker]  = React.useState(false);
	const pickerRef = React.useRef<HTMLDivElement>(null);

	// Picker internal state (Date objects)
	const [pickerRange, setPickerRange] = React.useState([{
		startDate: new Date(), endDate: new Date(), key: "selection",
	}]);

	// Close picker on outside click
	React.useEffect(() => {
		if (!showPicker) return;
		const handler = (e: MouseEvent) => {
			if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
				setShowPicker(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [showPicker]);

	const { rangeFrom, rangeTo, rangeLabel } = useMemo(() => {
		const now = new Date();
		const yr  = now.getUTCFullYear();
		const mo  = now.getUTCMonth();

		if (rangePreset === "today")
			return { rangeFrom: today, rangeTo: today, rangeLabel: "Today" };

		if (rangePreset === "yesterday")
			return { rangeFrom: yesterday, rangeTo: yesterday, rangeLabel: "Yesterday" };

		if (rangePreset === "this_week") {
			const day  = now.getUTCDay();
			const diff = (day + 6) % 7; // days since Monday
			const mon  = new Date(Date.UTC(yr, mo, now.getUTCDate() - diff));
			return { rangeFrom: mon.toISOString().slice(0, 10), rangeTo: today, rangeLabel: "This Week" };
		}
		if (rangePreset === "this_month") {
			const from = `${yr}-${String(mo + 1).padStart(2, "0")}-01`;
			return { rangeFrom: from, rangeTo: today, rangeLabel: "This Month" };
		}
		// custom
		const from = customFrom || today;
		const to   = customTo   || today;
		return { rangeFrom: from, rangeTo: to, rangeLabel: `${from} – ${to}` };
	}, [rangePreset, customFrom, customTo, today]);

	// ── Chart year state (Revenue Summary bar chart) ─────────
	const currentYear = new Date().getFullYear();
	const [chartYear, setChartYear] = React.useState(currentYear);

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

	const { data: purchaseSummaryData, isFetching: f3, refetch: r3 } =
		trpc.purchaseOrder.summary.useQuery({
			fromDate: rangeFrom + " 00:00:00",
			toDate:   rangeTo   + " 23:59:59",
		});

	const lowStockThreshold = useAppStore((s) => s.lowStockThreshold);
	const { data: lowStockData, isFetching: f4, refetch: r4 } =
		trpc.stock.lowStockCount.useQuery({ locationId, threshold: lowStockThreshold }, { enabled });

	// Ranged profit (Financial Overview range column)
	const { data: rangedProfitData, isFetching: f6, refetch: r6 } =
		trpc.sale.profitSummary.useQuery(
			{ locationId, fromDate: rangeFrom + " 00:00:00", toDate: rangeTo + " 23:59:59" },
			{ enabled }
		);

	const { data: expenseSummaryData, isFetching: f7, refetch: r7 } =
		trpc.expense.summary.useQuery({ fromDate: rangeFrom, toDate: rangeTo });

	// Year profit query — for Revenue Summary bar chart (Jan–Dec)
	const { data: yearProfitData, isFetching: f8, refetch: r8 } =
		trpc.sale.profitSummary.useQuery(
			{ locationId, fromDate: `${chartYear}-01-01 00:00:00`, toDate: `${chartYear}-12-31 23:59:59` },
			{ enabled }
		);

	const { data: debtData, isFetching: f9, refetch: r9 } =
		trpc.accounting.debtSummary.useQuery();

	const isRefreshing = f1 || f2 || f3 || f4 || f6 || f7 || f8 || f9;
	const handleRefresh = () => { r1(); r2(); r3(); r4(); r6(); r7(); r8(); r9(); };

	// ── Derived ───────────────────────────────────────────────
	const revenue      = Number(todaySummary?.totalRevenue     ?? 0);
	const transactions = Number(todaySummary?.totalTransactions ?? 0);
	const prevRevenue  = Number(yesterdaySummary?.totalRevenue     ?? 0);
	const prevTx       = Number(yesterdaySummary?.totalTransactions ?? 0);

	const expenseSummary = expenseSummaryData ?? [];
	const totalExpenses  = expenseSummary.reduce((s, e) => s + Number(e.totalAmount), 0);

	// Range aggregates
	const rangeRevenue     = rangedProfitData?.reduce((s, r) => s + Number(r.revenue), 0) ?? 0;
	const rangeCogs        = rangedProfitData?.reduce((s, r) => s + Number(r.cogs),    0) ?? 0;
	const rangeGrossProfit = rangeRevenue - rangeCogs;
	const rangeNetProfit   = rangeGrossProfit - totalExpenses;
	const rangeNetMargin   = rangeRevenue > 0 ? (rangeNetProfit / rangeRevenue) * 100 : 0;

	const fmt = (n: number) =>
		`${sym} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

	const fmtPct = (curr: number, prev: number) => {
		if (!prev) return null;
		const pct = ((curr - prev) / prev) * 100;
		return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0 };
	};

	const lowStockCount = lowStockData?.count ?? 0;
	const stats = [
		{ label: tr.todays_revenue, value: summaryLoading ? "…" : fmt(revenue), change: fmtPct(revenue, prevRevenue), grad: "linear-gradient(135deg,var(--primary-light),var(--primary))" },
		{ label: tr.total_purchases, value: fmt(Number(purchaseSummaryData?.totalAmount ?? 0)), change: null as { text: string; up: boolean } | null, grad: "linear-gradient(135deg,#06b6d4,#2563eb)" },
		{ label: tr.transactions, value: summaryLoading ? "…" : transactions.toLocaleString(), change: fmtPct(transactions, prevTx), grad: "linear-gradient(135deg,#10b981,#0d9488)" },
		{ label: tr.low_stock_alerts, value: lowStockCount.toLocaleString(), change: null as { text: string; up: boolean } | null, grad: "linear-gradient(135deg,#f59e0b,#ea580c)" },
	];

	// ── Chart.js data — monthly Jan–Dec ─────────────────────
	const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

	const monthlyChartData = useMemo(() => MONTHS.map((label, i) => {
		const prefix = `${chartYear}-${String(i + 1).padStart(2, "0")}-`;
		const rows = yearProfitData?.filter((r) => r.date.startsWith(prefix)) ?? [];
		return {
			label,
			revenue: rows.reduce((s, r) => s + Number(r.revenue), 0),
			profit:  rows.reduce((s, r) => s + Number(r.grossProfit), 0),
		};
	}), [yearProfitData, chartYear]);

	const yearRevenue = monthlyChartData.reduce((s, m) => s + m.revenue, 0);
	const yearCogs    = yearProfitData?.reduce((s, r) => s + Number(r.cogs), 0) ?? 0;
	const yearGross   = yearRevenue - yearCogs;

	const barData = {
		labels: MONTHS,
		datasets: [
			{
				label: tr.total_revenue,
				data: monthlyChartData.map((d) => d.revenue),
				backgroundColor: "rgba(139, 92, 246, 0.75)",
				borderColor: "var(--primary-light)",
				borderWidth: 1,
				borderRadius: 4,
				borderSkipped: false as const,
			},
			{
				label: tr.gross_profit,
				data: monthlyChartData.map((d) => d.profit),
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
						<AppSelect
							value={locationId}
							onChange={setLocationId}
							options={locations.map((l) => ({ value: l.id, label: l.name }))}
							minWidth={160}
						/>
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

			{/* Debt Overview */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

				{/* Customer Debt */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "18px 20px" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
						<div>
							<p style={{ color: t.textFaint, fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer Debt</p>
							<p style={{ color: "#f59e0b", fontSize: "22px", fontWeight: 800, marginTop: "2px", letterSpacing: "-0.5px" }}>{fmt(debtData?.customerDebt ?? 0)}</p>
							<p style={{ color: t.textFaint, fontSize: "11px", marginTop: "2px" }}>{debtData?.customerDebtCount ?? 0} customer{(debtData?.customerDebtCount ?? 0) !== 1 ? "s" : ""} owe you</p>
						</div>
						<div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#f59e0b,#ea580c)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75" /></svg>
						</div>
					</div>
					{(debtData?.topCustomers?.length ?? 0) > 0 ? (
						<div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
							{debtData!.topCustomers.map((c, i) => (
								<div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
										<span style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, width: "14px", flexShrink: 0 }}>{i + 1}</span>
										<span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
									</div>
									<span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 700, flexShrink: 0, marginLeft: "8px" }}>{sym}{c.debt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
								</div>
							))}
						</div>
					) : (
						<p style={{ color: t.textFaint, fontSize: "12px" }}>No outstanding customer debts</p>
					)}
					<button onClick={() => setPage("customers")} style={{ marginTop: "14px", width: "100%", padding: "8px", borderRadius: "9px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>View Customers →</button>
				</div>

				{/* Supplier Debt */}
				<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "18px 20px" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
						<div>
							<p style={{ color: t.textFaint, fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Supplier Debt</p>
							<p style={{ color: "#ef4444", fontSize: "22px", fontWeight: 800, marginTop: "2px", letterSpacing: "-0.5px" }}>{fmt(debtData?.supplierDebt ?? 0)}</p>
							<p style={{ color: t.textFaint, fontSize: "11px", marginTop: "2px" }}>You owe {debtData?.supplierDebtCount ?? 0} supplier{(debtData?.supplierDebtCount ?? 0) !== 1 ? "s" : ""}</p>
						</div>
						<div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#ef4444,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0" /></svg>
						</div>
					</div>
					{(debtData?.topSuppliers?.length ?? 0) > 0 ? (
						<div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
							{debtData!.topSuppliers.map((s, i) => (
								<div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
										<span style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, width: "14px", flexShrink: 0 }}>{i + 1}</span>
										<span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
									</div>
									<span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 700, flexShrink: 0, marginLeft: "8px" }}>{sym}{s.debt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
								</div>
							))}
						</div>
					) : (
						<p style={{ color: t.textFaint, fontSize: "12px" }}>No outstanding supplier debts</p>
					)}
					<button onClick={() => setPage("suppliers")} style={{ marginTop: "14px", width: "100%", padding: "8px", borderRadius: "9px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>View Suppliers →</button>
				</div>
			</div>

			{/* Financial Overview + Expense side by side */}
			<div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", alignItems: "stretch" }}>

			{/* Financial Overview */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "16px 20px" }}>

				{/* Card header */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
					<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{tr.financial_overview}</h2>

					{/* Date range select + custom picker */}
					<div style={{ position: "relative" }} ref={pickerRef}>
						<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							<AppSelect
								value={rangePreset}
								onChange={(v) => {
									setRangePreset(v as RangePreset);
									setShowPicker(v === "custom");
								}}
								options={RANGE_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
								isSearchable={false}
								minWidth={140}
							/>
							{rangePreset === "custom" && (
								<button
									onClick={() => setShowPicker((v) => !v)}
									style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 10px", borderRadius: "10px", border: `1px solid ${showPicker ? "var(--primary)" : t.inputBorder}`, background: showPicker ? "var(--primary-10)" : t.inputBg, color: showPicker ? "var(--primary-light)" : t.textMuted, fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
								>
									<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
									</svg>
									{customFrom && customTo ? `${customFrom} – ${customTo}` : "Pick dates…"}
								</button>
							)}
						</div>

						{/* DateRange popup */}
						{showPicker && rangePreset === "custom" && (
							<div style={{
								position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 1000,
								borderRadius: "14px", overflow: "hidden",
								boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
								border: `1px solid ${t.borderMid}`,
							}}>
								<style>{`
									.rdr-dashboard-picker .rdrCalendarWrapper { background: ${t.surface}; color: ${t.text}; }
									.rdr-dashboard-picker .rdrDateDisplayWrapper { background: ${t.inputBg}; }
									.rdr-dashboard-picker .rdrDateDisplayItem { background: ${t.inputBg}; border-color: ${t.inputBorder}; }
									.rdr-dashboard-picker .rdrDateDisplayItem input { color: ${t.text}; background: transparent; }
									.rdr-dashboard-picker .rdrMonthAndYearWrapper { background: ${t.surface}; }
									.rdr-dashboard-picker .rdrMonthAndYearPickers select { background: ${t.inputBg}; color: ${t.text}; border-color: ${t.inputBorder}; border-radius: 6px; }
									.rdr-dashboard-picker .rdrDayNumber span { color: ${t.text}; }
									.rdr-dashboard-picker .rdrDayPassive .rdrDayNumber span { color: ${t.textFaint}; }
									.rdr-dashboard-picker .rdrWeekDay { color: ${t.textMuted}; }
									.rdr-dashboard-picker .rdrNextPrevButton { background: ${t.inputBg}; border-radius: 6px; }
									.rdr-dashboard-picker .rdrPprevButton i { border-color: transparent ${t.textMuted} transparent transparent; }
									.rdr-dashboard-picker .rdrNextButton i { border-color: transparent transparent transparent ${t.textMuted}; }
									.rdr-dashboard-picker .rdrDayToday .rdrDayNumber span::after { background: var(--primary); }
									.rdr-dashboard-picker .rdrSelected, .rdr-dashboard-picker .rdrInRange, .rdr-dashboard-picker .rdrStartEdge, .rdr-dashboard-picker .rdrEndEdge { background: var(--primary); }
									.rdr-dashboard-picker .rdrDay:not(.rdrDayPassive) .rdrInRange ~ .rdrDayNumber span,
									.rdr-dashboard-picker .rdrDay:not(.rdrDayPassive) .rdrStartEdge ~ .rdrDayNumber span,
									.rdr-dashboard-picker .rdrDay:not(.rdrDayPassive) .rdrEndEdge ~ .rdrDayNumber span { color: #fff; }
								`}</style>
								<div className="rdr-dashboard-picker">
									<DateRange
										ranges={pickerRange}
										onChange={(item: any) => {
											setPickerRange([item.selection]);
											const start: Date = item.selection.startDate;
											const end: Date   = item.selection.endDate;
											if (start) setCustomFrom(start.toISOString().slice(0, 10));
											if (end)   setCustomTo(end.toISOString().slice(0, 10));
										}}
										months={1}
										direction="horizontal"
										showDateDisplay={true}
										color="var(--primary)"
										rangeColors={["var(--primary)"]}
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* P&L rows */}
				<div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
					{[
						{ label: tr.total_revenue,       val: rangeRevenue,                     color: t.text },
						{ label: tr.total_cost,          val: rangeCogs,                        color: t.textMuted },
						{ label: tr.gross_profit,        val: rangeGrossProfit,                 color: rangeGrossProfit >= 0 ? "#10b981" : "#ef4444" },
						{ label: tr.expenses,            val: totalExpenses,                    color: totalExpenses > 0 ? "#ef4444" : t.textFaint },
						{ label: "Receivables (Credit)", val: debtData?.customerDebt ?? 0,      color: "#f59e0b" },
						{ label: "Payables (Owed)",      val: -(debtData?.supplierDebt ?? 0),   color: debtData?.supplierDebt ? "#ef4444" : t.textFaint },
					].map((row) => (
						<div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ color: t.textFaint, fontSize: "12px" }}>{row.label}</span>
							<span style={{ color: row.color, fontSize: "12px", fontWeight: 500 }}>{fmt(row.val)}</span>
						</div>
					))}
					<div style={{ marginTop: "2px", paddingTop: "7px", borderTop: `1px solid ${t.borderMid}`, display: "flex", flexDirection: "column", gap: "7px" }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ color: t.text, fontSize: "12px", fontWeight: 700 }}>{tr.net_profit}</span>
							<span style={{ color: rangeNetProfit >= 0 ? "#10b981" : "#ef4444", fontSize: "13px", fontWeight: 800 }}>{fmt(rangeNetProfit)}</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.net_margin}</span>
							<span style={{ color: rangeNetProfit >= 0 ? "#10b981" : "#ef4444", fontSize: "12px", fontWeight: 700 }}>{rangeNetMargin.toFixed(1)}%</span>
						</div>
					</div>
				</div>
			</div>

			{/* Expense Breakdown — separate card */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "16px 20px", display: "flex", flexDirection: "column" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
					<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{tr.expense_breakdown}</h2>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<span style={{ color: t.textFaint, fontSize: "11px" }}>{rangeLabel}</span>
						{totalExpenses > 0 && <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 700 }}>{fmt(totalExpenses)}</span>}
					</div>
				</div>
				{expenseSummary.length === 0 ? (
					<div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
							<path d="M21 12V7H5a2 2 0 010-4h14v4 M3 5v14a2 2 0 002 2h16v-4 M18 12a1 1 0 100 2 1 1 0 000-2z" />
						</svg>
						<p style={{ color: t.textFaint, fontSize: "12px" }}>{tr.no_expenses}</p>
					</div>
				) : (
					<div style={{ flex: 1, minHeight: 0 }}>
						<Pie data={pieData} options={pieOptions} />
					</div>
				)}
			</div>
			</div>

			{/* Revenue Summary — full-width bar chart */}
			<div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "14px 16px", overflow: "hidden" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
					<div>
						<h2 style={{ color: t.text, fontWeight: 700, fontSize: "13px" }}>{tr.revenue_summary}</h2>
						{/* Year selector */}
						<div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
							<button
								onClick={() => setChartYear((y) => y - 1)}
								style={{ width: "20px", height: "20px", borderRadius: "6px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", lineHeight: 1 }}
							>‹</button>
							<span style={{ color: t.text, fontSize: "12px", fontWeight: 700, minWidth: "36px", textAlign: "center" }}>{chartYear}</span>
							<button
								onClick={() => setChartYear((y) => y + 1)}
								disabled={chartYear >= currentYear}
								style={{ width: "20px", height: "20px", borderRadius: "6px", border: "none", background: t.inputBg, color: chartYear >= currentYear ? t.textFaint : t.textMuted, cursor: chartYear >= currentYear ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", lineHeight: 1 }}
							>›</button>
						</div>
					</div>
					{/* Year summary pills */}
					<div style={{ display: "flex", gap: "8px" }}>
						{[
							{ label: tr.total_revenue, val: yearRevenue, color: "var(--primary-light)" },
							{ label: tr.total_cost,    val: yearCogs,    color: "#f59e0b" },
							{ label: tr.gross_profit,  val: yearGross,   color: "#10b981" },
						].map((item) => (
							<div key={item.label} style={{ textAlign: "right" }}>
								<p style={{ color: t.textFaint, fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{item.label}</p>
								<p style={{ color: item.val < 0 ? "#ef4444" : t.text, fontWeight: 700, fontSize: "12px" }}>{fmt(item.val)}</p>
							</div>
						))}
						<div style={{ textAlign: "right", borderLeft: `1px solid ${t.borderMid}`, paddingLeft: "8px", marginLeft: "2px" }}>
							<p style={{ color: t.textFaint, fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{tr.profit_margin}</p>
							<p style={{ color: yearGross >= 0 ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: "12px" }}>
								{yearRevenue > 0 ? ((yearGross / yearRevenue) * 100).toFixed(1) : "0.0"}%
							</p>
						</div>
					</div>
				</div>

				<div style={{ height: "220px", width: "100%", overflow: "hidden" }}>
					<Bar data={barData} options={barOptions} />
				</div>
			</div>

		</div>
	);
};
