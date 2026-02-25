export type Currency = { symbol: string; code: string; name: string }

export const CURRENCIES: Currency[] = [
  { symbol: '฿',  code: 'THB', name: 'Thai Baht' },
  { symbol: '$',  code: 'USD', name: 'US Dollar' },
  { symbol: '€',  code: 'EUR', name: 'Euro' },
  { symbol: '£',  code: 'GBP', name: 'British Pound' },
  { symbol: 'K',  code: 'MMK', name: 'Myanmar Kyat' },
  { symbol: '¥',  code: 'JPY', name: 'Japanese Yen' },
  { symbol: '¥',  code: 'CNY', name: 'Chinese Yuan' },
  { symbol: '₩',  code: 'KRW', name: 'Korean Won' },
  { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar' },
  { symbol: 'RM', code: 'MYR', name: 'Malaysian Ringgit' },
  { symbol: '₫',  code: 'VND', name: 'Vietnamese Dong' },
  { symbol: 'Rp', code: 'IDR', name: 'Indonesian Rupiah' },
]
