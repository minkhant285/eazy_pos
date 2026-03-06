import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { stock, stockLedger, products, brands, locations, users } from "../schemas/schema";
import { newId, now, NotFoundError, InsufficientStockError } from "../utils";

// ─── Stock Read Operations ────────────────────────────────────

/** Get stock level for a specific product at a specific location */
export function getStock(productId: string, locationId: string) {
  return (
    db
      .select()
      .from(stock)
      .where(and(eq(stock.productId, productId), eq(stock.locationId, locationId)))
      .get() ?? null
  );
}

/** Get stock levels for a product across all locations */
export function getStockAllLocations(productId: string) {
  return db
    .select({
      locationId: stock.locationId,
      locationName: locations.name,
      qtyOnHand: stock.qtyOnHand,
      qtyReserved: stock.qtyReserved,
      qtyAvailable: stock.qtyAvailable,
      updatedAt: stock.updatedAt,
    })
    .from(stock)
    .leftJoin(locations, eq(stock.locationId, locations.id))
    .where(eq(stock.productId, productId))
    .all();
}

/** Get all stock for a location (full inventory snapshot) */
export function getLocationInventory(
  locationId: string,
  params?: { page?: number; pageSize?: number; search?: string }
) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(stock.locationId, locationId)];
  if (params?.search) {
    conditions.push(
      sql`(${products.name} LIKE ${"%" + params.search + "%"} OR ${products.sku} LIKE ${"%" + params.search + "%"})`
    );
  }

  const data = db
    .select({
      productId: stock.productId,
      sku: products.sku,
      name: products.name,
      unitOfMeasure: products.unitOfMeasure,
      qtyOnHand: stock.qtyOnHand,
      qtyReserved: stock.qtyReserved,
      qtyAvailable: stock.qtyAvailable,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      stockValue: sql<number>`${stock.qtyOnHand} * ${products.costPrice}`,
    })
    .from(stock)
    .innerJoin(products, eq(stock.productId, products.id))
    .where(and(...conditions))
    .limit(pageSize)
    .offset(offset)
    .all();

  const total =
    db
      .select({ c: sql<number>`COUNT(*)` })
      .from(stock)
      .where(eq(stock.locationId, locationId))
      .get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Count products at or below a qty threshold at a location */
export function getLowStockCount(locationId: string, threshold: number) {
  const result = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(stock)
    .innerJoin(products, eq(stock.productId, products.id))
    .where(
      and(
        eq(stock.locationId, locationId),
        eq(products.isActive, true),
        sql`${stock.qtyOnHand} <= ${threshold}`
      )
    )
    .get();
  return { count: result?.count ?? 0 };
}

/** Get total inventory value for a location */
export function getInventoryValue(locationId: string) {
  return db
    .select({
      totalValue: sql<number>`SUM(${stock.qtyOnHand} * ${products.costPrice})`,
      totalItems: sql<number>`COUNT(*)`,
      totalQty: sql<number>`SUM(${stock.qtyOnHand})`,
    })
    .from(stock)
    .innerJoin(products, eq(stock.productId, products.id))
    .where(eq(stock.locationId, locationId))
    .get();
}

// ─── Stock Ledger Read Operations ────────────────────────────

export type LedgerFilter = {
  productId?: string;
  locationId?: string;
  movementType?: string;
  referenceType?: string;
  referenceId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
};

/** Query stock ledger with filters */
export function queryStockLedger(params: LedgerFilter) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions:any[] = [];
  if (params.productId) conditions.push(eq(stockLedger.productId, params.productId));
  if (params.locationId) conditions.push(eq(stockLedger.locationId, params.locationId));
  if (params.movementType) conditions.push(eq(stockLedger.movementType, params.movementType as any));
  if (params.referenceType) conditions.push(eq(stockLedger.referenceType, params.referenceType as any));
  if (params.referenceId) conditions.push(eq(stockLedger.referenceId, params.referenceId));
  if (params.fromDate) conditions.push(gte(stockLedger.createdAt, params.fromDate));
  if (params.toDate) conditions.push(lte(stockLedger.createdAt, params.toDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db
    .select({
      id: stockLedger.id,
      productId: stockLedger.productId,
      productSku: products.sku,
      productName: products.name,
      locationId: stockLedger.locationId,
      locationName: locations.name,
      movementType: stockLedger.movementType,
      qty: stockLedger.qty,
      qtyBefore: stockLedger.qtyBefore,
      qtyAfter: stockLedger.qtyAfter,
      unitCost: stockLedger.unitCost,
      totalCost: stockLedger.totalCost,
      referenceType: stockLedger.referenceType,
      referenceId: stockLedger.referenceId,
      notes: stockLedger.notes,
      createdBy: users.name,
      createdAt: stockLedger.createdAt,
    })
    .from(stockLedger)
    .leftJoin(products, eq(stockLedger.productId, products.id))
    .leftJoin(locations, eq(stockLedger.locationId, locations.id))
    .leftJoin(users, eq(stockLedger.createdBy, users.id))
    .where(where)
    .orderBy(desc(stockLedger.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  const total =
    db
      .select({ c: sql<number>`COUNT(*)` })
      .from(stockLedger)
      .where(where)
      .get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Reconstruct stock balance from ledger (useful for reconciliation) */
export function reconstructStockFromLedger(productId: string, locationId: string) {
  const result = db
    .select({
      computedQty: sql<number>`
        SUM(
          CASE
            WHEN movement_type IN ('purchase_in','return_in','adjustment_in','transfer_in','opening_balance','production_in')
            THEN qty
            ELSE -qty
          END
        )
      `,
      totalEntries: sql<number>`COUNT(*)`,
    })
    .from(stockLedger)
    .where(
      and(eq(stockLedger.productId, productId), eq(stockLedger.locationId, locationId))
    )
    .get();

  return result;
}

// ─── Stock Write Operations (Internal helpers) ────────────────
// These are used by other services (sale, purchase, adjustment)
// but exposed here so you can use them directly if needed.

/** Upsert stock row (used internally by all movement services) */
export function upsertStock(
  productId: string,
  locationId: string,
  delta: number // positive = in, negative = out
): { qtyBefore: number; qtyAfter: number } {
  const existing = getStock(productId, locationId);
  const qtyBefore = existing?.qtyOnHand ?? 0;
  const qtyAfter = qtyBefore + delta;

  if (qtyAfter < 0) {
    throw new InsufficientStockError(productId, qtyBefore, Math.abs(delta));
  }

  if (existing) {
    db.update(stock)
      .set({ qtyOnHand: qtyAfter, updatedAt: now() })
      .where(and(eq(stock.productId, productId), eq(stock.locationId, locationId)))
      .run();
  } else {
    db.insert(stock)
      .values({
        id: newId(),
        productId,
        locationId,
        qtyOnHand: qtyAfter,
        qtyReserved: 0,
      })
      .run();
  }

  return { qtyBefore, qtyAfter };
}

/** Append a ledger entry (append-only - never call update/delete on ledger) */
export function appendLedger(entry: {
  productId: string;
  locationId: string;
  variantId?: string;
  movementType: typeof stockLedger.$inferInsert["movementType"];
  qty: number;
  qtyBefore: number;
  qtyAfter: number;
  unitCost?: number;
  totalCost?: number;
  referenceType?: typeof stockLedger.$inferInsert["referenceType"];
  referenceId?: string;
  notes?: string;
  createdBy?: string;
}) {
  db.insert(stockLedger)
    .values({
      id: newId(),
      ...entry,
      variantId: entry.variantId ?? null,
      unitCost: entry.unitCost ?? null,
      totalCost: entry.totalCost ?? null,
      referenceType: entry.referenceType ?? null,
      referenceId: entry.referenceId ?? null,
      notes: entry.notes ?? null,
      createdBy: entry.createdBy ?? null,
    })
    .run();
}

/** Set opening balance for a product at a location */
export function setOpeningBalance(
  productId: string,
  locationId: string,
  qty: number,
  unitCost: number,
  createdBy: string
) {
  return db.transaction((tx) => {
    const existing = getStock(productId, locationId);
    if (existing && existing.qtyOnHand !== 0) {
      throw new Error(
        "Opening balance can only be set when current stock is 0. Use adjustment instead."
      );
    }

    const qtyBefore = existing?.qtyOnHand ?? 0;

    if (existing) {
      tx.update(stock)
        .set({ qtyOnHand: qty, updatedAt: now() })
        .where(and(eq(stock.productId, productId), eq(stock.locationId, locationId)))
        .run();
    } else {
      tx.insert(stock)
        .values({ id: newId(), productId, locationId, qtyOnHand: qty, qtyReserved: 0 })
        .run();
    }

    tx.insert(stockLedger)
      .values({
        id: newId(),
        productId,
        locationId,
        movementType: "opening_balance",
        qty,
        qtyBefore,
        qtyAfter: qty,
        unitCost,
        totalCost: qty * unitCost,
        referenceType: null,
        referenceId: null,
        createdBy,
      })
      .run();

    return { qtyBefore, qtyAfter: qty };
  });
}

/** Update reserved quantity (e.g. for pending orders) */
export function updateReservedQty(productId: string, locationId: string, delta: number) {
  const existing = getStock(productId, locationId);
  if (!existing) throw new NotFoundError("Stock", `${productId}@${locationId}`);

  const newReserved = existing.qtyReserved + delta;
  if (newReserved < 0) throw new Error("Reserved qty cannot go below 0");

  db.update(stock)
    .set({ qtyReserved: newReserved, updatedAt: now() })
    .where(and(eq(stock.productId, productId), eq(stock.locationId, locationId)))
    .run();
}

// ─── All-products inventory view (includes products with no stock record) ───

/**
 * List ALL active products for a location, LEFT JOINing stock.
 * Products with no stock record show qty 0 and hasRecord=false.
 * This lets the UI display and initialize stock for every product.
 */
export function listAllProductsForLocation(
  locationId: string,
  params?: { page?: number; pageSize?: number; search?: string; isActive?: boolean; lowStock?: boolean; lowStockThreshold?: number; brandId?: string }
) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (params?.isActive !== undefined) {
    conditions.push(eq(products.isActive, params.isActive));
  } else {
    conditions.push(eq(products.isActive, true));
  }
  if (params?.search) {
    conditions.push(
      sql`(${products.name} LIKE ${"%" + params.search + "%"} OR ${products.sku} LIKE ${"%" + params.search + "%"})`
    );
  }
  if (params?.lowStock && params.lowStockThreshold !== undefined) {
    conditions.push(sql`${stock.id} IS NOT NULL`);
    conditions.push(sql`COALESCE(${stock.qtyOnHand}, 0) <= ${params.lowStockThreshold}`);
  }
  if (params?.brandId) conditions.push(eq(products.brandId, params.brandId));
  const where = and(...conditions);

  const data = db
    .select({
      productId: products.id,
      sku: products.sku,
      barcode: products.barcode,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      brandId: products.brandId,
      brandName: brands.name,
      unitOfMeasure: products.unitOfMeasure,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      taxRate: products.taxRate,
      isSerialized: products.isSerialized,
      imageUrl: products.imageUrl,
      qtyOnHand:    sql<number>`COALESCE(${stock.qtyOnHand}, 0)`,
      qtyReserved:  sql<number>`COALESCE(${stock.qtyReserved}, 0)`,
      qtyAvailable: sql<number>`COALESCE(${stock.qtyAvailable}, 0)`,
      hasRecord:    sql<boolean>`CASE WHEN ${stock.id} IS NOT NULL THEN 1 ELSE 0 END`,
      stockValue:   sql<number>`COALESCE(${stock.qtyOnHand}, 0) * ${products.costPrice}`,
      hasVariants:  sql<number>`EXISTS (SELECT 1 FROM product_variants WHERE product_id = ${products.id} AND is_active = 1)`,
    })
    .from(products)
    .leftJoin(
      stock,
      and(eq(stock.productId, products.id), eq(stock.locationId, locationId))
    )
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(where)
    .limit(pageSize)
    .offset(offset)
    .all();

  const totalQuery = db.select({ c: sql<number>`COUNT(*)` }).from(products);
  if (params?.lowStock) {
    totalQuery.leftJoin(stock, and(eq(stock.productId, products.id), eq(stock.locationId, locationId)));
  }
  const total = totalQuery.where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Set the stock quantity for a product at a location to any value.
 * Works whether a stock record exists or not.
 * Records a ledger entry (opening_balance for first-time, adjustment otherwise).
 */
export function setStockQty(
  productId: string,
  locationId: string,
  newQty: number,
  unitCost: number,
  createdBy?: string
) {
  return db.transaction((tx) => {
    const existing = getStock(productId, locationId);
    const currentQty = existing?.qtyOnHand ?? 0;
    const delta = newQty - currentQty;

    if (delta === 0) return { qtyBefore: currentQty, qtyAfter: newQty };

    if (existing) {
      tx.update(stock)
        .set({ qtyOnHand: newQty, updatedAt: now() })
        .where(and(eq(stock.productId, productId), eq(stock.locationId, locationId)))
        .run();
    } else {
      tx.insert(stock)
        .values({ id: newId(), productId, locationId, qtyOnHand: newQty, qtyReserved: 0 })
        .run();
    }

    const movementType =
      currentQty === 0 && delta > 0
        ? ("opening_balance" as const)
        : delta > 0
        ? ("adjustment_in" as const)
        : ("adjustment_out" as const);

    tx.insert(stockLedger)
      .values({
        id: newId(),
        productId,
        locationId,
        movementType,
        qty: Math.abs(delta),
        qtyBefore: currentQty,
        qtyAfter: newQty,
        unitCost,
        totalCost: Math.abs(delta) * unitCost,
        notes: "Manual stock set",
        createdBy: createdBy ?? null,
        referenceType: null,
        referenceId: null,
      })
      .run();

    return { qtyBefore: currentQty, qtyAfter: newQty };
  });
}
