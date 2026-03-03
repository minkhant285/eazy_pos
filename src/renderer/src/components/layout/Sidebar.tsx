import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../ui/Icon";
import type { PageId } from "../../types";

interface NavItem { id: PageId; label: string; icon: import("../../constants/icons").IconKey; }
interface NavGroup { label: string; items: NavItem[]; }

// Pages each role can access
const PAGE_ACCESS: Record<string, ('admin' | 'manager' | 'cashier')[]> = {
  accounting: ['admin', 'manager'],
  dashboard: ['admin', 'manager'],
  payment_accounts: ['admin', 'manager'],
  delivery_methods: ['admin', 'manager'],
  sales:     ['admin', 'manager', 'cashier'],
  customers: ['admin', 'manager', 'cashier'],
  settings:  ['admin', 'manager', 'cashier'],
  categories:['admin', 'manager'],
  stock:     ['admin', 'manager'],
  transfers: ['admin', 'manager'],
  ledger:    ['admin', 'manager'],
  suppliers: ['admin', 'manager'],
  purchase:  ['admin', 'manager'],
  expenses:  ['admin', 'manager'],
  locations: ['admin'],
  users:     ['admin'],
  profile:   ['admin', 'manager', 'cashier'],
}

export const Sidebar: React.FC = () => {
	const page = useAppStore((s) => s.page);
	const setPage = useAppStore((s) => s.setPage);
	const collapsed = useAppStore((s) => s.sidebarCollapsed);
	const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);
	const role = useAppStore((s) => s.currentUser?.role ?? 'cashier');

	const allGroups: NavGroup[] = [
		{ label: tr.overview, items: [{ id: "dashboard", label: tr.dashboard, icon: "dashboard" }, { id: "accounting", label: tr.accounting, icon: "accounting" }] },
		{ label: tr.sales_group, items: [{ id: "sales", label: tr.sales, icon: "sale" }, { id: "customers", label: tr.customers, icon: "customer" }] },
		{ label: tr.inventory, items: [{ id: "categories", label: tr.categories, icon: "category" }, { id: "stock", label: tr.stock, icon: "stock" }, { id: "transfers", label: tr.transfers, icon: "transfer" }, { id: "ledger", label: tr.ledger, icon: "ledger" }] },
		{ label: tr.procurement, items: [{ id: "suppliers", label: tr.suppliers, icon: "supplier" }, { id: "purchase", label: tr.purchase, icon: "purchase" }, { id: "expenses", label: tr.expenses, icon: "wallet" }] },
		{ label: tr.settings, items: [{ id: 'settings', label: tr.settings, icon: 'settings' }, { id: "payment_accounts", label: tr.payment_accounts, icon: "payment" }, { id: "delivery_methods", label: tr.delivery_methods, icon: "transfer" }, { id: "locations", label: tr.locations, icon: "location" }, { id: "users", label: tr.users, icon: "users" }, { id: "profile", label: tr.profile, icon: "profile" }] },
	];

	// Filter items by role access
	const groups = allGroups
		.map((g) => ({ ...g, items: g.items.filter((item) => (PAGE_ACCESS[item.id] ?? ['admin']).includes(role)) }))
		.filter((g) => g.items.length > 0);

	return (
		<aside style={{
			width: collapsed ? "58px" : "208px",
			flexShrink: 0, display: "flex", flexDirection: "column",
			borderRight: `1px solid ${t.borderMid}`,
			background: t.surface,
			transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)",
			overflow: "hidden",
		}}>
			{/* Logo */}
			<div style={{
				height: "56px", display: "flex", alignItems: "center",
				padding: collapsed ? "0" : "0 14px",
				justifyContent: collapsed ? "center" : "flex-start",
				borderBottom: `1px solid ${t.borderMid}`, flexShrink: 0,
			}}>
				<div style={{
					width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
					background: "linear-gradient(135deg,var(--primary-light),var(--primary))",
					display: "flex", alignItems: "center", justifyContent: "center",
					boxShadow: "0 4px 14px var(--primary-40)",
				}}>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
						<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
						<line x1="3" y1="6" x2="21" y2="6" />
						<path d="M16 10a4 4 0 01-8 0" />
					</svg>
				</div>
				{!collapsed && (
					<span style={{ marginLeft: "9px", fontWeight: 800, fontSize: "14px", color: t.text, letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>
						Easy<span style={{ color: "var(--primary-light)" }}>POS</span>
					</span>
				)}
			</div>

			{/* Nav */}
			<nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 6px" }}>
				{groups.map((g) => (
					<div key={g.label} style={{ marginBottom: "16px" }}>
						{!collapsed && (
							<p style={{
								color: t.groupLabel, fontSize: "9px", fontWeight: 700,
								textTransform: "uppercase", letterSpacing: "0.8px",
								padding: "0 6px", marginBottom: "3px",
							}}>{g.label}</p>
						)}
						{g.items.map((item) => {
							const active = page === item.id;
							return (
								<button
									key={item.id}
									onClick={() => setPage(item.id)}
									title={collapsed ? item.label : undefined}
									style={{
										width: "100%", display: "flex", alignItems: "center",
										gap: collapsed ? 0 : "8px",
										justifyContent: collapsed ? "center" : "flex-start",
										padding: collapsed ? "8px 0" : "7px 8px",
										borderRadius: "9px", border: "none", cursor: "pointer",
										background: active ? t.activeNav : "transparent",
										color: active ? t.activeNavText : t.navText,
										fontSize: "12px", fontWeight: active ? 600 : 400,
										marginBottom: "1px", transition: "all 0.14s", fontFamily: "inherit",
									}}
								>
									<span style={{ flexShrink: 0 }}>
										<Icon name={item.icon} size={15} />
									</span>
									{!collapsed && (
										<span style={{ whiteSpace: "nowrap", overflow: "hidden", flex: 1, textAlign: "left" }}>{item.label}</span>
									)}
									{active && !collapsed && (
										<span style={{ width: "5px", height: "5px", borderRadius: "50%", background: t.activeNavDot, flexShrink: 0 }} />
									)}
								</button>
							);
						})}
					</div>
				))}
			</nav>

			{/* Collapse toggle */}
			<div style={{ padding: "6px", borderTop: `1px solid ${t.borderMid}`, flexShrink: 0 }}>
				<button
					onClick={() => setSidebarCollapsed(!collapsed)}
					style={{
						width: "100%", display: "flex", alignItems: "center",
						justifyContent: collapsed ? "center" : "flex-start",
						gap: collapsed ? 0 : "7px",
						padding: collapsed ? "8px 0" : "8px 8px",
						borderRadius: "9px", border: "none", background: "transparent",
						color: t.textFaint, fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
					}}
				>
					<span style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.28s", display: "flex" }}>
						<Icon name="chevron" size={14} />
					</span>
					{!collapsed && <span>{tr.collapse}</span>}
				</button>
			</div>
		</aside>
	);
};
