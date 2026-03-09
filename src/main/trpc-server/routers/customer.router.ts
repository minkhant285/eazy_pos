import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { CustomerService } from '../../db/services'

// ── Zod Schemas ───────────────────────────────────────────────

const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
  customerType: z.enum(['retail', 'wholesale']).optional(),
  photoUrl: z.string().nullable().optional(),
})

const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
})

// ── Router ────────────────────────────────────────────────────

export const customerRouter = router({
  /** GET /customer.list */
  list: publicProcedure
    .input(
      PaginationSchema.extend({
        search: z.string().optional(), // searches name, email, phone
        isActive: z.boolean().optional(),
        customerType: z.enum(['retail', 'wholesale']).optional(),
      }).optional()
    )
    .query(({ input }) => {
      try {
        return CustomerService.listCustomers(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /customer.getById */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return CustomerService.getCustomerById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /customer.getByPhone — for quick POS lookup */
  getByPhone: publicProcedure
    .input(z.object({ phone: z.string() }))
    .query(({ input }) => {
      try {
        return CustomerService.getCustomerByPhone(input.phone)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /customer.getByEmail */
  getByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(({ input }) => {
      try {
        return CustomerService.getCustomerByEmail(input.email)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /customer.create */
  create: publicProcedure
    .input(CreateCustomerSchema)
    .mutation(({ input }) => {
      try {
        return CustomerService.createCustomer(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /customer.update */
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: CreateCustomerSchema.partial().extend({ isActive: z.boolean().optional() }),
      })
    )
    .mutation(({ input }) => {
      try {
        return CustomerService.updateCustomer(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /customer.deactivate */
  deactivate: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        CustomerService.deactivateCustomer(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /customer.addLoyaltyPoints */
  addLoyaltyPoints: publicProcedure
    .input(z.object({ customerId: z.string().uuid(), points: z.number().int().positive() }))
    .mutation(({ input }) => {
      try {
        const newBalance = CustomerService.addLoyaltyPoints(input.customerId, input.points)
        return { newBalance }
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /customer.redeemLoyaltyPoints */
  redeemLoyaltyPoints: publicProcedure
    .input(z.object({ customerId: z.string().uuid(), points: z.number().int().positive() }))
    .mutation(({ input }) => {
      try {
        const newBalance = CustomerService.redeemLoyaltyPoints(input.customerId, input.points)
        return { newBalance }
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /customer.updateBalance — for credit/debit outstanding balance */
  updateBalance: publicProcedure
    .input(
      z.object({
        customerId: z.string().uuid(),
        delta: z.number(), // positive = add debt, negative = payment
      })
    )
    .mutation(({ input }) => {
      try {
        const newBalance = CustomerService.updateOutstandingBalance(
          input.customerId,
          input.delta
        )
        return { newBalance }
      } catch (err) {
        mapError(err)
      }
    }),
})
