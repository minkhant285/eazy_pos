import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { ExpenseService } from '../../db/services'

const PaymentMethodEnum = z.enum(['cash', 'card', 'bank_transfer', 'other'])

export const expenseRouter = router({

  // ── Categories ─────────────────────────────────────────────

  /** GET /expense.listCategories */
  listCategories: publicProcedure.query(() => {
    try {
      return ExpenseService.listExpenseCategories()
    } catch (err) {
      mapError(err)
    }
  }),

  /** POST /expense.createCategory */
  createCategory: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      color: z.string().optional(),
    }))
    .mutation(({ input }) => {
      try {
        return ExpenseService.createExpenseCategory(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /expense.updateCategory */
  updateCategory: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        name: z.string().min(1).optional(),
        color: z.string().optional(),
      }),
    }))
    .mutation(({ input }) => {
      try {
        return ExpenseService.updateExpenseCategory(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /expense.deleteCategory */
  deleteCategory: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        ExpenseService.deleteExpenseCategory(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),

  // ── Expenses ───────────────────────────────────────────────

  /** GET /expense.list */
  list: publicProcedure
    .input(z.object({
      categoryId: z.string().uuid().optional(),
      locationId: z.string().uuid().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      search: z.string().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
    }).optional())
    .query(({ input }) => {
      try {
        return ExpenseService.listExpenses(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /expense.getById */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return ExpenseService.getExpenseById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /expense.create */
  create: publicProcedure
    .input(z.object({
      categoryId: z.string().uuid(),
      locationId: z.string().uuid().optional(),
      amount: z.number().positive(),
      description: z.string().min(1),
      paymentMethod: PaymentMethodEnum.optional(),
      expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
      notes: z.string().optional(),
      createdBy: z.string().uuid().optional(),
    }))
    .mutation(({ input }) => {
      try {
        return ExpenseService.createExpense(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /expense.update */
  update: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        categoryId: z.string().uuid().optional(),
        locationId: z.string().uuid().optional(),
        amount: z.number().positive().optional(),
        description: z.string().min(1).optional(),
        paymentMethod: PaymentMethodEnum.optional(),
        expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(({ input }) => {
      try {
        return ExpenseService.updateExpense(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /expense.delete */
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        ExpenseService.deleteExpense(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /expense.summary — totals by category for a date range */
  summary: publicProcedure
    .input(z.object({
      fromDate: z.string(),
      toDate: z.string(),
      locationId: z.string().uuid().optional(),
    }))
    .query(({ input }) => {
      try {
        return ExpenseService.getExpenseSummary(input)
      } catch (err) {
        mapError(err)
      }
    }),
})
