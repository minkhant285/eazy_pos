import { z } from 'zod'
import { router, publicProcedure, mapError } from '../trpc'
import { UserService } from '../../db/services'

// ── Zod Schemas ───────────────────────────────────────────────

const RoleEnum = z.enum(['admin', 'manager', 'cashier'])

const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
})

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: RoleEnum.optional(),
})

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: RoleEnum.optional(),
  isActive: z.boolean().optional(),
})

// ── Router ────────────────────────────────────────────────────

export const userRouter = router({
  /** GET /user.hasAny — true if at least one account exists */
  hasAny: publicProcedure.query(() => {
    return { exists: UserService.hasAnyUser() }
  }),

  /** POST /user.setupAdmin — create the first admin (blocked if any user exists) */
  setupAdmin: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      try {
        return await UserService.setupAdmin(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /user.list */
  list: publicProcedure
    .input(
      PaginationSchema.extend({
        role: RoleEnum.optional(),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(({ input }) => {
      try {
        return UserService.listUsers(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** GET /user.getById */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return UserService.getUserById(input.id)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /user.create */
  create: publicProcedure
    .input(CreateUserSchema)
    .mutation(async ({ input }) => {
      try {
        return await UserService.createUser(input)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /user.update */
  update: publicProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateUserSchema }))
    .mutation(async ({ input }) => {
      try {
        return await UserService.updateUser(input.id, input.data)
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /user.changePassword */
  changePassword: publicProcedure
    .input(z.object({ id: z.string().uuid(), newPassword: z.string().min(6) }))
    .mutation(({ input }) => {
      try {
        UserService.changePassword(input.id, input.newPassword)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /user.login — returns safe user object or null */
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(({ input }) => {
      const user = UserService.verifyPassword(input.email, input.password)
      if (!user) {
        throw new (require('@trpc/server').TRPCError)({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }
      return user
    }),

  /** POST /user.deactivate */
  deactivate: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        UserService.deactivateUser(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),

  /** POST /user.activate */
  activate: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        UserService.activateUser(input.id)
        return { success: true }
      } catch (err) {
        mapError(err)
      }
    }),
})
