import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { CustomerAddressService } from '../../db/services'

const AddressInput = z.object({
  receiverName:  z.string().min(1),
  phoneNumber:   z.string().min(1),
  detailAddress: z.string().min(1),
})

export const customerAddressRouter = router({
  list: publicProcedure
    .input(z.object({ customerId: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return CustomerAddressService.listAddresses(input.customerId)
      } catch (err) {
        mapError(err)
      }
    }),

  create: publicProcedure
    .input(z.object({ customerId: z.string().uuid() }).merge(AddressInput))
    .mutation(({ input }) => {
      try {
        const { customerId, ...data } = input
        return CustomerAddressService.createAddress(customerId, data)
      } catch (err) {
        mapError(err)
      }
    }),

  update: publicProcedure
    .input(z.object({ id: z.string().uuid(), data: AddressInput.partial() }))
    .mutation(({ input }) => {
      try {
        return CustomerAddressService.updateAddress(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return CustomerAddressService.deleteAddress(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  setDefault: publicProcedure
    .input(z.object({ id: z.string().uuid(), customerId: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return CustomerAddressService.setDefault(input.id, input.customerId)
      } catch (err) {
        mapError(err)
      }
    }),
})
