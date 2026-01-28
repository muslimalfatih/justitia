import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { t, protectedProcedure } from '../index'
import { createPaymentIntent, getPaymentStatus, createAuditLog, AuditActions } from '@justitia/services'

/**
 * Payments Router - Handles Stripe payment integration
 */
export const paymentsRouter = t.router({
  /**
   * Create payment intent for accepting a quote (Client only)
   */
  createIntent: protectedProcedure
    .input(z.object({ quoteId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'client') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can make payments',
        })
      }

      try {
        const { clientSecret, paymentIntentId } = await createPaymentIntent(
          input.quoteId,
          ctx.session.user.id
        )

        // Audit log
        await createAuditLog({
          userId: ctx.session.user.id,
          action: AuditActions.PAYMENT_INITIATED,
          resourceType: 'payment',
          resourceId: paymentIntentId,
          changes: { quoteId: input.quoteId },
        })

        return {
          clientSecret,
          paymentIntentId,
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment intent',
        })
      }
    }),

  /**
   * Get payment status for a case
   */
  getPaymentStatus: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'client') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can view payment status',
        })
      }

      const payment = await getPaymentStatus(input.caseId, ctx.session.user.id)

      return payment
    }),
})
