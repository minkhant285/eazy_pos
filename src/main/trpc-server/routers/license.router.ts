import { z } from 'zod';
import { router, publicProcedure, mapError } from '../trpc';
import { checkLicense, activateLicense } from '../../license/licenseService';

export const licenseRouter = router({
  check: publicProcedure.query(() => {
    try {
      return checkLicense();
    } catch (err) {
      mapError(err);
    }
  }),

  activate: publicProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(({ input }) => {
      try {
        return activateLicense(input.key);
      } catch (err) {
        mapError(err);
      }
    }),
});
