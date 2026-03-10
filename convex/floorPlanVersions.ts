import { v } from 'convex/values'
import { query } from './_generated/server'

export const listByFloorPlan = query({
  args: { floorPlanId: v.id('floorPlanDetails') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const versions = await ctx.db
      .query('floorPlanVersions')
      .withIndex('by_floorPlanId', (q) => q.eq('floorPlanId', args.floorPlanId))
      .collect()

    return versions.find((v) => v.versionNumber === args.versionNumber) ?? null
  },
})
