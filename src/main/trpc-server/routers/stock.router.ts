import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { StockService } from '../../db/services'

// ── Router ────────────────────────────────────────────────────

export const stockRouter = router({
  /** GET /stock.get — single product at one location */
  get: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid(),
      })
    )
    .query(({ input }) => {
      try {
        return StockService.getStock(input.productId, input.locationId)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /stock.allLocations — product qty across every branch */
  allLocations: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return StockService.getStockAllLocations(input.productId)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /stock.locationInventory — full snapshot of a location */
  locationInventory: publicProcedure
    .input(
      z.object({
        locationId: z.string().uuid(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(200).default(50),
        search: z.string().optional(),
      })
    )
    .query(({ input }) => {
      try {
        return StockService.getLocationInventory(input.locationId, input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /stock.lowStockCount — count products at or below a qty threshold */
  lowStockCount: publicProcedure
    .input(z.object({ locationId: z.string().uuid(), threshold: z.number().nonnegative() }))
    .query(({ input }) => {
      try {
        return StockService.getLowStockCount(input.locationId, input.threshold)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /stock.inventoryValue — total stock value for a location */
  inventoryValue: publicProcedure
    .input(z.object({ locationId: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return StockService.getInventoryValue(input.locationId)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /stock.ledger — audit trail with rich filters */
  ledger: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid().optional(),
        locationId: z.string().uuid().optional(),
        movementType: z
          .enum([
            'purchase_in',
            'sale_out',
            'return_in',
            'return_out',
            'adjustment_in',
            'adjustment_out',
            'transfer_in',
            'transfer_out',
            'opening_balance',
            'damage_out',
            'production_in',
            'production_out',
          ])
          .optional(),
        referenceType: z
          .enum(['sale', 'purchase_order', 'stock_adjustment', 'transfer', 'production'])
          .optional(),
        referenceId: z.string().optional(),
        fromDate: z.string().optional(), // ISO datetime string
        toDate: z.string().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(200).default(50),
      })
    )
    .query(({ input }) => {
      try {
        return StockService.queryStockLedger(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /stock.reconcile — reconstruct qty from ledger (for audit) */
  reconcile: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid(),
      })
    )
    .query(({ input }) => {
      try {
        return StockService.reconstructStockFromLedger(input.productId, input.locationId)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /stock.setOpeningBalance — initial stock setup */
  setOpeningBalance: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid(),
        qty: z.number().nonnegative(),
        unitCost: z.number().nonnegative(),
        createdBy: z.string().uuid(),
      })
    )
    .mutation(({ input }) => {
      try {
        return StockService.setOpeningBalance(
          input.productId,
          input.locationId,
          input.qty,
          input.unitCost,
          input.createdBy
        )
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * GET /stock.allProducts
   * All active products for a location, including those with no stock record.
   * Products with no record appear with qty 0 and hasRecord=false.
   */
  allProducts: publicProcedure
    .input(
      z.object({
        locationId: z.string().uuid(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(200).default(50),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(({ input }) => {
      try {
        return StockService.listAllProductsForLocation(input.locationId, input)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /stock.setQty
   * Set stock quantity to an exact value for any product/location.
   * Works regardless of whether a stock record exists.
   * Records a ledger entry automatically.
   */
  setQty: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid(),
        qty: z.number().nonnegative(),
        unitCost: z.number().nonnegative(),
        createdBy: z.string().uuid().optional(),
      })
    )
    .mutation(({ input }) => {
      try {
        return StockService.setStockQty(
          input.productId,
          input.locationId,
          input.qty,
          input.unitCost,
          input.createdBy
        )
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /stock.updateReserved — reserve qty for pending orders */
  updateReserved: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid(),
        delta: z.number(), // positive = reserve more, negative = release
      })
    )
    .mutation(({ input }) => {
      try {
        StockService.updateReservedQty(input.productId, input.locationId, input.delta)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),
})
