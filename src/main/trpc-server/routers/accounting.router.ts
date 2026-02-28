import { z } from "zod";
import { router, publicProcedure, mapError } from "../trpc";
import * as AccountingService from "../../db/services/accounting.service";

export const accountingRouter = router({

  /** P&L: revenue, COGS, gross profit, expenses, net profit */
  incomeStatement: publicProcedure
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(({ input }) => {
      try { return AccountingService.getIncomeStatement(input.fromDate, input.toDate); }
      catch (err) { mapError(err); }
    }),

  /** Cash flow: cash-in by payment method, cash-out by expenses + purchases */
  cashFlow: publicProcedure
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(({ input }) => {
      try { return AccountingService.getCashFlowSummary(input.fromDate, input.toDate); }
      catch (err) { mapError(err); }
    }),

  /** Monthly trend (revenue/COGS/expenses/net profit) for a given year */
  monthlyTrend: publicProcedure
    .input(z.object({ year: z.number().int().min(2000).max(2100) }))
    .query(({ input }) => {
      try { return AccountingService.getMonthlyTrend(input.year); }
      catch (err) { mapError(err); }
    }),

  /** Balance sheet snapshot: inventory, receivables, payables, equity */
  balanceSheet: publicProcedure
    .query(() => {
      try { return AccountingService.getBalanceSheet(); }
      catch (err) { mapError(err); }
    }),

  /** Revenue broken down by product category */
  revenueByCategory: publicProcedure
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(({ input }) => {
      try { return AccountingService.getRevenueByCategory(input.fromDate, input.toDate); }
      catch (err) { mapError(err); }
    }),

  /** Top N products by gross profit */
  topProducts: publicProcedure
    .input(z.object({ fromDate: z.string(), toDate: z.string(), limit: z.number().int().min(1).max(50).default(15) }))
    .query(({ input }) => {
      try { return AccountingService.getTopProducts(input.fromDate, input.toDate, input.limit); }
      catch (err) { mapError(err); }
    }),
});
