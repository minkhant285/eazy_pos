import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { stock, stockLedger, products, locations, users } from "../schemas/schema";
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
      reorderPoint: products.reorderPoint,
      reorderQty: products.reorderQty,
      costPrice: products.costPrice,
      stockValue: sql<number>`${stock.qtyOnHand} * ${products.costPrice}`,
      isLowStock: sql<boolean>`${stock.qtyOnHand} <= ${products.reorderPoint}`,
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

/** Get low-stock products at a location */
export function getLowStockProducts(locationId: string) {
  return db
    .select({
      productId: stock.productId,
      sku: products.sku,
      name: products.name,
      qtyOnHand: stock.qtyOnHand,
      reorderPoint: products.reorderPoint,
      reorderQty: products.reorderQty,
      shortfall: sql<number>`${products.reorderPoint} - ${stock.qtyOnHand}`,
    })
    .from(stock)
    .innerJoin(products, eq(stock.productId, products.id))
    .where(
      and(
        eq(stock.locationId, locationId),
        sql`${stock.qtyOnHand} <= ${products.reorderPoint}`,
        eq(products.isActive, true)
      )
    )
    .all();
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
