import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  sales, saleItems, payments, expenses, expenseCategories,
  products, categories, stock, customers, purchaseOrders,
} from "../schemas/schema";

// ── Helpers ───────────────────────────────────────────────────

function num(v: unknown): number { return Number(v ?? 0); }

// ── Income Statement (P&L) ────────────────────────────────────

export function getIncomeStatement(fromDate: string, toDate: string) {
  const salesFilter = and(
    eq(sales.status, "completed"),
    gte(sales.createdAt, fromDate),
    lte(sales.createdAt, toDate),
  );

  // Revenue, discounts, tax from completed sales
  const salesRow = db.select({
    revenue:          sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
    discounts:        sql<number>`COALESCE(SUM(${sales.discountAmount}), 0)`,
    taxCollected:     sql<number>`COALESCE(SUM(${sales.taxAmount}), 0)`,
    transactionCount: sql<number>`COUNT(*)`,
  }).from(sales).where(salesFilter).get();

  // COGS from sale items of completed sales
  const cogsRow = db.select({
    cogs: sql<number>`COALESCE(SUM(${saleItems.unitCost} * ${saleItems.qty}), 0)`,
  }).from(saleItems)
    .innerJoin(sales, and(eq(saleItems.saleId, sales.id), salesFilter))
    .get();

  // Expenses by category
  const expRows = db.select({
    categoryId:    expenses.categoryId,
    categoryName:  expenseCategories.name,
    categoryColor: expenseCategories.color,
    amount:        sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
  }).from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(and(gte(expenses.expenseDate, fromDate), lte(expenses.expenseDate, toDate)))
    .groupBy(expenses.categoryId)
    .orderBy(sql`SUM(${expenses.amount}) DESC`)
    .all();

  const revenue        = num(salesRow?.revenue);
  const discounts      = num(salesRow?.discounts);
  const taxCollected   = num(salesRow?.taxCollected);
  const cogs           = num(cogsRow?.cogs);
  const totalExpenses  = expRows.reduce((s, e) => s + num(e.amount), 0);
  const grossProfit    = revenue - cogs;
  const netProfit      = grossProfit - totalExpenses;

  return {
    revenue, discounts, taxCollected, cogs,
    grossProfit,
    grossMargin:  revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    totalExpenses,
    netProfit,
    netMargin:    revenue > 0 ? (netProfit  / revenue) * 100 : 0,
    transactionCount: num(salesRow?.transactionCount),
    expenseBreakdown: expRows.map(e => ({
      categoryId:    e.categoryId,
      categoryName:  e.categoryName  ?? "Uncategorized",
      categoryColor: e.categoryColor ?? "#6b7280",
      amount: num(e.amount),
    })),
  };
}

// ── Cash Flow Summary ─────────────────────────────────────────

export function getCashFlowSummary(fromDate: string, toDate: string) {
  const salesFilter = and(
    eq(sales.status, "completed"),
    gte(sales.createdAt, fromDate),
    lte(sales.createdAt, toDate),
  );

  // Cash in: payments on completed sales
  const cashInRows = db.select({
    method: payments.method,
    amount: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
  }).from(payments)
    .innerJoin(sales, and(eq(payments.saleId, sales.id), salesFilter))
    .groupBy(payments.method)
    .all();

  // Cash out: expenses
  const expOutRows = db.select({
    method: expenses.paymentMethod,
    amount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
  }).from(expenses)
    .where(and(gte(expenses.expenseDate, fromDate), lte(expenses.expenseDate, toDate)))
    .groupBy(expenses.paymentMethod)
    .all();

  // Cash out: received purchases (inventory cost)
  const purchaseRow = db.select({
    total: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(purchaseOrders)
    .where(and(
      inArray(purchaseOrders.status, ["received", "partial"]),
      gte(purchaseOrders.createdAt, fromDate),
      lte(purchaseOrders.createdAt, toDate),
    )).get();

  const totalCashIn      = cashInRows.reduce((s, r) => s + num(r.amount), 0);
  const totalExpenseOut  = expOutRows.reduce((s, r) => s + num(r.amount), 0);
  const totalPurchaseOut = num(purchaseRow?.total);
  const totalCashOut     = totalExpenseOut + totalPurchaseOut;

  return {
    cashIn:         cashInRows.map(r => ({ method: r.method, amount: num(r.amount) })),
    totalCashIn,
    expenseOut:     expOutRows.map(r => ({ method: r.method, amount: num(r.amount) })),
    totalExpenseOut,
    totalPurchaseOut,
    purchaseCount:  num(purchaseRow?.count),
    totalCashOut,
    netCashFlow:    totalCashIn - totalCashOut,
  };
}

// ── Monthly Trend (12 months for a given year) ─────────────────

export function getMonthlyTrend(year: number) {
  const fromDate = `${year}-01-01 00:00:00`;
  const toDate   = `${year}-12-31 23:59:59`;
  const salesFilter = and(
    eq(sales.status, "completed"),
    gte(sales.createdAt, fromDate),
    lte(sales.createdAt, toDate),
  );

  const revenueRows = db.select({
    month:   sql<string>`strftime('%m', ${sales.createdAt})`,
    revenue: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
  }).from(sales).where(salesFilter)
    .groupBy(sql`strftime('%m', ${sales.createdAt})`).all();

  const cogsRows = db.select({
    month: sql<string>`strftime('%m', ${sales.createdAt})`,
    cogs:  sql<number>`COALESCE(SUM(${saleItems.unitCost} * ${saleItems.qty}), 0)`,
  }).from(saleItems)
    .innerJoin(sales, and(eq(saleItems.saleId, sales.id), salesFilter))
    .groupBy(sql`strftime('%m', ${sales.createdAt})`).all();

  const expRows = db.select({
    month: sql<string>`strftime('%m', ${expenses.expenseDate})`,
    total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
  }).from(expenses)
    .where(and(
      gte(expenses.expenseDate, `${year}-01-01`),
      lte(expenses.expenseDate, `${year}-12-31`),
    ))
    .groupBy(sql`strftime('%m', ${expenses.expenseDate})`).all();

  return Array.from({ length: 12 }, (_, i) => {
    const mo      = String(i + 1).padStart(2, "0");
    const revenue = num(revenueRows.find(r => r.month === mo)?.revenue);
    const cogs    = num(cogsRows.find(r => r.month === mo)?.cogs);
    const expAmt  = num(expRows.find(r => r.month === mo)?.total);
    return {
      month:       mo,
      revenue,
      cogs,
      grossProfit: revenue - cogs,
      expenses:    expAmt,
      netProfit:   revenue - cogs - expAmt,
    };
  });
}

// ── Balance Sheet Snapshot ────────────────────────────────────

export function getBalanceSheet() {
  // Asset: inventory value (stock qty × product cost price)
  const invRow = db.select({
    value: sql<number>`COALESCE(SUM(${stock.qtyOnHand} * ${products.costPrice}), 0)`,
    skus:  sql<number>`COUNT(DISTINCT ${stock.productId})`,
  }).from(stock)
    .innerJoin(products, eq(stock.productId, products.id))
    .where(sql`${stock.qtyOnHand} > 0`)
    .get();

  // Asset: accounts receivable (customer outstanding balances)
  const arRow = db.select({
    total: sql<number>`COALESCE(SUM(${customers.outstandingBalance}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(customers)
    .where(and(eq(customers.isActive, true), sql`${customers.outstandingBalance} > 0`))
    .get();

  // Liability: accounts payable (open/partial purchase orders)
  const apRow = db.select({
    total: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(purchaseOrders)
    .where(inArray(purchaseOrders.status, ["draft", "sent", "partial"]))
    .get();

  const inventoryValue     = num(invRow?.value);
  const accountsReceivable = num(arRow?.total);
  const accountsPayable    = num(apRow?.total);
  const totalAssets        = inventoryValue + accountsReceivable;
  const totalLiabilities   = accountsPayable;

  return {
    assets: {
      inventoryValue,
      inventorySkus:    num(invRow?.skus),
      accountsReceivable,
      arCustomerCount:  num(arRow?.count),
      total:            totalAssets,
    },
    liabilities: {
      accountsPayable,
      apOrderCount: num(apRow?.count),
      total:        totalLiabilities,
    },
    equity: totalAssets - totalLiabilities,
  };
}

// ── Revenue by Category ───────────────────────────────────────

export function getRevenueByCategory(fromDate: string, toDate: string) {
  const rows = db.select({
    categoryId:   categories.id,
    categoryName: categories.name,
    revenue:  sql<number>`COALESCE(SUM(${saleItems.totalAmount}), 0)`,
    cogs:     sql<number>`COALESCE(SUM(${saleItems.unitCost} * ${saleItems.qty}), 0)`,
    qtySold:  sql<number>`COALESCE(SUM(${saleItems.qty}), 0)`,
  }).from(saleItems)
    .innerJoin(sales, and(
      eq(saleItems.saleId, sales.id),
      eq(sales.status, "completed"),
      gte(sales.createdAt, fromDate),
      lte(sales.createdAt, toDate),
    ))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .groupBy(sql`COALESCE(${categories.id}, 'uncategorized')`)
    .orderBy(sql`SUM(${saleItems.totalAmount}) DESC`)
    .all();

  return rows.map(r => ({
    categoryId:   r.categoryId   ?? null,
    categoryName: r.categoryName ?? "Uncategorized",
    revenue:      num(r.revenue),
    cogs:         num(r.cogs),
    grossProfit:  num(r.revenue) - num(r.cogs),
    qtySold:      num(r.qtySold),
    margin:       num(r.revenue) > 0
      ? ((num(r.revenue) - num(r.cogs)) / num(r.revenue)) * 100
      : 0,
  }));
}

// ── Top Products by Gross Profit ──────────────────────────────

export function getTopProducts(fromDate: string, toDate: string, limit = 15) {
  return db.select({
    productId:   products.id,
    productName: products.name,
    sku:         products.sku,
    revenue:  sql<number>`COALESCE(SUM(${saleItems.totalAmount}), 0)`,
    cogs:     sql<number>`COALESCE(SUM(${saleItems.unitCost} * ${saleItems.qty}), 0)`,
    qtySold:  sql<number>`COALESCE(SUM(${saleItems.qty}), 0)`,
  }).from(saleItems)
    .innerJoin(sales, and(
      eq(saleItems.saleId, sales.id),
      eq(sales.status, "completed"),
      gte(sales.createdAt, fromDate),
      lte(sales.createdAt, toDate),
    ))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .groupBy(products.id)
    .orderBy(sql`SUM(${saleItems.totalAmount}) - SUM(${saleItems.unitCost} * ${saleItems.qty}) DESC`)
    .limit(limit)
    .all()
    .map(r => ({
      productId:   r.productId,
      productName: r.productName,
      sku:         r.sku,
      revenue:     num(r.revenue),
      cogs:        num(r.cogs),
      grossProfit: num(r.revenue) - num(r.cogs),
      qtySold:     num(r.qtySold),
      margin:      num(r.revenue) > 0
        ? ((num(r.revenue) - num(r.cogs)) / num(r.revenue)) * 100
        : 0,
    }));
}
