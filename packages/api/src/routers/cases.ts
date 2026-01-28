import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { t, protectedProcedure } from '../index'
import { db, cases, files, quotes, eq, and, desc, sql, count } from '@justitia/db'
import { createAuditLog, AuditActions } from '@justitia/services'

/**
 * Cases Router - Handles case management for clients and lawyers
 */
export const casesRouter = t.router({
  /**
   * Create a new case (Client only)
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(5).max(255),
        category: z.enum([
          'contract',
          'family',
          'corporate',
          'criminal',
          'civil',
          'property',
          'employment',
          'immigration',
          'intellectual_property',
          'other',
        ]),
        description: z.string().min(20),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'client') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can create cases',
        })
      }

      const newCases = await db
        .insert(cases)
        .values({
          clientId: ctx.session.user.id,
          title: input.title,
          category: input.category,
          description: input.description,
          status: 'open',
        })
        .returning()

      const newCase = newCases[0]
      if (!newCase) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create case',
        })
      }

      // Audit log
      await createAuditLog({
        userId: ctx.session.user.id,
        action: AuditActions.CASE_CREATED,
        resourceType: 'case',
        resourceId: newCase.id,
        changes: { title: input.title, category: input.category },
      })

      return newCase
    }),

  /**
   * Get my cases (Client only)
   */
  getMyCases: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(10),
        status: z.enum(['open', 'engaged', 'closed', 'cancelled']).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'client') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can view their cases',
        })
      }

      const offset = (input.page - 1) * input.pageSize

      const whereClause = input.status
        ? and(eq(cases.clientId, ctx.session.user.id), eq(cases.status, input.status))
        : eq(cases.clientId, ctx.session.user.id)

      // Get total count
      const countResult = await db
        .select({ total: count() })
        .from(cases)
        .where(whereClause)
      
      const total = countResult[0]?.total ?? 0

      // Get cases with quote and file counts
      const casesData = await db
        .select({
          id: cases.id,
          title: cases.title,
          category: cases.category,
          description: cases.description,
          status: cases.status,
          acceptedQuoteId: cases.acceptedQuoteId,
          createdAt: cases.createdAt,
          updatedAt: cases.updatedAt,
          quoteCount: sql<number>`COUNT(DISTINCT ${quotes.id})`.as('quote_count'),
          fileCount: sql<number>`COUNT(DISTINCT ${files.id})`.as('file_count'),
        })
        .from(cases)
        .leftJoin(quotes, eq(quotes.caseId, cases.id))
        .leftJoin(files, eq(files.caseId, cases.id))
        .where(whereClause)
        .groupBy(cases.id)
        .orderBy(desc(cases.createdAt))
        .limit(input.pageSize)
        .offset(offset)

      return {
        items: casesData,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / input.pageSize),
        },
      }
    }),

  /**
   * Get a single case detail (Client only)
   */
  getCaseById: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'client') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can view case details',
        })
      }

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

      // Get files for this case
      const caseFiles = await db.select().from(files).where(eq(files.caseId, input.caseId))

      // Get quotes for this case
      const caseQuotes = await db
        .select()
        .from(quotes)
        .where(eq(quotes.caseId, input.caseId))
        .orderBy(desc(quotes.createdAt))

      return {
        case: caseData[0],
        files: caseFiles,
        quotes: caseQuotes,
      }
    }),

  /**
   * Get marketplace cases (Lawyer only) - Anonymized
   */
  getMarketplace: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(10),
        category: z
          .enum([
            'contract',
            'family',
            'corporate',
            'criminal',
            'civil',
            'property',
            'employment',
            'immigration',
            'intellectual_property',
            'other',
          ])
          .optional(),
        createdSince: z.string().datetime().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'lawyer') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only lawyers can view the marketplace',
        })
      }

      const offset = (input.page - 1) * input.pageSize

      // Build where conditions
      const conditions = [eq(cases.status, 'open')]

      if (input.category) {
        conditions.push(eq(cases.category, input.category))
      }

      if (input.createdSince) {
        conditions.push(sql`${cases.createdAt} >= ${input.createdSince}`)
      }

      const whereClause = and(...conditions)

      // Get total count  
      const countResult = await db.select({ total: count() }).from(cases).where(whereClause)
      const total = countResult[0]?.total ?? 0

      // Get cases with quote count (anonymized - no client info)
      const marketplaceCases = await db
        .select({
          id: cases.id,
          title: cases.title,
          category: cases.category,
          description: cases.description,
          status: cases.status,
          createdAt: cases.createdAt,
          quoteCount: sql<number>`COUNT(DISTINCT ${quotes.id})`.as('quote_count'),
        })
        .from(cases)
        .leftJoin(quotes, eq(quotes.caseId, cases.id))
        .where(whereClause)
        .groupBy(cases.id)
        .orderBy(desc(cases.createdAt))
        .limit(input.pageSize)
        .offset(offset)

      return {
        items: marketplaceCases,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / input.pageSize),
        },
      }
    }),

  /**
   * Get case detail for lawyer (after quote acceptance)
   */
  getCaseForLawyer: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'lawyer') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only lawyers can view this',
        })
      }

      // Check if lawyer has accepted quote for this case
      const caseData = await db
        .select({
          case: cases,
          quote: quotes,
        })
        .from(cases)
        .innerJoin(
          quotes,
          and(
            eq(quotes.caseId, cases.id),
            eq(quotes.lawyerId, ctx.session.user.id),
            eq(quotes.status, 'accepted')
          )
        )
        .where(and(eq(cases.id, input.caseId), eq(cases.status, 'engaged')))
        .limit(1)

      if (!caseData.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Case not found or you do not have access',
        })
      }

      const result = caseData[0]
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Case data not found',
        })
      }

      // Get files for this case (now lawyer has access)
      const caseFiles = await db.select().from(files).where(eq(files.caseId, input.caseId))

      return {
        case: result.case,
        quote: result.quote,
        files: caseFiles,
      }
    }),

  /**
   * Update case status (Client only)
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        status: z.enum(['closed', 'cancelled']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'client') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can update case status',
        })
      }

      // Verify ownership
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

      // Update status
      await db
        .update(cases)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(cases.id, input.caseId))

      // Audit log
      await createAuditLog({
        userId: ctx.session.user.id,
        action: input.status === 'closed' ? AuditActions.CASE_CLOSED : AuditActions.CASE_CANCELLED,
        resourceType: 'case',
        resourceId: input.caseId,
        changes: { status: input.status },
      })

      return { success: true }
    }),
})
