import { protectedProcedure, publicProcedure, router } from "../index";
import { casesRouter } from "./cases";
import { quotesRouter } from "./quotes";
import { filesRouter } from "./files";
import { paymentsRouter } from "./payments";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  
  // Business routers
  cases: casesRouter,
  quotes: quotesRouter,
  files: filesRouter,
  payments: paymentsRouter,
});

export type AppRouter = typeof appRouter;
