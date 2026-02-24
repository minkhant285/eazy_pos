import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError } from 'zod'

// ── Context (extend this to add session/auth later) ──────────
export type Context = {
  // e.g. userId?: string
}

export function createContext(): Context {
  return {}
}

const t = initTRPC.context<Context>().create({
  // Map domain errors → TRPCError automatically
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure
export const mergeRouters = t.mergeRouters

/** Reusable error mapper — wraps service errors into TRPCError */
export function mapError(err: unknown): never {
  if (err instanceof Error) {
    if (err.name === 'NotFoundError') {
      throw new TRPCError({ code: 'NOT_FOUND', message: err.message })
    }
    if (err.name === 'ValidationError') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: err.message })
    }
    if (err.name === 'InsufficientStockError') {
      throw new TRPCError({ code: 'CONFLICT', message: err.message })
    }
  }
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(err) })
}
