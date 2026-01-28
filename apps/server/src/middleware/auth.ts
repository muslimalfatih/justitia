import { TRPCError } from '@trpc/server'
import type { Context } from '@justitia/api/context'

/**
 * Middleware to require authentication
 */
export async function requireAuth(ctx: Context) {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    })
  }
  return ctx
}

/**
 * Middleware to require specific user role(s)
 */
export function requireRole(...allowedRoles: ('client' | 'lawyer')[]) {
  return async (ctx: Context) => {
    await requireAuth(ctx)

    const userRole = ctx.session!.user.role

    if (!allowedRoles.includes(userRole as 'client' | 'lawyer')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      })
    }

    return ctx
  }
}

/**
 * Middleware for client-only routes
 */
export const requireClient = () => requireRole('client')

/**
 * Middleware for lawyer-only routes
 */
export const requireLawyer = () => requireRole('lawyer')
