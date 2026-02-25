// // src/main/router.ts
// import { initTRPC } from '@trpc/server'
// import { z } from 'zod'
// import { db } from '../db/db'
// import { journal_table } from '../db/schemas/schema'
// import { eq } from 'drizzle-orm/sql/expressions/conditions'

// const t = initTRPC.create()

// export const router = t.router({
//   journal: t.router({
//     list: t.procedure.query(() => {
//       console.log('list all db')
//       return db.select().from(journal_table).all()
//     }),

//     search: t.procedure.input(z.object({ query: z.string() })).query(({ input }) => {
//       return db.select().from(journal_table).where(eq(journal_table.name, input.query)).all()
//     }),

//     create: t.procedure
//       .input(z.object({ name: z.string(), price: z.number() }))
//       .mutation(async ({ input }) => {
//         try {
//           console.log('inserting:', input)
//           const result = await db.insert(journal_table).values(input).execute()
//           console.log('insert result:', result)
//           return result
//         } catch (err) {
//           console.error('insert error:', err)
//           throw err
//         }
//       }),

//     delete: t.procedure.input(z.object({ id: z.number() })).mutation(({ input }) => {
//       return db.delete(journal_table).where(eq(journal_table.id, input.id)).execute()
//     })
//   })
// })

// export type AppRouter = typeof router

/**
 * src/main/router.ts
 *
 * Root tRPC router — merges all domain sub-routers.
 * Import `AppRouter` on the React side for full type-safety.
 */
import { router } from './trpc'

import { userRouter }             from './routers/user.router'
import { locationRouter,
         supplierRouter,
         categoryRouter }         from './routers/master.router'
import { productRouter }          from './routers/product.router'
import { customerRouter }         from './routers/customer.router'
import { stockRouter }            from './routers/stock.router'
import { saleRouter }             from './routers/sale.router'
import { purchaseOrderRouter }    from './routers/purchase-order.router'
import { stockAdjustmentRouter }  from './routers/stock-adjustment.router'
import { stockTransferRouter }    from './routers/stock-transfer.router'
import { expenseRouter }          from './routers/expense.router'

export const appRouter = router({
  user:             userRouter,
  location:         locationRouter,
  supplier:         supplierRouter,
  category:         categoryRouter,
  product:          productRouter,
  customer:         customerRouter,
  stock:            stockRouter,
  sale:             saleRouter,
  purchaseOrder:    purchaseOrderRouter,
  stockAdjustment:  stockAdjustmentRouter,
  stockTransfer:    stockTransferRouter,
  expense:          expenseRouter,
})

/** Export the type — import this in your React app */
export type AppRouter = typeof appRouter
