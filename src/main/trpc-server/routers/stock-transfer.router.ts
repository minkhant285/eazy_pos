import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { StockTransferService } from '../../db/services'

// ── Router ────────────────────────────────────────────────────

export const stockTransferRouter = router({
  /** GET /stockTransfer.list */
  list: publicProcedure
    .input(
      z.object({
        fromLocationId: z.string().uuid().optional(),
        toLocationId: z.string().uuid().optional(),
        status: z.enum(['draft', 'in_transit', 'partial', 'received', 'cancelled']).optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      }).optional()
    )
    .query(({ input }) => {
      try {
        return StockTransferService.listStockTransfers(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /stockTransfer.getById — includes items with sent/received qty */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return StockTransferService.getStockTransferById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /stockTransfer.create
   * Creates the transfer AND immediately dispatches it.
   * Stock is deducted from source location right away.
   * Destination gets stock when receive() is called.
   */
  create: publicProcedure
    .input(
      z.object({
        fromLocationId: z.string().uuid(),
        toLocationId: z.string().uuid(),
        items: z.array(
          z.object({
            productId: z.string().uuid(),
            qtySent: z.number().positive(),
          })
        ).min(1),
        notes: z.string().optional(),
        createdBy: z.string().uuid(),
      })
    )
    .mutation(({ input }) => {
      try {
        return StockTransferService.createStockTransfer(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /stockTransfer.receive
   * Records receipt at destination and adds stock.
   * qtyReceived can differ from qtySent (transit loss/damage).
   */
  receive: publicProcedure
    .input(
      z.object({
        transferId: z.string().uuid(),
        receivedItems: z.array(
          z.object({
            transferItemId: z.string().uuid(),
            qtyReceived: z.number().positive(),
          })
        ).min(1),
        receivedBy: z.string().uuid(),
      })
    )
    .mutation(({ input }) => {
      try {
        return StockTransferService.receiveStockTransfer(
          input.transferId,
          input.receivedItems,
          input.receivedBy
        )
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /stockTransfer.cancel
   * Cancels an in-transit transfer and returns stock to source.
   */
  cancel: publicProcedure
    .input(
      z.object({
        transferId: z.string().uuid(),
        cancelledBy: z.string().uuid(),
      })
    )
    .mutation(({ input }) => {
      try {
        return StockTransferService.cancelStockTransfer(input.transferId, input.cancelledBy)
      } catch (err) {
        mapError(err)
      }
    }),
})
