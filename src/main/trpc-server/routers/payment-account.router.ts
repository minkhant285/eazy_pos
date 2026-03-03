import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { PaymentAccountService } from '../../db/services'

const AccountInput = z.object({
  provider: z.string().min(1),
  accountNumber: z.string().min(1),
  accountName: z.string().min(1),
  providerLogo: z.string().nullable().optional(),
  qrCode: z.string().nullable().optional(),
})

export const paymentAccountRouter = router({

  /** List all (or only active) payment accounts */
  list: publicProcedure
    .input(z.object({ onlyActive: z.boolean().optional() }).optional())
    .query(({ input }) => {
      try {
        return PaymentAccountService.listPaymentAccounts(input?.onlyActive ?? false)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Get single by id */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      try {
        return PaymentAccountService.getPaymentAccountById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Create */
  create: publicProcedure
    .input(AccountInput)
    .mutation(({ input }) => {
      try {
        return PaymentAccountService.createPaymentAccount(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Update */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: AccountInput.partial().extend({ isActive: z.boolean().optional() }),
    }))
    .mutation(({ input }) => {
      try {
        return PaymentAccountService.updatePaymentAccount(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** Delete */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      try {
        PaymentAccountService.deletePaymentAccount(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),
})
