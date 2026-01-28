import { db, auditLogs } from '@justitia/db'

interface AuditLogData {
  userId?: string
  action: string
  resourceType: string
  resourceId: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: data.userId || null,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      changes: data.changes ? JSON.stringify(data.changes) : null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Common audit actions
 */
export const AuditActions = {
  CASE_CREATED: 'case.created',
  CASE_UPDATED: 'case.updated',
  CASE_CLOSED: 'case.closed',
  CASE_CANCELLED: 'case.cancelled',
  QUOTE_SUBMITTED: 'quote.submitted',
  QUOTE_UPDATED: 'quote.updated',
  QUOTE_ACCEPTED: 'quote.accepted',
  QUOTE_REJECTED: 'quote.rejected',
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  FILE_UPLOADED: 'file.uploaded',
  FILE_DOWNLOADED: 'file.downloaded',
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
} as const
