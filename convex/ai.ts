import { v } from 'convex/values'
import { query } from './_generated/server'

// --- Queries ---

export const listJobs = query({
  args: {
    type: v.optional(
      v.union(
        v.literal('scene_analysis'),
        v.literal('staging'),
        v.literal('description'),
        v.literal('floor_plan'),
        v.literal('enhancement'),
        v.literal('auto_hotspots')
      )
    ),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed')
      )
    ),
    tourId: v.optional(v.id('tours')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    // ponytail: capped rather than a compound index per filter combo — a user's
    // recent 500 jobs is plenty for this list view; raise the cap if that's ever wrong.
    let jobs = await ctx.db
      .query('aiJobs')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(500)

    if (args.type) {
      jobs = jobs.filter((j) => j.type === args.type)
    }
    if (args.status) {
      jobs = jobs.filter((j) => j.status === args.status)
    }
    if (args.tourId) {
      jobs = jobs.filter((j) => j.tourId === args.tourId)
    }

    return jobs
  },
})

export const getJobsByTour = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('aiJobs')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .order('desc')
      .collect()
  },
})

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    const creditsUsed = user.aiCreditsUsed ?? 0
    const isUnlimited =
      user.plan === 'professional' || user.plan === 'business' || user.plan === 'enterprise'
    const limit = isUnlimited ? -1 : user.plan === 'starter' ? 5 : 3

    return {
      creditsUsed,
      limit,
      isUnlimited,
      remaining: isUnlimited ? -1 : Math.max(0, limit - creditsUsed),
    }
  },
})
