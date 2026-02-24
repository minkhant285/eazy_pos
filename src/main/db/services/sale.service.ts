import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { sales, saleItems, payments, products, customers, users, locations } from "../schemas/schema";
import { newId, now, NotFoundError, ValidationError, generateDocNumber } from "../utils";
import { upsertStock, appendLedger } from "./stock.service";
import { addLoyaltyPoints } from "./customer.service";

// ─── Types ───────────────────────────────────────────────────

export type CartItem = {
  productId: string;
  qty: number;
  unitPrice?: number;       // Override price (e.g. price-level or negotiated)
  discountAmount?: number;  // Line-level discount
};

export type PaymentInput = {
  method: typeof payments.$inferInsert["method"];
  amount: number;
  reference?: string;
};

export type CreateSaleInput = {
  locationId: string;
  cashierId: string;
  customerId?: string;
  items: CartItem[];
  payments: PaymentInput[];
  discountAmount?: number;  // Header-level discount
  notes?: string;
};

export type SaleFilter = {
  locationId?: string;
  cashierId?: string;
  customerId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
};

// ─── Helpers ─────────────────────────────────────────────────

/** Calculate sale totals from items */
export function calculateSaleTotals(
  items: Array<{
    qty: number;
    unitPrice: number;
    discountAmount: number;
    taxRate: number;
  }>
) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const lineNet = item.qty * item.unitPrice - item.discountAmount;
    subtotal += item.qty * item.unitPrice;
    discountTotal += item.discountAmount;
    taxTotal += lineNet * item.taxRate;
  }

  return { subtotal, discountTotal, taxTotal, total: subtotal - discountTotal + taxTotal };
}

// ─── CRUD ────────────────────────────────────────────────────

/** Complete a POS sale (creates sale, items, payments, ledger entries atomically) */
export function createSale(input: CreateSaleInput) {
  return db.transaction((tx) => {
    const saleId = newId();
    const receiptNo = generateDocNumber("RCP");

    let subtotal = 0;
    let totalTax = 0;
    const saleItemRows:any[] = [];
    const ledgerEntries:any[] = [];

    // ── Validate & build items ──
    for (const cartItem of input.items) {
      const product = tx
        .select()
        .from(products)
        .where(eq(products.id, cartItem.productId))
        .get();

      if (!product || !product.isActive) {
        throw new ValidationError(`Product not available: ${cartItem.productId}`);
      }

      const unitPrice = cartItem.unitPrice ?? product.sellingPrice;
      const discount = cartItem.discountAmount ?? 0;
      const lineNet = cartItem.qty * unitPrice - discount;
      const lineTax = lineNet * product.taxRate;
      const lineTotal = lineNet + lineTax;

      subtotal += cartItem.qty * unitPrice;
      totalTax += lineTax;

      // ── Update stock ──
      const { qtyBefore, qtyAfter } = upsertStock(product.id, input.locationId, -cartItem.qty);

      saleItemRows.push({
        id: newId(),
        saleId,
        productId: product.id,
        qty: cartItem.qty,
        unitPrice,
        unitCost: product.costPrice,
        discountAmount: discount,
        taxAmount: lineTax,
        totalAmount: lineTotal,
      });

      ledgerEntries.push({
        productId: product.id,
        locationId: input.locationId,
        movementType: "sale_out" as const,
        qty: cartItem.qty,
        qtyBefore,
        qtyAfter,
        unitCost: product.costPrice,
        totalCost: cartItem.qty * product.costPrice,
        referenceType: "sale" as const,
        referenceId: saleId,
        createdBy: input.cashierId,
      });
    }

    const headerDiscount = input.discountAmount ?? 0;
    const totalAmount = subtotal - headerDiscount + totalTax;
    const paidAmount = input.payments.reduce((s, p) => s + p.amount, 0);
    const changeAmount = paidAmount - totalAmount;

    if (paidAmount < totalAmount) {
      throw new ValidationError(
        `Underpayment. Required: ${totalAmount.toFixed(2)}, Paid: ${paidAmount.toFixed(2)}`
      );
    }

    // ── Insert sale header ──
    tx.insert(sales)
      .values({
        id: saleId,
        receiptNo,
        locationId: input.locationId,
        cashierId: input.cashierId,
        customerId: input.customerId ?? null,
        status: "completed",
        subtotal,
        discountAmount: headerDiscount,
        taxAmount: totalTax,
        roundingAmount: 0,
        totalAmount,
        paidAmount,
        changeAmount,
        notes: input.notes ?? null,
      })
      .run();

    // ── Insert items ──
    tx.insert(saleItems).values(saleItemRows).run();

    // ── Insert payments ──
    const paymentRows = input.payments.map((p) => ({
      id: newId(),
      saleId,
      method: p.method,
      amount: p.amount,
      reference: p.reference ?? null,
    }));
    tx.insert(payments).values(paymentRows).run();

    // ── Append ledger entries ──
    for (const entry of ledgerEntries) {
      appendLedger(entry);
    }

    // ── Loyalty points (1 point per whole currency unit spent) ──
    if (input.customerId) {
      addLoyaltyPoints(input.customerId, Math.floor(totalAmount));
    }

    return getSaleById(saleId);
  });
}

/** Get a sale with all its items and payments */
export function getSaleById(id: string) {
  const sale = db
    .select({
      id: sales.id,
      receiptNo: sales.receiptNo,
      locationId: sales.locationId,
      locationName: locations.name,
      customerId: sales.customerId,
      customerName: customers.name,
      cashierId: sales.cashierId,
      cashierName: users.name,
      status: sales.status,
      subtotal: sales.subtotal,
      discountAmount: sales.discountAmount,
      taxAmount: sales.taxAmount,
      totalAmount: sales.totalAmount,
      paidAmount: sales.paidAmount,
      changeAmount: sales.changeAmount,
      notes: sales.notes,
      voidReason: sales.voidReason,
      voidedAt: sales.voidedAt,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(locations, eq(sales.locationId, locations.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(users, eq(sales.cashierId, users.id))
    .where(eq(sales.id, id))
    .get();

  if (!sale) throw new NotFoundError("Sale", id);

  const items = db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      productName: products.name,
      productSku: products.sku,
      qty: saleItems.qty,
      unitPrice: saleItems.unitPrice,
      unitCost: saleItems.unitCost,
      discountAmount: saleItems.discountAmount,
      taxAmount: saleItems.taxAmount,
      totalAmount: saleItems.totalAmount,
    })
    .from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, id))
    .all();

  const paymentRows = db
    .select()
    .from(payments)
    .where(eq(payments.saleId, id))
    .all();

  return { ...sale, items, payments: paymentRows };
}

/** List sales with filters and pagination */
export function listSales(params?: SaleFilter) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions:any[] = [];
  if (params?.locationId) conditions.push(eq(sales.locationId, params.locationId));
  if (params?.cashierId) conditions.push(eq(sales.cashierId, params.cashierId));
  if (params?.customerId) conditions.push(eq(sales.customerId, params.customerId));
  if (params?.status) conditions.push(eq(sales.status, params.status as any));
  if (params?.fromDate) conditions.push(gte(sales.createdAt, params.fromDate));
  if (params?.toDate) conditions.push(lte(sales.createdAt, params.toDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db
    .select({
      id: sales.id,
      receiptNo: sales.receiptNo,
      locationName: locations.name,
      customerName: customers.name,
      cashierName: users.name,
      status: sales.status,
      totalAmount: sales.totalAmount,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(locations, eq(sales.locationId, locations.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(users, eq(sales.cashierId, users.id))
    .where(where)
    .orderBy(desc(sales.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  const total =
    db.select({ c: sql<number>`COUNT(*)` }).from(sales).where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Void a completed sale (reverses all stock movements) */
export function voidSale(saleId: string, voidedBy: string, reason: string) {
  return db.transaction((tx) => {
    const sale = getSaleById(saleId);

    if (sale.status !== "completed") {
      throw new ValidationError(`Cannot void a sale with status: ${sale.status}`);
    }

    // Reverse each line item's stock movement
    for (const item of sale.items) {
      const { qtyBefore, qtyAfter } = upsertStock(item.productId, sale.locationId, item.qty);
      appendLedger({
        productId: item.productId,
        locationId: sale.locationId,
        movementType: "return_in",
        qty: item.qty,
        qtyBefore,
        qtyAfter,
        unitCost: item.unitCost,
        totalCost: item.qty * item.unitCost,
        referenceType: "sale",
        referenceId: saleId,
        notes: `Void: ${reason}`,
        createdBy: voidedBy,
      });
    }

    tx.update(sales)
      .set({
        status: "voided",
        voidedBy,
        voidedAt: now(),
        voidReason: reason,
        updatedAt: now(),
      })
      .where(eq(sales.id, saleId))
      .run();

    return getSaleById(saleId);
  });
}

/** Process a customer return (partial or full) */
export function processSaleReturn(
  saleId: string,
  returnItems: Array<{ productId: string; qty: number }>,
  processedBy: string,
  reason?: string
) {
  return db.transaction((tx) => {
    const sale = getSaleById(saleId);

    if (!["completed", "partially_refunded"].includes(sale.status)) {
      throw new ValidationError(`Cannot return items from sale with status: ${sale.status}`);
    }

    let totalRefund = 0;

    for (const ret of returnItems) {
      const originalItem = sale.items.find((i) => i.productId === ret.productId);
      if (!originalItem) {
        throw new ValidationError(`Product ${ret.productId} not in original sale`);
      }
      if (ret.qty > originalItem.qty) {
        throw new ValidationError(
          `Return qty (${ret.qty}) exceeds original qty (${originalItem.qty})`
        );
      }

      const { qtyBefore, qtyAfter } = upsertStock(ret.productId, sale.locationId, ret.qty);

      appendLedger({
        productId: ret.productId,
        locationId: sale.locationId,
        movementType: "return_in",
        qty: ret.qty,
        qtyBefore,
        qtyAfter,
        unitCost: originalItem.unitCost,
        totalCost: ret.qty * originalItem.unitCost,
        referenceType: "sale",
        referenceId: saleId,
        notes: reason ?? "Customer return",
        createdBy: processedBy,
      });

      totalRefund += (originalItem.totalAmount / originalItem.qty) * ret.qty;
    }

    // Check if fully or partially refunded
    const allItems = sale.items;
    const isFullRefund = returnItems.every((r) => {
      const orig = allItems.find((i) => i.productId === r.productId);
      return orig && r.qty === orig.qty;
    });

    tx.update(sales)
      .set({
        status: isFullRefund ? "refunded" : "partially_refunded",
        updatedAt: now(),
      })
      .where(eq(sales.id, saleId))
      .run();

    return { saleId, totalRefund, status: isFullRefund ? "refunded" : "partially_refunded" };
  });
}

// ─── Reports ─────────────────────────────────────────────────

/** Daily sales summary */
export function getDailySummary(locationId: string, date: string) {
  return db
    .select({
      totalTransactions: sql<number>`COUNT(*)`,
      totalRevenue: sql<number>`SUM(${sales.totalAmount})`,
      totalTax: sql<number>`SUM(${sales.taxAmount})`,
      totalDiscount: sql<number>`SUM(${sales.discountAmount})`,
      averageTransaction: sql<number>`AVG(${sales.totalAmount})`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.locationId, locationId),
        eq(sales.status, "completed"),
        sql`DATE(${sales.createdAt}) = ${date}`
      )
    )
    .get();
}

/** Sales by payment method for a date range */
export function getSalesByPaymentMethod(locationId: string, fromDate: string, toDate: string) {
  return db
    .select({
      method: payments.method,
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`SUM(${payments.amount})`,
    })
    .from(payments)
    .innerJoin(sales, eq(payments.saleId, sales.id))
    .where(
      and(
        eq(sales.locationId, locationId),
        eq(sales.status, "completed"),
        gte(sales.createdAt, fromDate),
        lte(sales.createdAt, toDate)
      )
    )
    .groupBy(payments.method)
    .all();
}

/** Top selling products */
export function getTopSellingProducts(
  locationId: string,
  fromDate: string,
  toDate: string,
  limit = 10
) {
  return db
    .select({
      productId: saleItems.productId,
      productName: products.name,
      sku: products.sku,
      totalQtySold: sql<number>`SUM(${saleItems.qty})`,
      totalRevenue: sql<number>`SUM(${saleItems.totalAmount})`,
      totalCogs: sql<number>`SUM(${saleItems.qty} * ${saleItems.unitCost})`,
      grossProfit: sql<number>`SUM(${saleItems.totalAmount}) - SUM(${saleItems.qty} * ${saleItems.unitCost})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(
      and(
        eq(sales.locationId, locationId),
        eq(sales.status, "completed"),
        gte(sales.createdAt, fromDate),
        lte(sales.createdAt, toDate)
      )
    )
    .groupBy(saleItems.productId)
    .orderBy(sql`SUM(${saleItems.qty}) DESC`)
    .limit(limit)
    .all();
}
