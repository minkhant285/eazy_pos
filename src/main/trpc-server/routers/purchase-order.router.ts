import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { PurchaseOrderService } from '../../db/services'

// ── Zod Schemas ───────────────────────────────────────────────

const POItemSchema = z.object({
  productId: z.string().uuid(),
  qtyOrdered: z.number().positive(),
  unitCost: z.number().positive(),
})

const POStatusEnum = z.enum(['draft', 'sent', 'partial', 'received', 'cancelled'])

const POFilterSchema = z.object({
  supplierId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: POStatusEnum.optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
})

// ── Router ────────────────────────────────────────────────────

export const purchaseOrderRouter = router({
  /** GET /purchaseOrder.list */
  list: publicProcedure
    .input(POFilterSchema.optional())
    .query(({ input }) => {
      try {
        return PurchaseOrderService.listPurchaseOrders(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /purchaseOrder.getById — includes all line items */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return PurchaseOrderService.getPurchaseOrderById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /purchaseOrder.create — creates a draft PO */
  create: publicProcedure
    .input(
      z.object({
        supplierId: z.string().uuid(),
        locationId: z.string().uuid(),
        items: z.array(POItemSchema).min(1),
        expectedAt: z.string().optional(),
        notes: z.string().optional(),
        createdBy: z.string().uuid(),
      })
    )
    .mutation(({ input }) => {
      try {
        return PurchaseOrderService.createPurchaseOrder(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /purchaseOrder.update — header only, draft/sent status */
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          supplierId: z.string().uuid().optional(),
          locationId: z.string().uuid().optional(),
          expectedAt: z.string().optional(),
          notes: z.string().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      try {
        return PurchaseOrderService.updatePurchaseOrder(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /purchaseOrder.addItem */
  addItem: publicProcedure
    .input(z.object({ poId: z.string().uuid(), item: POItemSchema }))
    .mutation(({ input }) => {
      try {
        return PurchaseOrderService.addPOItem(input.poId, input.item)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /purchaseOrder.removeItem */
  removeItem: publicProcedure
    .input(z.object({ poId: z.string().uuid(), poItemId: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return PurchaseOrderService.removePOItem(input.poId, input.poItemId)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /purchaseOrder.updateItem */
  updateItem: publicProcedure
    .input(
      z.object({
        poId: z.string().uuid(),
        poItemId: z.string().uuid(),
        data: z.object({
          qtyOrdered: z.number().positive().optional(),
          unitCost: z.number().positive().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      try {
        return PurchaseOrderService.updatePOItem(input.poId, input.poItemId, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /purchaseOrder.send — marks PO as sent to supplier (draft → sent)
   */
  send: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return PurchaseOrderService.sendPurchaseOrder(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /purchaseOrder.receive — receive goods.
   * Updates stock + writes purchase_in ledger entries.
   * Supports partial receiving (call multiple times).
   */
  receive: publicProcedure
    .input(
      z.object({
        poId: z.string().uuid(),
        receivedItems: z.array(
          z.object({
            purchaseOrderItemId: z.string().uuid(),
            productId: z.string().uuid(),
            qtyReceived: z.number().positive(),
            unitCost: z.number().positive().optional(), // override if actual cost differs
          })
        ).min(1),
        receivedBy: z.string().uuid(),
      })
    )
    .mutation(({ input }) => {
      try {
        return PurchaseOrderService.receivePurchaseOrder(
          input.poId,
          input.receivedItems,
          input.receivedBy
        )
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /purchaseOrder.cancel */
  cancel: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return PurchaseOrderService.cancelPurchaseOrder(input.id)
      } catch (err) {
        mapError(err)
      }
    }),
})
