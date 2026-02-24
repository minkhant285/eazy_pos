import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { StockAdjustmentService } from '../../db/services'

// ── Zod Schemas ───────────────────────────────────────────────

const AdjustmentTypeEnum = z.enum(['cycle_count', 'damage', 'expiry', 'found', 'other'])

const AdjustmentItemSchema = z.object({
  productId: z.string().uuid(),
  qtyActual: z.number().nonnegative(), // Physical count / desired qty
  reason: z.string().optional(),
})

// ── Router ────────────────────────────────────────────────────

export const stockAdjustmentRouter = router({
  /** GET /stockAdjustment.list */
  list: publicProcedure
    .input(
      z.object({
        locationId: z.string().uuid().optional(),
        status: z.enum(['draft', 'approved', 'rejected']).optional(),
        adjustmentType: AdjustmentTypeEnum.optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      }).optional()
    )
    .query(({ input }) => {
      try {
        return StockAdjustmentService.listStockAdjustments(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /stockAdjustment.getById — includes all items + cost impact */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return StockAdjustmentService.getStockAdjustmentById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /stockAdjustment.create
   * Creates a draft adjustment. No stock changes yet.
   * qtySystem is auto-populated from current stock.
   */
  create: publicProcedure
    .input(
      z.object({
        locationId: z.string().uuid(),
        adjustmentType: AdjustmentTypeEnum,
        items: z.array(AdjustmentItemSchema).min(1),
        notes: z.string().optional(),
        createdBy: z.string().uuid(),
      })
    )
    .mutation(({ input }) => {
      try {
        return StockAdjustmentService.createStockAdjustment(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /stockAdjustment.updateNotes */
  updateNotes: publicProcedure
    .input(z.object({ id: z.string().uuid(), notes: z.string() }))
    .mutation(({ input }) => {
      try {
        return StockAdjustmentService.updateAdjustmentNotes(input.id, input.notes)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /stockAdjustment.addItem */
  addItem: publicProcedure
    .input(z.object({ adjustmentId: z.string().uuid(), item: AdjustmentItemSchema }))
    .mutation(({ input }) => {
      try {
        return StockAdjustmentService.addAdjustmentItem(input.adjustmentId, input.item)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /stockAdjustment.removeItem */
  removeItem: publicProcedure
    .input(z.object({ adjustmentId: z.string().uuid(), itemId: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return StockAdjustmentService.removeAdjustmentItem(input.adjustmentId, input.itemId)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /stockAdjustment.approve
   * Manager/admin only. Applies the adjustment:
   * updates stock.qtyOnHand and appends ledger entries.
   */
  approve: publicProcedure
    .input(z.object({ id: z.string().uuid(), approvedBy: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return StockAdjustmentService.approveStockAdjustment(input.id, input.approvedBy)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /stockAdjustment.reject */
  reject: publicProcedure
    .input(z.object({ id: z.string().uuid(), rejectedBy: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return StockAdjustmentService.rejectStockAdjustment(input.id, input.rejectedBy)
      } catch (err) {
        mapError(err)
      }
    }),
})
