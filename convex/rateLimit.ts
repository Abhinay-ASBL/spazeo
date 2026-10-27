import type { MutationCtx } from './_generated/server'

/**
 * Sliding fixed-window counter for unauthenticated public mutations.
 * Convex cannot see client IP — key on sessionId / email / tourId instead.
 */
export async function consumeRateLimit(
  ctx: MutationCtx,
  key: string,
  opts: { windowMs: number; max: number; cost?: number }
): Promise<void> {
  const cost = opts.cost ?? 1
  const now = Date.now()
  const existing = await ctx.db
    .query('rateLimitBuckets')
    .withIndex('by_key', (q) => q.eq('key', key))
    .first()

  if (!existing || now - existing.windowStart >= opts.windowMs) {
    if (existing) {
      await ctx.db.patch(existing._id, { count: cost, windowStart: now })
    } else {
      await ctx.db.insert('rateLimitBuckets', {
        key,
        count: cost,
        windowStart: now,
      })
    }
    return
  }

  if (existing.count + cost > opts.max) {
    throw new Error('Rate limit exceeded. Try again shortly.')
  }
  await ctx.db.patch(existing._id, { count: existing.count + cost })
}

/** Drop buckets whose window started more than 24h ago. */
export async function purgeStaleRateLimits(ctx: MutationCtx): Promise<number> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const rows = await ctx.db.query('rateLimitBuckets').collect()
  let n = 0
  for (const row of rows) {
    if (row.windowStart < cutoff) {
      await ctx.db.delete(row._id)
      n++
    }
  }
  return n
}
