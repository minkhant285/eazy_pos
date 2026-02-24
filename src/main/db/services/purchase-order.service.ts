import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db } from "../db";
import {
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
  locations,
  products,
  users,
} from "../schemas/schema";
import { newId, now, NotFoundError, ValidationError, generateDocNumber } from "../utils";
import { upsertStock, appendLedger } from "./stock.service";

// ─── Types ───────────────────────────────────────────────────

export type POItem = {
  productId: string;
  qtyOrdered: number;
  unitCost: number;
};

export type CreatePOInput = {
  supplierId: string;
  locationId: string;
  items: POItem[];
  expectedAt?: string;
  notes?: string;
  createdBy: string;
};

export type UpdatePOInput = {
  supplierId?: string;
  locationId?: string;
  expectedAt?: string;
  notes?: string;
};

export type ReceiveItemInput = {
  purchaseOrderItemId: string;
  productId: string;
  qtyReceived: number;
  unitCost?: number; // Override cost if different from PO
};

// ─── CRUD ────────────────────────────────────────────────────

/** Create a purchase order (draft) */
export function createPurchaseOrder(input: CreatePOInput) {
  const id = newId();
  const poNumber = generateDocNumber("PO");

  let subtotal = 0;
  const itemRows: typeof purchaseOrderItems.$inferInsert[] = [];

  for (const item of input.items) {
    const product = db.select().from(products).where(eq(products.id, item.productId)).get();
    if (!product) throw new NotFoundError("Product", item.productId);

    const totalCost = item.qtyOrdered * item.unitCost;
    subtotal += totalCost;

    itemRows.push({
      id: newId(),
      purchaseOrderId: id,
      productId: item.productId,
      qtyOrdered: item.qtyOrdered,
      qtyReceived: 0,
      unitCost: item.unitCost,
      totalCost,
    });
  }

  db.insert(purchaseOrders)
    .values({
      id,
      poNumber,
      supplierId: input.supplierId,
      locationId: input.locationId,
      status: "draft",
      expectedAt: input.expectedAt ?? null,
      subtotal,
      taxAmount: 0,
      totalAmount: subtotal,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
    })
    .run();

  db.insert(purchaseOrderItems).values(itemRows).run();

  return getPurchaseOrderById(id);
}

/** Get PO with items */
export function getPurchaseOrderById(id: string) {
  const po = db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      locationId: purchaseOrders.locationId,
      locationName: locations.name,
      status: purchaseOrders.status,
      expectedAt: purchaseOrders.expectedAt,
      subtotal: purchaseOrders.subtotal,
      taxAmount: purchaseOrders.taxAmount,
      totalAmount: purchaseOrders.totalAmount,
      notes: purchaseOrders.notes,
      createdBy: users.name,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(locations, eq(purchaseOrders.locationId, locations.id))
    .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
    .where(eq(purchaseOrders.id, id))
    .get();

  if (!po) throw new NotFoundError("Purchase Order", id);

  const items = db
    .select({
      id: purchaseOrderItems.id,
      productId: purchaseOrderItems.productId,
      productName: products.name,
      productSku: products.sku,
      qtyOrdered: purchaseOrderItems.qtyOrdered,
      qtyReceived: purchaseOrderItems.qtyReceived,
      qtyPending: sql<number>`${purchaseOrderItems.qtyOrdered} - ${purchaseOrderItems.qtyReceived}`,
      unitCost: purchaseOrderItems.unitCost,
      totalCost: purchaseOrderItems.totalCost,
    })
    .from(purchaseOrderItems)
    .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
    .where(eq(purchaseOrderItems.purchaseOrderId, id))
    .all();

  return { ...po, items };
}

/** List POs with filters */
export function listPurchaseOrders(params?: {
  supplierId?: string;
  locationId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions:any[] = [];
  if (params?.supplierId) conditions.push(eq(purchaseOrders.supplierId, params.supplierId));
  if (params?.locationId) conditions.push(eq(purchaseOrders.locationId, params.locationId));
  if (params?.status) conditions.push(eq(purchaseOrders.status, params.status as any));
  if (params?.fromDate) conditions.push(gte(purchaseOrders.createdAt, params.fromDate));
  if (params?.toDate) conditions.push(lte(purchaseOrders.createdAt, params.toDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierName: suppliers.name,
      locationName: locations.name,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      expectedAt: purchaseOrders.expectedAt,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(locations, eq(purchaseOrders.locationId, locations.id))
    .where(where)
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  const total =
    db.select({ c: sql<number>`COUNT(*)` }).from(purchaseOrders).where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Update PO header (only allowed in draft/sent status) */
export function updatePurchaseOrder(id: string, input: UpdatePOInput) {
  const po = getPurchaseOrderById(id);
  if (!["draft", "sent"].includes(po.status)) {
    throw new ValidationError(`Cannot update PO in status: ${po.status}`);
  }

  db.update(purchaseOrders)
    .set({ ...input, updatedAt: now() })
    .where(eq(purchaseOrders.id, id))
    .run();

  return getPurchaseOrderById(id);
}

/** Add item to draft PO */
export function addPOItem(poId: string, item: POItem) {
  const po = getPurchaseOrderById(poId);
  if (po.status !== "draft") {
    throw new ValidationError("Can only add items to draft purchase orders");
  }

  const totalCost = item.qtyOrdered * item.unitCost;

  db.insert(purchaseOrderItems)
    .values({
      id: newId(),
      purchaseOrderId: poId,
      productId: item.productId,
      qtyOrdered: item.qtyOrdered,
      qtyReceived: 0,
      unitCost: item.unitCost,
      totalCost,
    })
    .run();

  // Recalculate PO subtotal
  recalculatePOTotals(poId);

  return getPurchaseOrderById(poId);
}

/** Remove item from draft PO */
export function removePOItem(poId: string, poItemId: string) {
  const po = getPurchaseOrderById(poId);
  if (po.status !== "draft") {
    throw new ValidationError("Can only remove items from draft purchase orders");
  }

  db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, poItemId)).run();
  recalculatePOTotals(poId);

  return getPurchaseOrderById(poId);
}

/** Update item qty/cost in draft PO */
export function updatePOItem(poId: string, poItemId: string, input: Partial<POItem>) {
  const po = getPurchaseOrderById(poId);
  if (po.status !== "draft") {
    throw new ValidationError("Can only edit items in draft purchase orders");
  }

  const item = db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.id, poItemId))
    .get();
  if (!item) throw new NotFoundError("PO Item", poItemId);

  const newQty = input.qtyOrdered ?? item.qtyOrdered;
  const newCost = input.unitCost ?? item.unitCost;

  db.update(purchaseOrderItems)
    .set({ qtyOrdered: newQty, unitCost: newCost, totalCost: newQty * newCost })
    .where(eq(purchaseOrderItems.id, poItemId))
    .run();

  recalculatePOTotals(poId);
  return getPurchaseOrderById(poId);
}

/** Mark PO as sent to supplier */
export function sendPurchaseOrder(id: string) {
  const po = getPurchaseOrderById(id);
  if (po.status !== "draft") {
    throw new ValidationError("Only draft POs can be sent");
  }
  db.update(purchaseOrders)
    .set({ status: "sent", updatedAt: now() })
    .where(eq(purchaseOrders.id, id))
    .run();
  return getPurchaseOrderById(id);
}

/** Receive goods against a PO (updates stock + ledger) */
export function receivePurchaseOrder(
  poId: string,
  receivedItems: ReceiveItemInput[],
  receivedBy: string
) {
  return db.transaction((tx) => {
    const po = getPurchaseOrderById(poId);

    if (!["sent", "partial"].includes(po.status)) {
      throw new ValidationError(`Cannot receive goods for PO in status: ${po.status}`);
    }

    for (const recv of receivedItems) {
      const poItem = po.items.find((i) => i.id === recv.purchaseOrderItemId);
      if (!poItem) throw new NotFoundError("PO Item", recv.purchaseOrderItemId);

      const remaining = poItem.qtyOrdered - poItem.qtyReceived;
      if (recv.qtyReceived > remaining) {
        throw new ValidationError(
          `Receiving ${recv.qtyReceived} exceeds remaining qty ${remaining} for product ${recv.productId}`
        );
      }

      const actualCost = recv.unitCost ?? poItem.unitCost;

      // Update stock
      const { qtyBefore, qtyAfter } = upsertStock(recv.productId, po.locationId, recv.qtyReceived);

      // Update product cost price (last cost)
      tx.update(products)
        .set({ costPrice: actualCost, updatedAt: now() })
        .where(eq(products.id, recv.productId))
        .run();

      // Update PO item received qty
      tx.update(purchaseOrderItems)
        .set({ qtyReceived: poItem.qtyReceived + recv.qtyReceived })
        .where(eq(purchaseOrderItems.id, recv.purchaseOrderItemId))
        .run();

      // Append ledger
      appendLedger({
        productId: recv.productId,
        locationId: po.locationId,
        movementType: "purchase_in",
        qty: recv.qtyReceived,
        qtyBefore,
        qtyAfter,
        unitCost: actualCost,
        totalCost: recv.qtyReceived * actualCost,
        referenceType: "purchase_order",
        referenceId: poId,
        createdBy: receivedBy,
      });
    }

    // Determine new PO status
    const updatedPO = getPurchaseOrderById(poId);
    const isFullyReceived = updatedPO.items.every((i) => i.qtyReceived >= i.qtyOrdered);

    tx.update(purchaseOrders)
      .set({
        status: isFullyReceived ? "received" : "partial",
        updatedAt: now(),
      })
      .where(eq(purchaseOrders.id, poId))
      .run();

    return getPurchaseOrderById(poId);
  });
}

/** Cancel a PO */
export function cancelPurchaseOrder(id: string) {
  const po = getPurchaseOrderById(id);
  if (["received", "cancelled"].includes(po.status)) {
    throw new ValidationError(`Cannot cancel PO in status: ${po.status}`);
  }
  db.update(purchaseOrders)
    .set({ status: "cancelled", updatedAt: now() })
    .where(eq(purchaseOrders.id, id))
    .run();
  return getPurchaseOrderById(id);
}

// ─── Internal helpers ─────────────────────────────────────────

function recalculatePOTotals(poId: string) {
  const result = db
    .select({ subtotal: sql<number>`SUM(total_cost)` })
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, poId))
    .get();

  const subtotal = result?.subtotal ?? 0;
  db.update(purchaseOrders)
    .set({ subtotal, totalAmount: subtotal, updatedAt: now() })
    .where(eq(purchaseOrders.id, poId))
    .run();
}
