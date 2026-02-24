import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { MasterService } from '../../db/services'

const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
})

// ================================================================
// LOCATION ROUTER
// ================================================================

const CreateLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
})

export const locationRouter = router({
  /** GET /location.list */
  list: publicProcedure
    .input(PaginationSchema.extend({ isActive: z.boolean().optional() }).optional())
    .query(({ input }) => {
      try {
        return MasterService.listLocations(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /location.getById */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return MasterService.getLocationById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /location.create */
  create: publicProcedure
    .input(CreateLocationSchema)
    .mutation(({ input }) => {
      try {
        return MasterService.createLocation(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /location.update */
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: CreateLocationSchema.partial().extend({ isActive: z.boolean().optional() }),
      })
    )
    .mutation(({ input }) => {
      try {
        return MasterService.updateLocation(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /location.deactivate */
  deactivate: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        MasterService.deactivateLocation(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),
})

// ================================================================
// SUPPLIER ROUTER
// ================================================================

const CreateSupplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
})

export const supplierRouter = router({
  /** GET /supplier.list */
  list: publicProcedure
    .input(
      PaginationSchema.extend({
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(({ input }) => {
      try {
        return MasterService.listSuppliers(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /supplier.getById */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return MasterService.getSupplierById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /supplier.create */
  create: publicProcedure
    .input(CreateSupplierSchema)
    .mutation(({ input }) => {
      try {
        return MasterService.createSupplier(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /supplier.update */
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: CreateSupplierSchema.partial().extend({ isActive: z.boolean().optional() }),
      })
    )
    .mutation(({ input }) => {
      try {
        return MasterService.updateSupplier(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /supplier.deactivate */
  deactivate: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        MasterService.deactivateSupplier(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),
})

// ================================================================
// CATEGORY ROUTER
// ================================================================

const CreateCategorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid().optional(),
  description: z.string().optional(),
})

export const categoryRouter = router({
  /** GET /category.list — pass parentId=null for root-only */
  list: publicProcedure
    .input(z.object({ parentId: z.string().uuid().nullable().optional() }).optional())
    .query(({ input }) => {
      try {
        return MasterService.listCategories(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /category.tree — full nested tree */
  tree: publicProcedure.query(() => {
    try {
      return MasterService.getCategoryTree()
    } catch (err) {
      mapError(err)
    }
  }),

  /** GET /category.getById */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return MasterService.getCategoryById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /category.create */
  create: publicProcedure
    .input(CreateCategorySchema)
    .mutation(({ input }) => {
      try {
        return MasterService.createCategory(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /category.update */
  update: publicProcedure
    .input(z.object({ id: z.string().uuid(), data: CreateCategorySchema.partial() }))
    .mutation(({ input }) => {
      try {
        return MasterService.updateCategory(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /category.delete */
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        MasterService.deleteCategory(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),
})
