import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../db";
import {
  stockAdjustments,
  stockAdjustmentItems,
  products,
  locations,
  users,
} from "../schemas/schema";
import { newId, now, NotFoundError, ValidationError } from "../utils";
import { getStock, upsertStock, appendLedger } from "./stock.service";

// ─── Types ───────────────────────────────────────────────────

export type AdjustmentItemInput = {
  productId: string;
  qtyActual: number;  // The physical count / new qty
  reason?: string;
};

export type CreateAdjustmentInput = {
  locationId: string;
  adjustmentType: "cycle_count" | "damage" | "expiry" | "found" | "other";
  items: AdjustmentItemInput[];
  notes?: string;
  createdBy: string;
};

// ─── CRUD ────────────────────────────────────────────────────

/** Create a stock adjustment (draft — requires approval) */
export function createStockAdjustment(input: CreateAdjustmentInput) {
  const id = newId();
  const itemRows: typeof stockAdjustmentItems.$inferInsert[] = [];

  for (const item of input.items) {
    const product = db.select().from(products).where(eq(products.id, item.productId)).get();
    if (!product) throw new NotFoundError("Product", item.productId);

    // Get current system qty
    const currentStock = getStock(item.productId, input.locationId);
    const qtySystem = currentStock?.qtyOnHand ?? 0;

    itemRows.push({
      id: newId(),
      adjustmentId: id,
      productId: item.productId,
      qtySystem,
      qtyActual: item.qtyActual,
      unitCost: product.costPrice,
      reason: item.reason ?? null,
    });
  }

  db.insert(stockAdjustments)
    .values({
      id,
      locationId: input.locationId,
      adjustmentType: input.adjustmentType,
      status: "draft",
      notes: input.notes ?? null,
      createdBy: input.createdBy,
      approvedBy: null,
      approvedAt: null,
    })
    .run();

  if (itemRows.length > 0) {
    db.insert(stockAdjustmentItems).values(itemRows).run();
  }

  return getStockAdjustmentById(id);
}

/** Get adjustment with items */
export function getStockAdjustmentById(id: string) {
  const adj = db
    .select({
      id: stockAdjustments.id,
      locationId: stockAdjustments.locationId,
      locationName: locations.name,
      adjustmentType: stockAdjustments.adjustmentType,
      status: stockAdjustments.status,
      notes: stockAdjustments.notes,
      createdBy: users.name,
      approvedBy: stockAdjustments.approvedBy,
      approvedAt: stockAdjustments.approvedAt,
      createdAt: stockAdjustments.createdAt,
    })
    .from(stockAdjustments)
    .leftJoin(locations, eq(stockAdjustments.locationId, locations.id))
    .leftJoin(users, eq(stockAdjustments.createdBy, users.id))
    .where(eq(stockAdjustments.id, id))
    .get();

  if (!adj) throw new NotFoundError("Stock Adjustment", id);

  const items = db
    .select({
      id: stockAdjustmentItems.id,
      productId: stockAdjustmentItems.productId,
      productName: products.name,
      productSku: products.sku,
      qtySystem: stockAdjustmentItems.qtySystem,
      qtyActual: stockAdjustmentItems.qtyActual,
      qtyDiff: stockAdjustmentItems.qtyDiff,
      unitCost: stockAdjustmentItems.unitCost,
      costImpact: sql<number>`${stockAdjustmentItems.qtyDiff} * ${stockAdjustmentItems.unitCost}`,
      reason: stockAdjustmentItems.reason,
    })
    .from(stockAdjustmentItems)
    .leftJoin(products, eq(stockAdjustmentItems.productId, products.id))
    .where(eq(stockAdjustmentItems.adjustmentId, id))
    .all();

  const totalCostImpact = items.reduce((s, i) => s + (i.costImpact ?? 0), 0);

  return { ...adj, items, totalCostImpact };
}

/** List adjustments */
export function listStockAdjustments(params?: {
  locationId?: string;
  status?: string;
  adjustmentType?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions:any[] = [];
  if (params?.locationId) conditions.push(eq(stockAdjustments.locationId, params.locationId));
  if (params?.status) conditions.push(eq(stockAdjustments.status, params.status as any));
  if (params?.adjustmentType) {
    conditions.push(eq(stockAdjustments.adjustmentType, params.adjustmentType as any));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db
    .select({
      id: stockAdjustments.id,
      locationName: locations.name,
      adjustmentType: stockAdjustments.adjustmentType,
      status: stockAdjustments.status,
      itemCount: sql<number>`(SELECT COUNT(*) FROM stock_adjustment_items WHERE adjustment_id = ${stockAdjustments.id})`,
      createdAt: stockAdjustments.createdAt,
    })
    .from(stockAdjustments)
    .leftJoin(locations, eq(stockAdjustments.locationId, locations.id))
    .where(where)
    .orderBy(desc(stockAdjustments.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  const total =
    db.select({ c: sql<number>`COUNT(*)` }).from(stockAdjustments).where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Update adjustment notes (only in draft) */
export function updateAdjustmentNotes(id: string, notes: string) {
  const adj = getStockAdjustmentById(id);
  if (adj.status !== "draft") throw new ValidationError("Can only edit draft adjustments");

  db.update(stockAdjustments)
    .set({ notes, updatedAt: now() })
    .where(eq(stockAdjustments.id, id))
    .run();
  return getStockAdjustmentById(id);
}

/** Add item to draft adjustment */
export function addAdjustmentItem(adjustmentId: string, item: AdjustmentItemInput) {
  const adj = getStockAdjustmentById(adjustmentId);
  if (adj.status !== "draft") throw new ValidationError("Can only add items to draft adjustments");

  const product = db.select().from(products).where(eq(products.id, item.productId)).get();
  if (!product) throw new NotFoundError("Product", item.productId);

  const currentStock = getStock(item.productId, adj.locationId);

  db.insert(stockAdjustmentItems)
    .values({
      id: newId(),
      adjustmentId,
      productId: item.productId,
      qtySystem: currentStock?.qtyOnHand ?? 0,
      qtyActual: item.qtyActual,
      unitCost: product.costPrice,
      reason: item.reason ?? null,
    })
    .run();

  return getStockAdjustmentById(adjustmentId);
}

/** Remove item from draft adjustment */
export function removeAdjustmentItem(adjustmentId: string, itemId: string) {
  const adj = getStockAdjustmentById(adjustmentId);
  if (adj.status !== "draft") {
    throw new ValidationError("Can only remove items from draft adjustments");
  }
  db.delete(stockAdjustmentItems).where(eq(stockAdjustmentItems.id, itemId)).run();
  return getStockAdjustmentById(adjustmentId);
}

/**
 * Approve and apply a stock adjustment.
 * This is the critical step — it updates stock and writes ledger entries.
 */
export function approveStockAdjustment(id: string, approvedBy: string) {
  return db.transaction((tx) => {
    const adj = getStockAdjustmentById(id);

    if (adj.status !== "draft") {
      throw new ValidationError(`Cannot approve adjustment in status: ${adj.status}`);
    }

    for (const item of adj.items) {
      const diff = (item.qtyDiff as number) ?? item.qtyActual - item.qtySystem;
      if (diff === 0) continue; // No change needed

      const isPositive = diff > 0;
      const qty = Math.abs(diff);

      const { qtyBefore, qtyAfter } = upsertStock(
        item.productId,
        adj.locationId,
        diff // positive or negative
      );

      appendLedger({
        productId: item.productId,
        locationId: adj.locationId,
        movementType: isPositive ? "adjustment_in" : "adjustment_out",
        qty,
        qtyBefore,
        qtyAfter,
        unitCost: item.unitCost,
        totalCost: qty * item.unitCost,
        referenceType: "stock_adjustment",
        referenceId: id,
        notes: item.reason ?? adj.adjustmentType,
        createdBy: approvedBy,
      });
    }

    tx.update(stockAdjustments)
      .set({
        status: "approved",
        approvedBy,
        approvedAt: now(),
        updatedAt: now(),
      })
      .where(eq(stockAdjustments.id, id))
      .run();

    return getStockAdjustmentById(id);
  });
}

/** Reject a stock adjustment */
export function rejectStockAdjustment(id: string, rejectedBy: string) {
  const adj = getStockAdjustmentById(id);
  if (adj.status !== "draft") {
    throw new ValidationError(`Cannot reject adjustment in status: ${adj.status}`);
  }

  db.update(stockAdjustments)
    .set({
      status: "rejected",
      approvedBy: rejectedBy,
      approvedAt: now(),
      updatedAt: now(),
    })
    .where(eq(stockAdjustments.id, id))
    .run();

  return getStockAdjustmentById(id);
}
