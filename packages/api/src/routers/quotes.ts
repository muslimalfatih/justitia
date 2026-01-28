import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { t, protectedProcedure } from '../index'
import { db, quotes, cases, eq, and, desc } from '@justitia/db'
import { createAuditLog, AuditActions } from '@justitia/services'

/**
 * Quotes Router - Handles quote submission and management
 */
export const quotesRouter = t.router({
  /**
   * Submit or update a quote (Lawyer only)
   * CRITICAL: Only one active quote per lawyer per case
   */
  submit: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        amount: z.number().positive().max(1000000),
        expectedDays: z.number().int().positive().max(365),
        note: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'lawyer') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only lawyers can submit quotes',
        })
      }

      // Verify case exists and is open
      const caseData = await db
        .select()
        .from(cases)
        .where(eq(cases.id, input.caseId))
        .limit(1)

      if (!caseData.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Case not found',
        })
      }

      const caseRecord = caseData[0]
      if (!caseRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Case not found',
        })
      }

      if (caseRecord.status !== 'open') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Case is not open for quotes',
        })
      }

      // Check for existing proposed quote
      const existingQuote = await db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.caseId, input.caseId),
            eq(quotes.lawyerId, ctx.session.user.id),
            eq(quotes.status, 'proposed')
          )
        )
        .limit(1)

      let quoteId: string

      if (existingQuote.length && existingQuote[0]) {
        // Update existing quote
        await db
          .update(quotes)
          .set({
            amount: input.amount.toString(),
            expectedDays: input.expectedDays,
            note: input.note || null,
            updatedAt: new Date(),
          })
          .where(eq(quotes.id, existingQuote[0].id))

        quoteId = existingQuote[0].id

        await createAuditLog({
          userId: ctx.session.user.id,
          action: AuditActions.QUOTE_UPDATED,
          resourceType: 'quote',
          resourceId: quoteId,
          changes: { amount: input.amount, expectedDays: input.expectedDays },
        })
      } else {
        // Create new quote
        const newQuotes = await db
          .insert(quotes)
          .values({
            caseId: input.caseId,
            lawyerId: ctx.session.user.id,
            amount: input.amount.toString(),
            expectedDays: input.expectedDays,
            note: input.note,
            status: 'proposed',
          })
          .returning()

        const newQuote = newQuotes[0]
        if (!newQuote) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create quote',
          })
        }

        quoteId = newQuote.id

        await createAuditLog({
          userId: ctx.session.user.id,
          action: AuditActions.QUOTE_SUBMITTED,
          resourceType: 'quote',
          resourceId: quoteId,
          changes: { caseId: input.caseId, amount: input.amount },
        })
      }

      return { quoteId, success: true }
    }),

  /**
   * Get my quotes as a lawyer
   */
  getMyQuotes: protectedProcedure
    .input(
      z.object({
        status: z.enum(['proposed', 'accepted', 'rejected']).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'lawyer') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only lawyers can view quotes',
        })
      }

      const offset = (input.page - 1) * input.pageSize

      const whereConditions = [eq(quotes.lawyerId, ctx.session.user.id)]

      if (input.status) {
        whereConditions.push(eq(quotes.status, input.status))
      }

      // Get quotes with case information
      const myQuotes = await db
        .select({
          id: quotes.id,
          caseId: quotes.caseId,
          lawyerId: quotes.lawyerId,
          amount: quotes.amount,
          expectedDays: quotes.expectedDays,
          note: quotes.note,
          status: quotes.status,
          createdAt: quotes.createdAt,
          updatedAt: quotes.updatedAt,
          case: {
            id: cases.id,
            title: cases.title,
            category: cases.category,
            status: cases.status,
          },
        })
        .from(quotes)
        .innerJoin(cases, eq(quotes.caseId, cases.id))
        .where(and(...whereConditions))
        .orderBy(desc(quotes.createdAt))
        .limit(input.pageSize)
        .offset(offset)

      return {
        items: myQuotes,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
        },
      }
    }),

  /**
   * Get quote for a specific case (Lawyer)
   */
  getMyQuoteForCase: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'lawyer') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only lawyers can view quotes',
        })
      }

      const quote = await db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.caseId, input.caseId),
            eq(quotes.lawyerId, ctx.session.user.id),
            eq(quotes.status, 'proposed')
          )
        )
        .limit(1)

      return quote[0] || null
    }),

  /**
   * Get all quotes for a case (Client only)
   */
  getQuotesForCase: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'client') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can view case quotes',
        })
      }

      // Verify case ownership
      const caseData = await db
        .select()
        .from(cases)
        .where(and(eq(cases.id, input.caseId), eq(cases.clientId, ctx.session.user.id)))
        .limit(1)

      if (!caseData.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Case not found',
        })
      }

      // Get all quotes for this case
      const caseQuotes = await db
        .select({
          id: quotes.id,
          amount: quotes.amount,
          expectedDays: quotes.expectedDays,
          note: quotes.note,
          status: quotes.status,
          createdAt: quotes.createdAt,
          // Don't expose lawyer identity until quote is accepted
        })
        .from(quotes)
        .where(eq(quotes.caseId, input.caseId))
        .orderBy(desc(quotes.createdAt))

      return caseQuotes
    }),

  /**
   * Delete/withdraw a quote (Lawyer only)
   */
  withdraw: protectedProcedure
    .input(z.object({ quoteId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'lawyer') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only lawyers can withdraw quotes',
        })
      }

      // Verify ownership and status
      const quote = await db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.id, input.quoteId),
            eq(quotes.lawyerId, ctx.session.user.id),
            eq(quotes.status, 'proposed')
          )
        )
        .limit(1)

      if (!quote.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found or cannot be withdrawn',
        })
      }

      // Delete the quote
      await db.delete(quotes).where(eq(quotes.id, input.quoteId))

      await createAuditLog({
        userId: ctx.session.user.id,
        action: 'quote.withdrawn',
        resourceType: 'quote',
        resourceId: input.quoteId,
      })

      return { success: true }
    }),
})
