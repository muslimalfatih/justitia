import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { t, protectedProcedure } from '../index'
import { getSignedDownloadUrl, getCaseFiles, createAuditLog, AuditActions } from '@justitia/services'

/**
 * Files Router - Handles file access with strict access control
 */
export const filesRouter = t.router({
  /**
   * Get signed URL for downloading a file
   * Access control: Client owns case OR Lawyer has accepted quote
   */
  getSignedUrl: protectedProcedure
    .input(z.object({ storageKey: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const userRole = ctx.session.user.role as 'client' | 'lawyer'

      try {
        const signedUrl = await getSignedDownloadUrl(
          input.storageKey,
          ctx.session.user.id,
          userRole
        )

        // Audit log
        await createAuditLog({
          userId: ctx.session.user.id,
          action: AuditActions.FILE_DOWNLOADED,
          resourceType: 'file',
          resourceId: input.storageKey,
        })

        return { url: signedUrl }
      } catch (error) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error instanceof Error ? error.message : 'Access denied',
        })
      }
    }),

  /**
   * Get all files for a case (with access control)
   */
  getCaseFiles: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userRole = ctx.session.user.role as 'client' | 'lawyer'

      try {
        const files = await getCaseFiles(input.caseId, ctx.session.user.id, userRole)

        return files
      } catch (error) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error instanceof Error ? error.message : 'Access denied',
        })
      }
    }),
})
