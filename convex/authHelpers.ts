import type { MutationCtx, QueryCtx } from './_generated/server'

/** Throws unless the caller is signed in AND has role 'owner' or 'admin'. */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) throw new Error('Not authenticated')

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('Admin access required')
  }
  return user
}

/** Throws unless the caller supplies the deployment's admin secret (CLI/scripts). */
export function requireAdminKey(providedKey: string | undefined) {
  const expected = process.env.LEGACY_TOWERS_ADMIN_KEY
  if (!expected) throw new Error('LEGACY_TOWERS_ADMIN_KEY not configured')
  if (!providedKey || providedKey !== expected) {
    throw new Error('Invalid admin key')
  }
}
