import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { sales, saleItems, payments, products, productVariants, customers, users, locations, stockLedger, deliveryMethods } from "../schemas/schema";
import { newId, now, NotFoundError, ValidationError, generateDocNumber } from "../utils";
import { upsertStock, appendLedger } from "./stock.service";
import { upsertVariantStock } from "./variant.service";
import { addLoyaltyPoints, updateOutstandingBalance } from "./customer.service";

// ─── Types ───────────────────────────────────────────────────

export type CartItem = {
  productId: string;
  variantId?: string;       // Optional variant ID
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
  deliveryAddressId?: string;
  deliveryMethodId?: string;
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
  orderType?: string;
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
  const sale = db.transaction((tx) => {
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

      let unitPrice: number;
      let unitCost: number;
      let stockResult: { qtyBefore: number; qtyAfter: number };

      if (cartItem.variantId) {
        const variant = tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, cartItem.variantId))
          .get();

        if (!variant || !variant.isActive) {
          throw new ValidationError(`Variant not available: ${cartItem.variantId}`);
        }

        unitPrice = cartItem.unitPrice ?? variant.sellingPrice;
        unitCost = variant.costPrice;
        stockResult = upsertVariantStock(cartItem.variantId, input.locationId, -cartItem.qty);
      } else {
        unitPrice = cartItem.unitPrice ?? product.sellingPrice;
        unitCost = product.costPrice;
        stockResult = upsertStock(product.id, input.locationId, -cartItem.qty);
      }

      const { qtyBefore, qtyAfter } = stockResult;
      const discount = cartItem.discountAmount ?? 0;
      const lineNet = cartItem.qty * unitPrice - discount;
      const lineTax = lineNet * product.taxRate;
      const lineTotal = lineNet + lineTax;

      subtotal += cartItem.qty * unitPrice;
      totalTax += lineTax;

      saleItemRows.push({
        id: newId(),
        saleId,
        productId: product.id,
        variantId: cartItem.variantId ?? null,
        qty: cartItem.qty,
        unitPrice,
        unitCost,
        discountAmount: discount,
        taxAmount: lineTax,
        totalAmount: lineTotal,
      });

      ledgerEntries.push({
        productId: product.id,
        locationId: input.locationId,
        variantId: cartItem.variantId,
        movementType: "sale_out" as const,
        qty: cartItem.qty,
        qtyBefore,
        qtyAfter,
        unitCost,
        totalCost: cartItem.qty * unitCost,
        referenceType: "sale" as const,
        referenceId: saleId,
        createdBy: input.cashierId,
      });
    }

    const headerDiscount = input.discountAmount ?? 0;
    const totalAmount = subtotal - headerDiscount + totalTax;
    const paidAmount = input.payments.reduce((s, p) => s + p.amount, 0);
    const debtAmount = totalAmount - paidAmount;
    const changeAmount = Math.max(0, paidAmount - totalAmount);

    if (debtAmount > 0 && !input.customerId) {
      throw new ValidationError(
        `Underpayment. Required: ${totalAmount.toFixed(2)}, Paid: ${paidAmount.toFixed(2)}. Select a customer to allow credit sales.`
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
        deliveryAddressId: input.deliveryAddressId ?? null,
        deliveryMethodId: input.deliveryMethodId ?? null,
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

    // ── Insert payments (may be empty for full-credit sales) ──
    if (input.payments.length > 0) {
      const paymentRows = input.payments.map((p) => ({
        id: newId(),
        saleId,
        method: p.method,
        amount: p.amount,
        reference: p.reference ?? null,
      }));
      tx.insert(payments).values(paymentRows).run();
    }

    // ── Append ledger entries ──
    for (const entry of ledgerEntries) {
      appendLedger(entry);
    }

    // ── Loyalty points (1 point per whole currency unit spent) ──
    if (input.customerId) {
      addLoyaltyPoints(input.customerId, Math.floor(paidAmount > 0 ? paidAmount : 0));
    }

    // ── Outstanding balance for credit/debt sales ──
    if (debtAmount > 0 && input.customerId) {
      updateOutstandingBalance(input.customerId, debtAmount);
    }

    return getSaleById(saleId);
  });

  return sale;
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
      deliveryAddressId: sales.deliveryAddressId,
      deliveryMethodId: sales.deliveryMethodId,
      deliveryMethodName: deliveryMethods.provider,
      deliveryMethodLogo: deliveryMethods.logoUrl,
      cashierId: sales.cashierId,
      cashierName: users.name,
      orderType: sales.orderType,
      onlineStatus: sales.onlineStatus,
      deliveryFee: sales.deliveryFee,
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
    .leftJoin(deliveryMethods, eq(sales.deliveryMethodId, deliveryMethods.id))
    .where(eq(sales.id, id))
    .get();

  if (!sale) throw new NotFoundError("Sale", id);

  const items = db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      variantId: saleItems.variantId,
      productName: products.name,
      productSku: products.sku,
      productImageUrl: products.imageUrl,
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
  if (params?.orderType) conditions.push(eq(sales.orderType, params.orderType as any));
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
      orderType: sales.orderType,
      totalAmount: sales.totalAmount,
      paidAmount: sales.paidAmount,
      createdAt: sales.createdAt,
      primaryPaymentMethod: sql<string>`(SELECT method FROM payments WHERE sale_id = ${sales.id} LIMIT 1)`,
      primaryPaymentReference: sql<string | null>`(SELECT reference FROM payments WHERE sale_id = ${sales.id} LIMIT 1)`,
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
      let qtyBefore: number;
      let qtyAfter: number;

      if (item.variantId) {
        ({ qtyBefore, qtyAfter } = upsertVariantStock(item.variantId, sale.locationId, item.qty));
      } else {
        ({ qtyBefore, qtyAfter } = upsertStock(item.productId, sale.locationId, item.qty));
      }

      appendLedger({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
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

      let qtyBefore: number;
      let qtyAfter: number;

      if (originalItem.variantId) {
        ({ qtyBefore, qtyAfter } = upsertVariantStock(originalItem.variantId, sale.locationId, ret.qty));
      } else {
        ({ qtyBefore, qtyAfter } = upsertStock(ret.productId, sale.locationId, ret.qty));
      }

      appendLedger({
        productId: ret.productId,
        variantId: originalItem.variantId ?? undefined,
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
        sql`${sales.status} IN ('completed', 'partially_refunded')`,
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

/** Daily profit summary (revenue, COGS, gross profit) grouped by date.
 *  Includes partially-returned and fully-refunded sales, deducting returned amounts
 *  from the stock ledger so figures reflect what was actually kept by customers. */
export function getDailyProfitSummary(locationId: string, fromDate: string, toDate: string) {
  const statusFilter = sql`${sales.status} IN ('completed', 'partially_refunded', 'refunded')`;
  const dateFilter   = and(eq(sales.locationId, locationId), statusFilter, gte(sales.createdAt, fromDate), lte(sales.createdAt, toDate));

  // Step 1a: revenue + transactions from sales only (no saleItems join — avoids double-counting)
  const baseSales = db
    .select({
      date:          sql<string>`DATE(${sales.createdAt})`,
      revenue:       sql<number>`SUM(${sales.totalAmount})`,
      totalDiscount: sql<number>`SUM(${sales.discountAmount})`,
      transactions:  sql<number>`COUNT(*)`,
    })
    .from(sales)
    .where(dateFilter)
    .groupBy(sql`DATE(${sales.createdAt})`)
    .orderBy(sql`DATE(${sales.createdAt})`)
    .all();

  // Step 1b: COGS from saleItems (join sales only for filtering)
  const cogsByDate = db
    .select({
      date: sql<string>`DATE(${sales.createdAt})`,
      cogs: sql<number>`SUM(${saleItems.qty} * ${saleItems.unitCost})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(dateFilter)
    .groupBy(sql`DATE(${sales.createdAt})`)
    .all();

  // Step 2: returned amounts from stock ledger (attributed to original sale date)
  const returnRows = db
    .select({
      date: sql<string>`DATE(${sales.createdAt})`,
      returnedRevenue: sql<number>`SUM(${stockLedger.qty} * ${saleItems.unitPrice})`,
      returnedCogs: sql<number>`SUM(${stockLedger.totalCost})`,
    })
    .from(stockLedger)
    .innerJoin(
      sales,
      and(
        eq(stockLedger.referenceId, sales.id),
        eq(stockLedger.referenceType, "sale"),
      )
    )
    .innerJoin(
      saleItems,
      and(
        eq(saleItems.saleId, sales.id),
        eq(saleItems.productId, stockLedger.productId),
        sql`COALESCE(${saleItems.variantId}, '') = COALESCE(${stockLedger.variantId}, '')`
      )
    )
    .where(
      and(
        eq(stockLedger.locationId, locationId),
        eq(stockLedger.movementType, "return_in"),
        sql`${sales.status} IN ('partially_refunded', 'refunded')`,
        gte(sales.createdAt, fromDate),
        lte(sales.createdAt, toDate)
      )
    )
    .groupBy(sql`DATE(${sales.createdAt})`)
    .all();

  // Step 3: merge — subtract returned amounts from each day's totals
  return baseSales.map((row) => {
    const cogsRow    = cogsByDate.find((r) => r.date === row.date);
    const ret        = returnRows.find((r) => r.date === row.date);
    const retRevenue = Number(ret?.returnedRevenue ?? 0);
    const retCogs    = Number(ret?.returnedCogs    ?? 0);
    const revenue    = Number(row.revenue)         - retRevenue;
    const cogs       = Number(cogsRow?.cogs ?? 0)  - retCogs;
    return {
      date:          row.date,
      revenue,
      cogs,
      grossProfit:   revenue - cogs,
      totalDiscount: Number(row.totalDiscount),
      transactions:  Number(row.transactions),
    };
  });
}

// ─── Online Orders ────────────────────────────────────────────

export type CreateOnlineOrderInput = {
  cashierId: string;
  customerId: string;
  locationId?: string;
  deliveryAddressId?: string;
  deliveryMethodId?: string;
  deliveryFee?: number;
  items: CartItem[];
  paymentMethod: typeof payments.$inferInsert["method"];
  paymentReference?: string;
  discountAmount?: number;
  notes?: string;
};

/** Create an online order (quotation) — stock is NOT deducted at creation */
export function createOnlineOrder(input: CreateOnlineOrderInput) {
  // Resolve locationId: use provided or fall back to default location
  const locationId = input.locationId ?? (() => {
    const loc = db.select({ id: locations.id }).from(locations).get();
    if (!loc) throw new ValidationError("No location found. Please create a location first.");
    return loc.id;
  })();

  const saleId = newId();
  const receiptNo = generateDocNumber("ONL");

  let subtotal = 0;
  let totalTax = 0;
  const saleItemRows: any[] = [];

  for (const cartItem of input.items) {
    const product = db.select().from(products).where(eq(products.id, cartItem.productId)).get();
    if (!product || !product.isActive) {
      throw new ValidationError(`Product not available: ${cartItem.productId}`);
    }

    let unitPrice: number;
    let unitCost: number;

    if (cartItem.variantId) {
      const variant = db.select().from(productVariants).where(eq(productVariants.id, cartItem.variantId)).get();
      if (!variant || !variant.isActive) {
        throw new ValidationError(`Variant not available: ${cartItem.variantId}`);
      }
      unitPrice = cartItem.unitPrice ?? variant.sellingPrice;
      unitCost = variant.costPrice;
    } else {
      unitPrice = cartItem.unitPrice ?? product.sellingPrice;
      unitCost = product.costPrice;
    }

    const discount = cartItem.discountAmount ?? 0;
    const lineNet = cartItem.qty * unitPrice - discount;
    const lineTax = lineNet * product.taxRate;
    const lineTotal = lineNet + lineTax;

    subtotal += cartItem.qty * unitPrice;
    totalTax += lineTax;

    saleItemRows.push({
      id: newId(),
      saleId,
      productId: product.id,
      variantId: cartItem.variantId ?? null,
      qty: cartItem.qty,
      unitPrice,
      unitCost,
      discountAmount: discount,
      taxAmount: lineTax,
      totalAmount: lineTotal,
    });
  }

  const headerDiscount = input.discountAmount ?? 0;
  const deliveryFee = input.deliveryFee ?? 0;
  const totalAmount = subtotal - headerDiscount + totalTax + deliveryFee;

  db.insert(sales).values({
    id: saleId,
    receiptNo,
    locationId,
    cashierId: input.cashierId,
    customerId: input.customerId,
    deliveryAddressId: input.deliveryAddressId ?? null,
    deliveryMethodId: input.deliveryMethodId ?? null,
    orderType: "online",
    onlineStatus: "processing",
    deliveryFee,
    status: "draft",
    subtotal,
    discountAmount: headerDiscount,
    taxAmount: totalTax,
    roundingAmount: 0,
    totalAmount,
    paidAmount: 0,
    changeAmount: 0,
    notes: input.notes ?? null,
  }).run();

  db.insert(saleItems).values(saleItemRows).run();

  db.insert(payments).values({
    id: newId(),
    saleId,
    method: input.paymentMethod,
    amount: totalAmount,
    reference: input.paymentReference ?? null,
  }).run();

  return getSaleById(saleId);
}

/** Confirm an online order — deducts stock and marks as completed */
export function confirmOnlineOrder(id: string) {
  return db.transaction(() => {
    const sale = getSaleById(id);
    if (sale.onlineStatus !== "processing") {
      throw new ValidationError(`Order is not in processing status`);
    }

    for (const item of sale.items) {
      let qtyBefore: number;
      let qtyAfter: number;

      if (item.variantId) {
        ({ qtyBefore, qtyAfter } = upsertVariantStock(item.variantId, sale.locationId, -item.qty));
      } else {
        ({ qtyBefore, qtyAfter } = upsertStock(item.productId, sale.locationId, -item.qty));
      }

      appendLedger({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        locationId: sale.locationId,
        movementType: "sale_out",
        qty: item.qty,
        qtyBefore,
        qtyAfter,
        unitCost: item.unitCost,
        totalCost: item.qty * item.unitCost,
        referenceType: "sale",
        referenceId: id,
        createdBy: sale.cashierId,
      });
    }

    db.update(sales).set({
      onlineStatus: "confirmed",
      status: "completed",
      paidAmount: sale.totalAmount,
      updatedAt: now(),
    }).where(eq(sales.id, id)).run();

    if (sale.customerId) {
      addLoyaltyPoints(sale.customerId, Math.floor(sale.totalAmount));
    }

    return getSaleById(id);
  });
}

/** Return an online order — restores stock */
/** Mark a confirmed order as ready to ship */
export function markReadyToShip(id: string) {
  const sale = getSaleById(id);
  if (sale.onlineStatus !== "confirmed") {
    throw new ValidationError("Only confirmed orders can be marked as ready to ship");
  }
  db.update(sales).set({ onlineStatus: "ready_to_ship", updatedAt: now() })
    .where(eq(sales.id, id)).run();
  return getSaleById(id);
}

/** Mark a ready-to-ship order as shipped */
export function markShipped(id: string) {
  const sale = getSaleById(id);
  if (sale.onlineStatus !== "ready_to_ship") {
    throw new ValidationError("Only ready-to-ship orders can be marked as shipped");
  }
  db.update(sales).set({ onlineStatus: "shipped", updatedAt: now() })
    .where(eq(sales.id, id)).run();
  return getSaleById(id);
}

/** Return an online order — restores stock (allowed from confirmed, ready_to_ship, or shipped) */
export function returnOnlineOrder(id: string) {
  return db.transaction(() => {
    const sale = getSaleById(id);
    if (!["confirmed", "ready_to_ship", "shipped"].includes(sale.onlineStatus ?? "")) {
      throw new ValidationError(`Order must be confirmed, ready to ship, or shipped to return`);
    }

    for (const item of sale.items) {
      let qtyBefore: number;
      let qtyAfter: number;

      if (item.variantId) {
        ({ qtyBefore, qtyAfter } = upsertVariantStock(item.variantId, sale.locationId, item.qty));
      } else {
        ({ qtyBefore, qtyAfter } = upsertStock(item.productId, sale.locationId, item.qty));
      }

      appendLedger({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        locationId: sale.locationId,
        movementType: "return_in",
        qty: item.qty,
        qtyBefore,
        qtyAfter,
        unitCost: item.unitCost,
        totalCost: item.qty * item.unitCost,
        referenceType: "sale",
        referenceId: id,
        notes: "Online order return",
        createdBy: sale.cashierId,
      });
    }

    db.update(sales).set({
      onlineStatus: "returned",
      status: "refunded",
      updatedAt: now(),
    }).where(eq(sales.id, id)).run();

    return getSaleById(id);
  });
}

export type UpdateOnlineOrderInput = Omit<CreateOnlineOrderInput, 'cashierId' | 'locationId'>;

/** Update a processing online order — replaces items and payments, recalculates totals */
export function updateOnlineOrder(id: string, input: UpdateOnlineOrderInput) {
  return db.transaction(() => {
    const sale = getSaleById(id);
    if (sale.onlineStatus !== "processing") {
      throw new ValidationError("Only processing orders can be edited");
    }

    let subtotal = 0;
    let totalTax = 0;
    const newItemRows: any[] = [];

    for (const cartItem of input.items) {
      const product = db.select().from(products).where(eq(products.id, cartItem.productId)).get();
      if (!product || !product.isActive) throw new ValidationError(`Product not available: ${cartItem.productId}`);

      let unitPrice: number;
      let unitCost: number;

      if (cartItem.variantId) {
        const variant = db.select().from(productVariants).where(eq(productVariants.id, cartItem.variantId)).get();
        if (!variant || !variant.isActive) throw new ValidationError(`Variant not available: ${cartItem.variantId}`);
        unitPrice = cartItem.unitPrice ?? variant.sellingPrice;
        unitCost = variant.costPrice;
      } else {
        unitPrice = cartItem.unitPrice ?? product.sellingPrice;
        unitCost = product.costPrice;
      }

      const discount = cartItem.discountAmount ?? 0;
      const lineNet = cartItem.qty * unitPrice - discount;
      const lineTax = lineNet * product.taxRate;
      const lineTotal = lineNet + lineTax;

      subtotal += cartItem.qty * unitPrice;
      totalTax += lineTax;

      newItemRows.push({
        id: newId(),
        saleId: id,
        productId: product.id,
        variantId: cartItem.variantId ?? null,
        qty: cartItem.qty,
        unitPrice,
        unitCost,
        discountAmount: discount,
        taxAmount: lineTax,
        totalAmount: lineTotal,
      });
    }

    const headerDiscount = input.discountAmount ?? 0;
    const deliveryFee = input.deliveryFee ?? 0;
    const totalAmount = subtotal - headerDiscount + totalTax + deliveryFee;

    // Replace items and payments
    db.delete(saleItems).where(eq(saleItems.saleId, id)).run();
    db.delete(payments).where(eq(payments.saleId, id)).run();
    db.insert(saleItems).values(newItemRows).run();
    db.insert(payments).values({
      id: newId(),
      saleId: id,
      method: input.paymentMethod,
      amount: totalAmount,
      reference: input.paymentReference ?? null,
    }).run();

    db.update(sales).set({
      customerId: input.customerId,
      deliveryAddressId: input.deliveryAddressId ?? null,
      deliveryMethodId: input.deliveryMethodId ?? null,
      deliveryFee,
      subtotal,
      discountAmount: headerDiscount,
      taxAmount: totalTax,
      totalAmount,
      notes: input.notes ?? null,
      updatedAt: now(),
    }).where(eq(sales.id, id)).run();

    return getSaleById(id);
  });
}

/** Delete a processing or returned online order completely */
export function deleteOnlineOrder(id: string) {
  const sale = getSaleById(id);
  if (sale.onlineStatus !== "processing" && sale.onlineStatus !== "returned") {
    throw new ValidationError("Only processing or returned orders can be deleted");
  }
  // Cascade delete handled by FK onDelete: cascade on saleItems and payments
  db.delete(sales).where(eq(sales.id, id)).run();
}

/** Move a returned online order back to processing (stock was already restored on return) */
export function reprocessOnlineOrder(id: string) {
  const sale = getSaleById(id);
  if (sale.onlineStatus !== "returned") {
    throw new ValidationError("Only returned orders can be moved back to processing");
  }
  db.update(sales).set({
    onlineStatus: "processing",
    status: "draft",
    paidAmount: 0,
    updatedAt: now(),
  }).where(eq(sales.id, id)).run();
  return getSaleById(id);
}

/** List online orders, optionally filtered by onlineStatus */
export function listOnlineOrders(onlineStatus?: string) {
  const conditions: any[] = [eq(sales.orderType, "online")];
  if (onlineStatus) conditions.push(eq(sales.onlineStatus, onlineStatus as any));

  return db
    .select({
      id: sales.id,
      receiptNo: sales.receiptNo,
      onlineStatus: sales.onlineStatus,
      totalAmount: sales.totalAmount,
      deliveryFee: sales.deliveryFee,
      createdAt: sales.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      deliveryMethodName: deliveryMethods.provider,
      deliveryMethodLogo: deliveryMethods.logoUrl,
      primaryPaymentMethod: sql<string>`(SELECT method FROM payments WHERE sale_id = ${sales.id} LIMIT 1)`,
      itemCount: sql<number>`(SELECT COUNT(*) FROM sale_items WHERE sale_id = ${sales.id})`,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(deliveryMethods, eq(sales.deliveryMethodId, deliveryMethods.id))
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(sales.createdAt))
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

// ─── Debt Payments ────────────────────────────────────────────

export type DebtPaymentInput = {
  method: typeof payments.$inferInsert["method"];
  amount: number;
  reference?: string;
};

/** Record a debt payment for a credit sale. Reduces customer outstanding balance. */
export function recordSaleDebtPayment(saleId: string, input: DebtPaymentInput) {
  return db.transaction(() => {
    const sale = getSaleById(saleId);

    const remaining = sale.totalAmount - sale.paidAmount;
    if (remaining <= 0) {
      throw new ValidationError("This sale has no outstanding debt.");
    }
    if (input.amount <= 0 || input.amount > remaining + 0.001) {
      throw new ValidationError(
        `Payment amount ${input.amount.toFixed(2)} exceeds remaining debt ${remaining.toFixed(2)}.`
      );
    }

    // Insert payment record
    db.insert(payments).values({
      id: newId(),
      saleId,
      method: input.method,
      amount: input.amount,
      reference: input.reference ?? null,
    }).run();

    // Update sale's paid amount
    const newPaid = sale.paidAmount + input.amount;
    db.update(sales)
      .set({ paidAmount: newPaid, updatedAt: now() })
      .where(eq(sales.id, saleId))
      .run();

    // Reduce customer outstanding balance
    if (sale.customerId) {
      updateOutstandingBalance(sale.customerId, -input.amount);
    }

    return getSaleById(saleId);
  });
}

/** List sales with outstanding debt (paidAmount < totalAmount) */
export function listDebtSales(customerId?: string) {
  const conditions: any[] = [
    sql`${sales.paidAmount} < ${sales.totalAmount}`,
    eq(sales.status, "completed"),
  ];
  if (customerId) conditions.push(eq(sales.customerId, customerId));

  return db
    .select({
      id: sales.id,
      receiptNo: sales.receiptNo,
      customerId: sales.customerId,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      paidAmount: sales.paidAmount,
      debtAmount: sql<number>`${sales.totalAmount} - ${sales.paidAmount}`,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(sales.createdAt))
    .all();
}
