import type { LangCode } from '../types';

export type TranslationKey =
  | 'overview' | 'sales_group' | 'inventory' | 'procurement' | 'settings'
  | 'dashboard' | 'sales' | 'customers' | 'products' | 'categories' | 'profile'
  | 'stock' | 'transfers' | 'suppliers' | 'purchase' | 'locations' | 'users'
  | 'todays_revenue' | 'total_customers' | 'total_purchases' | 'transactions' | 'low_stock_alerts'
  | 'vs_yesterday' | 'recent_transactions' | 'view_all'
  | 'payment_methods' | 'top_products' | 'sold'
  | 'new_customer' | 'edit_customer' | 'add_customer_desc' | 'total_customers_label'
  | 'search_placeholder' | 'all' | 'active' | 'inactive' | 'export'
  | 'customer_col' | 'contact' | 'loyalty_points' | 'balance' | 'status'
  | 'showing' | 'of' | 'full_name' | 'email_address' | 'phone_number' | 'credit_limit'
  | 'cancel' | 'save_changes' | 'create_customer'
  | 'delete_customer' | 'delete_warning' | 'delete' | 'pts' | 'no_customers'
  | 'coming_soon' | 'dark_mode' | 'light_mode' | 'collapse' | 'admin'
  | 'cash' | 'card' | 'qr_code' | 'completed' | 'voided'
  | 'ledger' | 'expenses'
  | 'revenue_summary' | 'total_revenue' | 'total_cost' | 'gross_profit' | 'profit_margin'
  | 'expense_breakdown' | 'this_month' | 'no_expenses'
  | 'financial_overview' | 'today' | 'net_profit' | 'net_margin'
  | 'accounting' | 'income_statement' | 'cash_flow' | 'balance_sheet' | 'reports'
  | 'pl_statement' | 'gross_profit_margin' | 'net_profit_margin'
  | 'cash_inflow' | 'cash_outflow' | 'net_cash_flow' | 'purchase_payments'
  | 'assets' | 'liabilities' | 'equity' | 'inventory_value' | 'accounts_receivable'
  | 'accounts_payable' | 'total_assets' | 'total_liabilities' | 'owners_equity'
  | 'revenue_by_category' | 'top_products' | 'profit' | 'margin' | 'qty_sold'
  | 'tax_collected' | 'discounts_given' | 'transactions_count';

export type Translations = Record<TranslationKey, string>;

export const LANG_OPTIONS: { code: LangCode; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'my', flag: '🇲🇲', label: 'မြန်မာ' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

export const translations: Record<LangCode, Translations> = {
  en: {
    overview: 'Overview', sales_group: 'Sales', inventory: 'Inventory',
    procurement: 'Procurement', settings: 'Settings',
    dashboard: 'Dashboard', sales: 'Sales', customers: 'Customers',
    products: 'Products', categories: 'Categories', stock: 'Stock',
    transfers: 'Transfers', suppliers: 'Suppliers', purchase: 'Purchase Orders',
    locations: 'Locations', users: 'Users', profile: 'My Profile',
    todays_revenue: "Today's Revenue", total_customers: 'Total Customers',
    total_purchases: 'This Month Purchases',
    transactions: 'Transactions', low_stock_alerts: 'Low Stock Alerts',
    vs_yesterday: 'vs yesterday', recent_transactions: 'Recent Transactions',
    view_all: 'View all →', payment_methods: 'Payment Methods',
    top_products: 'Top Products Today', sold: 'sold',
    new_customer: 'New Customer', edit_customer: 'Edit Customer',
    add_customer_desc: 'Add a new customer to the system',
    total_customers_label: 'total customers',
    search_placeholder: 'Search name, email, phone...',
    all: 'All', active: 'Active', inactive: 'Inactive', export: 'Export',
    customer_col: 'Customer', contact: 'Contact', loyalty_points: 'Loyalty Points',
    balance: 'Balance', status: 'Status', showing: 'Showing', of: 'of',
    full_name: 'Full Name', email_address: 'Email Address',
    phone_number: 'Phone Number', credit_limit: 'Credit Limit (฿)',
    cancel: 'Cancel', save_changes: 'Save Changes', create_customer: 'Create Customer',
    delete_customer: 'Delete Customer?',
    delete_warning: 'This action cannot be undone. Transaction history will be preserved.',
    delete: 'Delete', pts: 'pts', no_customers: 'No customers found',
    coming_soon: 'This page is coming soon',
    dark_mode: 'Dark Mode', light_mode: 'Light Mode', collapse: 'Collapse', admin: 'Admin',
    cash: 'Cash', card: 'Card', qr_code: 'QR Code', completed: 'completed', voided: 'voided',
    ledger: 'Stock Ledger', expenses: 'Expenses',
    revenue_summary: 'Revenue Summary', total_revenue: 'Revenue', total_cost: 'Cost of Goods',
    gross_profit: 'Gross Profit', profit_margin: 'Margin',
    expense_breakdown: 'Expense Breakdown', this_month: 'This Month', no_expenses: 'No expenses',
    financial_overview: 'Financial Overview', today: 'Today',
    net_profit: 'Net Profit', net_margin: 'Net Margin',
    accounting: 'Accounting', income_statement: 'Income Statement',
    cash_flow: 'Cash Flow', balance_sheet: 'Balance Sheet', reports: 'Reports',
    pl_statement: 'Profit & Loss', gross_profit_margin: 'Gross Margin', net_profit_margin: 'Net Margin',
    cash_inflow: 'Cash Inflow', cash_outflow: 'Cash Outflow', net_cash_flow: 'Net Cash Flow', purchase_payments: 'Inventory Purchases',
    assets: 'Assets', liabilities: 'Liabilities', equity: 'Equity',
    inventory_value: 'Inventory Value', accounts_receivable: 'Accounts Receivable',
    accounts_payable: 'Accounts Payable', total_assets: 'Total Assets',
    total_liabilities: 'Total Liabilities', owners_equity: "Owner's Equity",
    revenue_by_category: 'Revenue by Category', top_products: 'Top Products',
    profit: 'Profit', margin: 'Margin', qty_sold: 'Qty Sold',
    tax_collected: 'Tax Collected', discounts_given: 'Discounts Given', transactions_count: 'Transactions',
  },
  my: {
    overview: 'အကျဉ်းချုပ်', sales_group: 'အရောင်းများ', inventory: 'ကုန်ပစ္စည်းစာရင်း',
    procurement: 'ဝယ်ယူမှု', settings: 'ဆက်တင်များ',
    dashboard: 'ဒက်ရှ်ဘုတ်', sales: 'အရောင်းများ', customers: 'ဖောက်သည်များ',
    products: 'ကုန်ပစ္စည်းများ', categories: 'အမျိုးအစားများ', stock: 'စတော့',
    transfers: 'လွှဲပြောင်းမှုများ', suppliers: 'ပေးသွင်းသူများ', purchase: 'ဝယ်ယူမှုအမိန့်များ',
    locations: 'တည်နေရာများ', users: 'အသုံးပြုသူများ', profile: 'ကျွန်ုပ်ပရိုဖိုင်',
    todays_revenue: 'ယနေ့ဝင်ငွေ', total_customers: 'ဖောက်သည်စုစုပေါင်း',
    total_purchases: 'ဤလဝယ်ယူမှုများ',
    transactions: 'ငွေပေးငွေယူများ', low_stock_alerts: 'စတော့နည်းသတိပေးချက်',
    vs_yesterday: 'မနေ့နှင့်နှိုင်းယှဉ်', recent_transactions: 'မကြာသေးမီငွေပေးငွေယူများ',
    view_all: 'အားလုံးကြည့်ရန် →', payment_methods: 'ငွေပေးချေမှုနည်းလမ်းများ',
    top_products: 'ယနေ့ထိပ်တန်းကုန်ပစ္စည်းများ', sold: 'ရောင်းချပြီး',
    new_customer: 'ဖောက်သည်အသစ်', edit_customer: 'ဖောက်သည်တည်းဖြတ်ရန်',
    add_customer_desc: 'စနစ်တွင် ဖောက်သည်အသစ်ထည့်ရန်',
    total_customers_label: 'ဖောက်သည်စုစုပေါင်း',
    search_placeholder: 'နာမည်၊ အီးမေးလ်၊ ဖုန်းနံပါတ်ရှာပါ...',
    all: 'အားလုံး', active: 'တက်ကြွ', inactive: 'တက်ကြွမဟုတ်', export: 'ထုတ်ယူရန်',
    customer_col: 'ဖောက်သည်', contact: 'ဆက်သွယ်ရေး', loyalty_points: 'အမှတ်များ',
    balance: 'လက်ကျန်', status: 'အခြေအနေ', showing: 'ပြသနေသည်', of: 'မှ',
    full_name: 'နာမည်အပြည့်အစုံ', email_address: 'အီးမေးလ်လိပ်စာ',
    phone_number: 'ဖုန်းနံပါတ်', credit_limit: 'ခရက်ဒစ်အကန့်အသတ် (฿)',
    cancel: 'မလုပ်တော့ပါ', save_changes: 'ပြောင်းလဲမှုများသိမ်းဆည်းရန်',
    create_customer: 'ဖောက်သည်ဖန်တီးရန်',
    delete_customer: 'ဖောက်သည်ဖျက်မလား?',
    delete_warning: 'ဤလုပ်ဆောင်ချက်ကို ပြန်ဖျက်၍မရပါ။ မှတ်တမ်းများကို ထိန်းသိမ်းထားမည်။',
    delete: 'ဖျက်ရန်', pts: 'မှတ်', no_customers: 'ဖောက်သည်မတွေ့ပါ',
    coming_soon: 'ဤစာမျက်နှာ မကြာမီရရှိနိုင်မည်',
    dark_mode: 'အမှောင်ပုံစံ', light_mode: 'အလင်းပုံစံ', collapse: 'ချုံ့ရန်', admin: 'စီမံခန့်ခွဲသူ',
    cash: 'နတ်ငွေ', card: 'ကတ်', qr_code: 'QR ကုဒ်', completed: 'ပြီးစီး', voided: 'ပျက်ပြယ်',
    ledger: 'စတော့မှတ်တမ်း', expenses: 'ကုန်ကျစရိတ်',
    revenue_summary: 'ဝင်ငွေအကျဉ်းချုပ်', total_revenue: 'ဝင်ငွေ', total_cost: 'ကုန်ကျငွေ',
    gross_profit: 'အမြတ်ကြမ်း', profit_margin: 'မာဂျင်',
    expense_breakdown: 'ကုန်ကျစရိတ်ခွဲခြမ်း', this_month: 'ဤလ', no_expenses: 'ကုန်ကျမှုမရှိ',
    financial_overview: 'ဘဏ္ဍာရေးအကျဉ်းချုပ်', today: 'ယနေ့',
    net_profit: 'အသားတင်အမြတ်', net_margin: 'အသားတင်မာဂျင်',
    accounting: 'စာရင်းကိုင်', income_statement: 'ဝင်ငွေထုတ်ပြန်ချက်',
    cash_flow: 'ငွေစီးဆင်းမှု', balance_sheet: 'လက်ကျန်လွှာ', reports: 'အစီရင်ခံစာများ',
    pl_statement: 'အမြတ်အစီးနှင့်ဆုံးရှုံးမှု', gross_profit_margin: 'မြောက်ကြမ်းမာဂျင်', net_profit_margin: 'အသားတင်မာဂျင်',
    cash_inflow: 'ငွေဝင်', cash_outflow: 'ငွေထွက်', net_cash_flow: 'ငွေစီးဆင်းမှုသုတ်', purchase_payments: 'ကုန်ပစ္စည်းဝယ်ယူမှု',
    assets: 'ပိုင်ဆိုင်မှုများ', liabilities: 'တာဝန်ဝတ္တရားများ', equity: 'ပိုင်ရှင်အခွင့်အရေး',
    inventory_value: 'ကုန်ပစ္စည်းတန်ဖိုး', accounts_receivable: 'လက်ခံရမည့်ငွေ',
    accounts_payable: 'ပေးဆပ်ရမည့်ငွေ', total_assets: 'ပိုင်ဆိုင်မှုစုစုပေါင်း',
    total_liabilities: 'တာဝန်ဝတ္တရားစုစုပေါင်း', owners_equity: 'ပိုင်ရှင်ရင်းနှီး',
    revenue_by_category: 'အမျိုးအစားအလိုက်ဝင်ငွေ', top_products: 'ထိပ်တန်းကုန်ပစ္စည်းများ',
    profit: 'အမြတ်', margin: 'မာဂျင်', qty_sold: 'ရောင်းချပမာဏ',
    tax_collected: 'ကောက်ခံငွေ', discounts_given: 'လျှော့ပေးငွေ', transactions_count: 'ငွေပေးငွေယူ',
  },
  zh: {
    overview: '概览', sales_group: '销售', inventory: '库存管理',
    procurement: '采购', settings: '设置',
    dashboard: '仪表盘', sales: '销售', customers: '客户',
    products: '产品', categories: '分类', stock: '库存',
    transfers: '调拨', suppliers: '供应商', purchase: '采购订单',
    locations: '门店', users: '用户', profile: '我的资料',
    todays_revenue: '今日营收', total_customers: '客户总数',
    total_purchases: '本月采购',
    transactions: '交易笔数', low_stock_alerts: '库存预警',
    vs_yesterday: '与昨日对比', recent_transactions: '最近交易',
    view_all: '查看全部 →', payment_methods: '支付方式',
    top_products: '今日热销产品', sold: '已售',
    new_customer: '新增客户', edit_customer: '编辑客户',
    add_customer_desc: '向系统添加新客户',
    total_customers_label: '客户总计',
    search_placeholder: '搜索姓名、邮箱、电话...',
    all: '全部', active: '活跃', inactive: '停用', export: '导出',
    customer_col: '客户', contact: '联系方式', loyalty_points: '积分',
    balance: '余额', status: '状态', showing: '显示', of: '共',
    full_name: '姓名', email_address: '电子邮箱',
    phone_number: '电话号码', credit_limit: '信用额度 (฿)',
    cancel: '取消', save_changes: '保存更改', create_customer: '创建客户',
    delete_customer: '删除客户？',
    delete_warning: '此操作无法撤销。客户的交易记录将被保留。',
    delete: '删除', pts: '积分', no_customers: '未找到客户',
    coming_soon: '此页面即将上线',
    dark_mode: '深色模式', light_mode: '浅色模式', collapse: '收起', admin: '管理员',
    cash: '现金', card: '银行卡', qr_code: '二维码', completed: '已完成', voided: '已作废',
    ledger: '库存台账', expenses: '费用',
    revenue_summary: '营收摘要', total_revenue: '总营收', total_cost: '销货成本',
    gross_profit: '毛利润', profit_margin: '利润率',
    expense_breakdown: '费用分类', this_month: '本月', no_expenses: '暂无费用',
    financial_overview: '财务概览', today: '今日',
    net_profit: '净利润', net_margin: '净利润率',
    accounting: '会计', income_statement: '损益表',
    cash_flow: '现金流', balance_sheet: '资产负债表', reports: '报告',
    pl_statement: '损益', gross_profit_margin: '毛利率', net_profit_margin: '净利率',
    cash_inflow: '现金流入', cash_outflow: '现金流出', net_cash_flow: '净现金流', purchase_payments: '库存采购',
    assets: '资产', liabilities: '负债', equity: '权益',
    inventory_value: '库存价值', accounts_receivable: '应收账款',
    accounts_payable: '应付账款', total_assets: '总资产',
    total_liabilities: '总负债', owners_equity: '所有者权益',
    revenue_by_category: '按类别收入', top_products: '热销产品',
    profit: '利润', margin: '利润率', qty_sold: '销量',
    tax_collected: '税款', discounts_given: '折扣', transactions_count: '交易笔数',
  },
};
