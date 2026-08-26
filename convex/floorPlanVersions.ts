import { v } from 'convex/values'
import { query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

async function requireFloorPlanOwner(ctx: QueryCtx, floorPlanId: Id<'floorPlanDetails'>) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) return null

  const floorPlan = await ctx.db.get(floorPlanId)
  if (!floorPlan) return null

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user || user._id !== floorPlan.userId) return null

  return user
}

export const listByFloorPlan = query({
  args: { floorPlanId: v.id('floorPlanDetails') },
  handler: async (ctx, args) => {
    if (!(await requireFloorPlanOwner(ctx, args.floorPlanId))) return []

    const versions = await ctx.db
      .query('floorPlanVersions')
      .withIndex('by_floorPlanId', (q) => q.eq('floorPlanId', args.floorPlanId))
      .collect()

    return versions.sort((a, b) => b.versionNumber - a.versionNumber)
  },
})

export const getVersion = query({
  args: {
    floorPlanId: v.id('floorPlanDetails'),
    versionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    if (!(await requireFloorPlanOwner(ctx, args.floorPlanId))) return null

    const versions = await ctx.db
      .query('floorPlanVersions')
      .withIndex('by_floorPlanId', (q) => q.eq('floorPlanId', args.floorPlanId))
      .collect()

    return versions.find((v) => v.versionNumber === args.versionNumber) ?? null
  },
})
