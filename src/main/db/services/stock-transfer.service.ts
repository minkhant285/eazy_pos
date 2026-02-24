import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../db";
import { stockTransfers, stockTransferItems, products, locations, users } from "../schemas/schema";
import { newId, now, NotFoundError, ValidationError, generateDocNumber } from "../utils";
import { getStock, upsertStock, appendLedger } from "./stock.service";

// ─── Types ───────────────────────────────────────────────────

export type TransferItem = {
  productId: string;
  qtySent: number;
};

export type CreateTransferInput = {
  fromLocationId: string;
  toLocationId: string;
  items: TransferItem[];
  notes?: string;
  createdBy: string;
};

export type ReceiveTransferItem = {
  transferItemId: string;
  qtyReceived: number; // May differ from sent (e.g. damaged in transit)
};

// ─── CRUD ────────────────────────────────────────────────────

/**
 * Create and immediately dispatch a stock transfer.
 * Deducts stock from source location right away.
 * Stock is added to destination when received.
 */
export function createStockTransfer(input: CreateTransferInput) {
  if (input.fromLocationId === input.toLocationId) {
    throw new ValidationError("Source and destination locations must be different");
  }

  return db.transaction((tx) => {
    const id = newId();
    const transferNo = generateDocNumber("TRF");
    const itemRows: typeof stockTransferItems.$inferInsert[] = [];

    for (const item of input.items) {
      const product = tx.select().from(products).where(eq(products.id, item.productId)).get();
      if (!product) throw new NotFoundError("Product", item.productId);

      // Check source stock
      const sourceStock = getStock(item.productId, input.fromLocationId);
      if (!sourceStock || sourceStock.qtyOnHand < item.qtySent) {
        throw new ValidationError(
          `Insufficient stock for product ${product.sku} at source location. ` +
            `Available: ${sourceStock?.qtyOnHand ?? 0}, Requested: ${item.qtySent}`
        );
      }

      // Deduct from source immediately
      const { qtyBefore, qtyAfter } = upsertStock(
        item.productId,
        input.fromLocationId,
        -item.qtySent
      );

      appendLedger({
        productId: item.productId,
        locationId: input.fromLocationId,
        movementType: "transfer_out",
        qty: item.qtySent,
        qtyBefore,
        qtyAfter,
        unitCost: product.costPrice,
        totalCost: item.qtySent * product.costPrice,
        referenceType: "transfer",
        referenceId: id,
        notes: `Transfer to location ${input.toLocationId}`,
        createdBy: input.createdBy,
      });

      itemRows.push({
        id: newId(),
        transferId: id,
        productId: item.productId,
        qtySent: item.qtySent,
        qtyReceived: 0,
        unitCost: product.costPrice,
        notes: null,
      });
    }

    tx.insert(stockTransfers)
      .values({
        id,
        transferNo,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        status: "in_transit",
        notes: input.notes ?? null,
        createdBy: input.createdBy,
        receivedBy: null,
        receivedAt: null,
      })
      .run();

    tx.insert(stockTransferItems).values(itemRows).run();

    return getStockTransferById(id);
  });
}

/** Get transfer with items */
export function getStockTransferById(id: string) {
  const transfer = db
    .select({
      id: stockTransfers.id,
      transferNo: stockTransfers.transferNo,
      fromLocationId: stockTransfers.fromLocationId,
      fromLocationName: locations.name,
      toLocationId: stockTransfers.toLocationId,
      status: stockTransfers.status,
      notes: stockTransfers.notes,
      createdBy: users.name,
      receivedBy: stockTransfers.receivedBy,
      receivedAt: stockTransfers.receivedAt,
      createdAt: stockTransfers.createdAt,
    })
    .from(stockTransfers)
    .leftJoin(locations, eq(stockTransfers.fromLocationId, locations.id))
    .leftJoin(users, eq(stockTransfers.createdBy, users.id))
    .where(eq(stockTransfers.id, id))
    .get();

  if (!transfer) throw new NotFoundError("Stock Transfer", id);

  const items = db
    .select({
      id: stockTransferItems.id,
      productId: stockTransferItems.productId,
      productName: products.name,
      productSku: products.sku,
      qtySent: stockTransferItems.qtySent,
      qtyReceived: stockTransferItems.qtyReceived,
      qtyPending: sql<number>`${stockTransferItems.qtySent} - ${stockTransferItems.qtyReceived}`,
      unitCost: stockTransferItems.unitCost,
      notes: stockTransferItems.notes,
    })
    .from(stockTransferItems)
    .leftJoin(products, eq(stockTransferItems.productId, products.id))
    .where(eq(stockTransferItems.transferId, id))
    .all();

  return { ...transfer, items };
}

/** List transfers */
export function listStockTransfers(params?: {
  fromLocationId?: string;
  toLocationId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions:any[] = [];
  if (params?.fromLocationId)
    conditions.push(eq(stockTransfers.fromLocationId, params.fromLocationId));
  if (params?.toLocationId)
    conditions.push(eq(stockTransfers.toLocationId, params.toLocationId));
  if (params?.status) conditions.push(eq(stockTransfers.status, params.status as any));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db
    .select({
      id: stockTransfers.id,
      transferNo: stockTransfers.transferNo,
      fromLocationId: stockTransfers.fromLocationId,
      toLocationId: stockTransfers.toLocationId,
      status: stockTransfers.status,
      createdAt: stockTransfers.createdAt,
    })
    .from(stockTransfers)
    .where(where)
    .orderBy(desc(stockTransfers.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  const total =
    db.select({ c: sql<number>`COUNT(*)` }).from(stockTransfers).where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Receive items at the destination location.
 * Adds stock to destination and updates transfer status.
 */
export function receiveStockTransfer(
  transferId: string,
  receivedItems: ReceiveTransferItem[],
  receivedBy: string
) {
  return db.transaction((tx) => {
    const transfer = getStockTransferById(transferId);

    if (transfer.status !== "in_transit") {
      throw new ValidationError(`Cannot receive transfer in status: ${transfer.status}`);
    }

    for (const recv of receivedItems) {
      const transferItem = transfer.items.find((i) => i.id === recv.transferItemId);
      if (!transferItem) throw new NotFoundError("Transfer Item", recv.transferItemId);

      const remaining = transferItem.qtySent - transferItem.qtyReceived;
      if (recv.qtyReceived > remaining) {
        throw new ValidationError(
          `Receiving ${recv.qtyReceived} exceeds remaining ${remaining} for product ${transferItem.productSku}`
        );
      }

      // Add to destination
      const { qtyBefore, qtyAfter } = upsertStock(
        transferItem.productId,
        transfer.toLocationId,
        recv.qtyReceived
      );

      appendLedger({
        productId: transferItem.productId,
        locationId: transfer.toLocationId,
        movementType: "transfer_in",
        qty: recv.qtyReceived,
        qtyBefore,
        qtyAfter,
        unitCost: transferItem.unitCost,
        totalCost: recv.qtyReceived * transferItem.unitCost,
        referenceType: "transfer",
        referenceId: transferId,
        notes: `Transfer from location ${transfer.fromLocationId}`,
        createdBy: receivedBy,
      });

      // Update transfer item received qty
      tx.update(stockTransferItems)
        .set({ qtyReceived: transferItem.qtyReceived + recv.qtyReceived })
        .where(eq(stockTransferItems.id, recv.transferItemId))
        .run();
    }

    // Mark as received
    tx.update(stockTransfers)
      .set({
        status: "received",
        receivedBy,
        receivedAt: now(),
        updatedAt: now(),
      })
      .where(eq(stockTransfers.id, transferId))
      .run();

    return getStockTransferById(transferId);
  });
}

/** Cancel a transfer (re-add stock to source if it was in transit) */
export function cancelStockTransfer(transferId: string, cancelledBy: string) {
  return db.transaction((tx) => {
    const transfer = getStockTransferById(transferId);

    if (!["in_transit"].includes(transfer.status)) {
      throw new ValidationError(`Cannot cancel transfer in status: ${transfer.status}`);
    }

    // Reverse the transfer_out — add stock back to source
    for (const item of transfer.items) {
      const unreceived = item.qtySent - item.qtyReceived;
      if (unreceived <= 0) continue;

      const { qtyBefore, qtyAfter } = upsertStock(
        item.productId,
        transfer.fromLocationId,
        unreceived
      );

      appendLedger({
        productId: item.productId,
        locationId: transfer.fromLocationId,
        movementType: "transfer_in", // Reversal back to source
        qty: unreceived,
        qtyBefore,
        qtyAfter,
        unitCost: item.unitCost,
        totalCost: unreceived * item.unitCost,
        referenceType: "transfer",
        referenceId: transferId,
        notes: "Transfer cancelled — stock returned to source",
        createdBy: cancelledBy,
      });
    }

    tx.update(stockTransfers)
      .set({ status: "cancelled", updatedAt: now() })
      .where(eq(stockTransfers.id, transferId))
      .run();

    return getStockTransferById(transferId);
  });
}
