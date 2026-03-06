// import { HashRouter, Routes, Route } from 'react-router-dom'
// import StockPage from './pages/stock'
// import PurchasePage from './pages/purchase'
// import SalePage from './pages/sale'
// import CustomerPage from './pages/customer/CustomerPage'
// import SettingPage from './pages/setting'
// import Dashboard from './pages/dashboard/dashboard'

// // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
// export default function App() {
// 	return (

// 		<HashRouter >  {/* use HashRouter not BrowserRouter in Electron */}
// 			<Routes>
// 				<Route path="/" element={<Dashboard />} />
// 				<Route path="/stock" element={<StockPage />} />
// 				<Route path="/purchase" element={<PurchasePage />} />
// 				<Route path="/sale" element={<SalePage />} />
// 				<Route path="/customer" element={<CustomerPage />} />
// 				<Route path="/setting" element={<SettingPage />} />
// 			</Routes>
// 		</HashRouter>)
// }


import React from 'react';
import { useAppStore, useTheme, useTr, usePrimaryPreset, useFontScale } from './store/useAppStore';
import { buildCssVars, FONT_ZOOM } from './constants/primaryPresets';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardPage } from './pages/dashboard/dashboard';
import { CustomersPage } from './pages/customer/CustomerPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { StockPage } from './pages/stock/StockPage';
import { TransfersPage } from './pages/transfers/TransfersPage';
import { ComingSoon } from './components/ui/ComingSoon';
import { PurchasePage } from './pages/purchase/PurchasePage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { LocationsPage } from './pages/locations/LocationsPage';
import { UsersPage } from './pages/users/UsersPage';
import { SalesPage } from './pages/sales/SalesPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { LedgerPage } from './pages/ledger/LedgerPage';
import { ExpensePage } from './pages/expenses/ExpensePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SetupPage } from './pages/auth/SetupPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { RestoreOrNewScreen } from './pages/onboarding/RestoreOrNewScreen';
import { AccountingPage } from './pages/accounting/AccountingPage';
import { PaymentAccountsPage } from './pages/payment-accounts/PaymentAccountsPage';
import { DeliveryMethodsPage } from './pages/delivery-methods/DeliveryMethodsPage';
import { BrandsPage } from './pages/brands/BrandsPage';
import { trpc } from './trpc-client/trpc';

const IMPLEMENTED_PAGES = ['dashboard', 'accounting', 'customers', 'categories', 'brands', 'stock', 'transfers', 'ledger', 'purchase', 'suppliers', 'locations', 'users', 'sales', 'settings', 'expenses', 'profile', 'payment_accounts', 'delivery_methods'] as const;

// Checks whether any user account exists; shows RestoreOrNewScreen on first run, LoginPage otherwise.
const AuthGate: React.FC = () => {
	const t = useTheme();
	const [showSetup, setShowSetup] = React.useState(false);
	const { data, isLoading, refetch } = trpc.user.hasAny.useQuery();

	if (isLoading) {
		return (
			<div style={{ position: 'fixed', inset: 0, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<div style={{ color: t.textFaint, fontSize: '13px' }}>Loading…</div>
			</div>
		);
	}

	if (!data?.exists) {
		if (showSetup) return <SetupPage onDone={() => refetch()} />;
		return <RestoreOrNewScreen onProceedSetup={() => setShowSetup(true)} />;
	}
	return <LoginPage />;
};

const App: React.FC = () => {
	const t = useTheme();
	const tr = useTr();
	const page = useAppStore((s) => s.page);
	const preset = usePrimaryPreset();
	const fontScale = useFontScale();
	const currentUser = useAppStore((s) => s.currentUser);
	const logout = useAppStore((s) => s.logout);

	// Validate that the persisted currentUser still exists in the DB.
	// Handles the case where pos.db is deleted while the user session is still stored.
	const { data: userCheck } = trpc.user.hasAny.useQuery(
		undefined,
		{ enabled: !!currentUser }
	);
	const userGone = !!currentUser && userCheck !== undefined && !userCheck.exists;
	React.useEffect(() => {
		if (userGone) logout();
	}, [userGone]);

	// Derive onboarding state from DB: if no locations exist, onboarding is needed.
	// Always query when logged in so that a restored backup (which has locations) skips onboarding
	// even when onboardingDone is false in the persisted store (e.g. fresh install + restore).
	const { data: locCheck, isLoading: locLoading } = trpc.location.list.useQuery(
		{ pageSize: 1 },
		{ enabled: !!currentUser && !userGone }
	);
	const needsOnboarding = locLoading || (locCheck !== undefined && locCheck.data.length === 0);

	const pageLabel = tr[page as keyof typeof tr] ?? page;

	return (
		<>
			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        :root { ${buildCssVars(preset)} }
        html { zoom: ${FONT_ZOOM[fontScale]}; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; background: ${t.bg}; transition: background 0.25s; }
        input::placeholder { color: ${t.textFaint}; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 2px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        button:focus { outline: none; }
      `}</style>

			{!currentUser || userGone ? (
				<AuthGate />
			) : needsOnboarding ? (
				<OnboardingPage />
			) : (
			<div style={{
				display: 'flex', height: '100%', width: '100%',
				background: t.bg, fontFamily: "'DM Sans', sans-serif",
				overflow: 'hidden', transition: 'background 0.25s',
			}}>
				<Sidebar />

				<div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
					<Topbar />

					<main style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
						{page === 'dashboard' && <DashboardPage />}
						{page === 'accounting' && <AccountingPage />}
						{page === 'customers' && <CustomersPage />}
						{page === 'categories' && <CategoriesPage />}
						{page === 'stock' && <StockPage />}
						{page === 'transfers' && <TransfersPage />}
					{page === 'ledger' && <LedgerPage />}
						{page === 'purchase' && <PurchasePage />}
						{page === 'suppliers' && <SuppliersPage />}
						{page === 'locations' && <LocationsPage />}
						{page === 'users' && <UsersPage />}
						{page === 'sales' && <SalesPage />}
						{page === 'settings' && <SettingsPage />}
						{page === 'expenses' && <ExpensePage />}
						{page === 'profile' && <ProfilePage />}
						{page === 'payment_accounts' && <PaymentAccountsPage />}
					{page === 'delivery_methods' && <DeliveryMethodsPage />}
					{page === 'brands' && <BrandsPage />}
						{!IMPLEMENTED_PAGES.includes(page as typeof IMPLEMENTED_PAGES[number]) && (
							<ComingSoon label={String(pageLabel)} />
						)}
					</main>
				</div>
			</div>
			)}
		</>
	);
};

export default App;
