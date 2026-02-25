export type Currency = { symbol: string; code: string; name: string }

export const CURRENCIES: Currency[] = [
  { symbol: 'K',  code: 'MMK', name: 'Myanmar Kyat' },
  { symbol: '$',  code: 'USD', name: 'US Dollar' },
  { symbol: '฿',  code: 'THB', name: 'Thai Baht' },
  { symbol: '¥',  code: 'CNY', name: 'Chinese Yuan' },
]
