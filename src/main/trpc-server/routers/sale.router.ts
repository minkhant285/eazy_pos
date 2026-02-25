import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { SaleService } from '../../db/services'

// ── Zod Schemas ───────────────────────────────────────────────

const CartItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().positive(),
  unitPrice: z.number().positive().optional(),  // override sell price
  discountAmount: z.number().nonnegative().optional(),
})

const PaymentInputSchema = z.object({
  method: z.enum(['cash', 'credit_card', 'debit_card', 'qr_code', 'store_credit', 'loyalty_points']),
  amount: z.number().positive(),
  reference: z.string().optional(),
})

const SaleFilterSchema = z.object({
  locationId: z.string().uuid().optional(),
  cashierId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.enum(['draft', 'completed', 'voided', 'refunded', 'partially_refunded']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
})

// ── Router ────────────────────────────────────────────────────

export const saleRouter = router({
  /** GET /sale.list */
  list: publicProcedure
    .input(SaleFilterSchema.optional())
    .query(({ input }) => {
      try {
        return SaleService.listSales(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /sale.getById — includes items + payments */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return SaleService.getSaleById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /sale.previewTotals
   * Calculate totals before committing — use this to show the
   * customer the receipt preview in your POS UI.
   */
  previewTotals: publicProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            qty: z.number().positive(),
            unitPrice: z.number().positive(),
            discountAmount: z.number().nonnegative().default(0),
            taxRate: z.number().min(0).max(1).default(0),
          })
        ),
      })
    )
    .query(({ input }) => {
      return SaleService.calculateSaleTotals(input.items)
    }),

  /**
   * POST /sale.create — the main POS checkout endpoint.
   * Atomically: validates stock → deducts inventory → writes
   * ledger entries → records payment → awards loyalty points.
   */
  create: publicProcedure
    .input(
      z.object({
        locationId: z.string().uuid(),
        cashierId: z.string().uuid(),
        customerId: z.string().uuid().optional(),
        items: z.array(CartItemSchema).min(1),
        payments: z.array(PaymentInputSchema).min(1),
        discountAmount: z.number().nonnegative().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      try {
        return SaleService.createSale(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /sale.void — reverse a completed sale.
   * Re-credits all stock and marks sale as voided.
   */
  void: publicProcedure
    .input(
      z.object({
        saleId: z.string().uuid(),
        voidedBy: z.string().uuid(),
        reason: z.string().min(1),
      })
    )
    .mutation(({ input }) => {
      try {
        return SaleService.voidSale(input.saleId, input.voidedBy, input.reason)
      } catch (err) {
        mapError(err)
      }
    }),

  /**
   * POST /sale.return — partial or full customer return.
   * Returns specified items to stock.
   */
  return: publicProcedure
    .input(
      z.object({
        saleId: z.string().uuid(),
        returnItems: z.array(
          z.object({
            productId: z.string().uuid(),
            qty: z.number().positive(),
          })
        ).min(1),
        processedBy: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      try {
        return SaleService.processSaleReturn(
          input.saleId,
          input.returnItems,
          input.processedBy,
          input.reason
        )
      } catch (err) {
        mapError(err)
      }
    }),

  // ── Reports ──────────────────────────────────────────────────

  /** GET /sale.dailySummary */
  dailySummary: publicProcedure
    .input(
      z.object({
        locationId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
      })
    )
    .query(({ input }) => {
      try {
        return SaleService.getDailySummary(input.locationId, input.date)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /sale.byPaymentMethod */
  byPaymentMethod: publicProcedure
    .input(
      z.object({
        locationId: z.string().uuid(),
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .query(({ input }) => {
      try {
        return SaleService.getSalesByPaymentMethod(
          input.locationId,
          input.fromDate,
          input.toDate
        )
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /sale.profitSummary — daily revenue / COGS / gross profit for a date range */
  profitSummary: publicProcedure
    .input(
      z.object({
        locationId: z.string().uuid(),
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .query(({ input }) => {
      try {
        return SaleService.getDailyProfitSummary(input.locationId, input.fromDate, input.toDate)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /sale.topProducts */
  topProducts: publicProcedure
    .input(
      z.object({
        locationId: z.string().uuid(),
        fromDate: z.string(),
        toDate: z.string(),
        limit: z.number().int().positive().max(50).default(10),
      })
    )
    .query(({ input }) => {
      try {
        return SaleService.getTopSellingProducts(
          input.locationId,
          input.fromDate,
          input.toDate,
          input.limit
        )
      } catch (err) {
        mapError(err)
      }
    }),
})
