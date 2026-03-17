import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { SaleService } from '../../db/services'

// ── Zod Schemas ───────────────────────────────────────────────

const CartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  qty: z.number().positive(),
  unitPrice: z.number().positive().optional(),  // override sell price
  discountAmount: z.number().nonnegative().optional(),
})

const OnlineOrderInputSchema = z.object({
  cashierId: z.string().uuid(),
  customerId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  deliveryAddressId: z.string().uuid().optional(),
  deliveryMethodId: z.string().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  items: z.array(CartItemSchema).min(1),
  paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'qr_code', 'store_credit', 'loyalty_points']),
  paymentReference: z.string().optional(),
  discountAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
  orderType: z.enum(['pos', 'online']).optional(),
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
        deliveryAddressId: z.string().uuid().optional(),
        deliveryMethodId: z.string().optional(),
        items: z.array(CartItemSchema).min(1),
        payments: z.array(PaymentInputSchema).min(0),
        discountAmount: z.number().nonnegative().optional(),
        notes: z.string().optional(),
        saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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

  // ── Online Orders ──────────────────────────────────────────────

  /** POST /sale.createOnline — create an online order (no stock deduction) */
  createOnline: publicProcedure
    .input(OnlineOrderInputSchema)
    .mutation(({ input }) => {
      try {
        return SaleService.createOnlineOrder(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /sale.confirmOnline — confirm order and deduct stock */
  confirmOnline: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return SaleService.confirmOnlineOrder(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /sale.returnOnline — return confirmed order and restore stock */
  returnOnline: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return SaleService.returnOnlineOrder(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /sale.updateOnline — edit a processing online order */
  updateOnline: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        customerId: z.string().uuid(),
        deliveryAddressId: z.string().uuid().optional(),
        deliveryMethodId: z.string().optional(),
        deliveryFee: z.number().nonnegative().optional(),
        items: z.array(CartItemSchema).min(1),
        paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'qr_code', 'store_credit', 'loyalty_points']),
        paymentReference: z.string().optional(),
        discountAmount: z.number().nonnegative().optional(),
        notes: z.string().optional(),
        saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
    )
    .mutation(({ input }) => {
      try {
        const { id, ...rest } = input
        return SaleService.updateOnlineOrder(id, rest)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /sale.deleteOnline — permanently delete a processing or returned online order */
  deleteOnline: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return SaleService.deleteOnlineOrder(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /sale.readyToShipOnline — mark confirmed order as ready to ship */
  readyToShipOnline: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return SaleService.markReadyToShip(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /sale.shipOnline — mark ready-to-ship order as shipped */
  shipOnline: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return SaleService.markShipped(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /sale.reprocessOnline — move a returned order back to processing */
  reprocessOnline: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return SaleService.reprocessOnlineOrder(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /sale.listOnline — list online orders, optionally filtered by status and date range */
  listOnline: publicProcedure
    .input(z.object({
      onlineStatus: z.string().optional(),
      fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).optional())
    .query(({ input }) => {
      try {
        return SaleService.listOnlineOrders(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /sale.payDebt — record a debt payment for a credit sale */
  payDebt: publicProcedure
    .input(
      z.object({
        saleId: z.string().uuid(),
        method: z.enum(['cash', 'credit_card', 'debit_card', 'qr_code', 'store_credit', 'loyalty_points']),
        amount: z.number().positive(),
        reference: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      try {
        return SaleService.recordSaleDebtPayment(input.saleId, {
          method: input.method,
          amount: input.amount,
          reference: input.reference,
        })
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /sale.listDebts — list sales with outstanding debt */
  listDebts: publicProcedure
    .input(z.object({ customerId: z.string().uuid().optional() }).optional())
    .query(({ input }) => {
      try {
        return SaleService.listDebtSales(input?.customerId)
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
