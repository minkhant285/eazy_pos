import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { BrandService } from '../../db/services'

const BrandInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
})

export const brandRouter = router({

  /** List all (or only active) brands */
  list: publicProcedure
    .input(z.object({ onlyActive: z.boolean().optional() }).optional())
    .query(({ input }) => {
      try {
        return BrandService.listBrands(input?.onlyActive ?? false)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Get single by id */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      try {
        return BrandService.getBrandById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Create */
  create: publicProcedure
    .input(BrandInput)
    .mutation(({ input }) => {
      try {
        return BrandService.createBrand(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Update */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: BrandInput.partial().extend({ isActive: z.boolean().optional() }),
    }))
    .mutation(({ input }) => {
      try {
        return BrandService.updateBrand(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Delete */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      try {
        BrandService.deleteBrand(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),
})
