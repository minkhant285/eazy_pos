import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { DeliveryMethodService } from '../../db/services'

const MethodInput = z.object({
  provider: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
})

export const deliveryMethodRouter = router({

  /** List all (or only active) delivery methods */
  list: publicProcedure
    .input(z.object({ onlyActive: z.boolean().optional() }).optional())
    .query(({ input }) => {
      try {
        return DeliveryMethodService.listDeliveryMethods(input?.onlyActive ?? false)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Get single by id */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      try {
        return DeliveryMethodService.getDeliveryMethodById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Create */
  create: publicProcedure
    .input(MethodInput)
    .mutation(({ input }) => {
      try {
        return DeliveryMethodService.createDeliveryMethod(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Update */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: MethodInput.partial().extend({ isActive: z.boolean().optional() }),
    }))
    .mutation(({ input }) => {
      try {
        return DeliveryMethodService.updateDeliveryMethod(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Delete */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      try {
        DeliveryMethodService.deleteDeliveryMethod(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),
})
