import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { ProductService } from '../../db/services'

// ── Zod Schemas ───────────────────────────────────────────────

const CreateProductSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  unitOfMeasure: z.string().optional(),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().positive(),
  taxRate: z.number().min(0).max(1).optional(),       // e.g. 0.07 = 7%
  isSerialized: z.boolean().optional(),
  imageUrl: z.string().optional(),
})

const ProductFilterSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
})

// ── Router ────────────────────────────────────────────────────

export const productRouter = router({
  /** GET /product.list */
  list: publicProcedure
    .input(ProductFilterSchema.optional())
    .query(({ input }) => {
      try {
        return ProductService.listProducts(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /product.getById */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return ProductService.getProductById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /product.getBySku — useful for manual SKU lookup */
  getBySku: publicProcedure
    .input(z.object({ sku: z.string() }))
    .query(({ input }) => {
      try {
        return ProductService.getProductBySku(input.sku)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /product.getByBarcode — used by POS barcode scanner */
  getByBarcode: publicProcedure
    .input(z.object({ barcode: z.string() }))
    .query(({ input }) => {
      try {
        return ProductService.getProductByBarcode(input.barcode)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /product.create */
  create: publicProcedure
    .input(CreateProductSchema)
    .mutation(({ input }) => {
      try {
        return ProductService.createProduct(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /product.update */
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: CreateProductSchema.omit({ sku: true }).partial(),
        changedBy: z.string().uuid().optional(), // for price history attribution
      })
    )
    .mutation(({ input }) => {
      try {
        return ProductService.updateProduct(input.id, input.data, input.changedBy)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /product.deactivate */
  deactivate: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        ProductService.deactivateProduct(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /product.delete — permanent hard-delete (blocked if product has sales history) */
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        ProductService.deleteProduct(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /product.activate */
  activate: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        ProductService.activateProduct(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /product.priceHistory */
  priceHistory: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return ProductService.getProductPriceHistory(input.productId)
      } catch (err) {
        mapError(err)
      }
    }),
})
