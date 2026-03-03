export type PageId =
  | 'dashboard' | 'customers' | 'products' | 'categories'
  | 'stock' | 'transfers' | 'ledger' | 'suppliers' | 'purchase'
  | 'expenses' | 'locations' | 'users' | 'sales' | 'settings' | 'profile'
  | 'accounting' | 'payment_accounts' | 'delivery_methods';

export type LangCode = 'en' | 'my' | 'zh' | 'th';

export interface ThemeTokens {
  bg: string; surface: string; surfaceHover: string;
  border: string; borderMid: string; borderStrong: string;
  text: string; textMuted: string; textFaint: string; textSubtle: string;
  inputBg: string; inputBorder: string;
  activeNav: string; activeNavText: string; activeNavDot: string;
  navText: string; groupLabel: string; divider: string; scrollThumb: string;
}

export interface Customer {
  id: string; name: string; email: string | null; phone: string | null;
  loyaltyPoints: number; outstandingBalance: number; creditLimit: number;
  isActive: boolean; createdAt: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
}

export interface RecentSale {
  id: string; customer: string; amount: string;
  method: 'cash' | 'card' | 'qr_code';
  time: string; status: 'completed' | 'voided';
}
