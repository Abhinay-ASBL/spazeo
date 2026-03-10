import { v } from 'convex/values'
import { query, internalMutation } from './_generated/server'

export const create = internalMutation({
  args: {
    floorPlanId: v.id('floorPlanDetails'),
    userId: v.id('users'),
    imageStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('floorPlanJobs', {
      ...args,
      status: 'pending',
      createdAt: Date.now(),
    })
  },
})

export const updateStatus = internalMutation({
  args: {
    jobId: v.id('floorPlanJobs'),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )
    await ctx.db.patch(jobId, cleanUpdates)
  },
})

export const complete = internalMutation({
  args: {
    jobId: v.id('floorPlanJobs'),
    output: v.any(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: 'completed',
      output: args.output,
      duration: args.duration,
    })
  },
})

export const fail = internalMutation({
  args: {
    jobId: v.id('floorPlanJobs'),
    error: v.string(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: 'failed',
      error: args.error,
      duration: args.duration,
    })
  },
})

export const getByFloorPlan = query({
  args: { floorPlanId: v.id('floorPlanDetails') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const jobs = await ctx.db
      .query('floorPlanJobs')
      .withIndex('by_floorPlanId', (q) => q.eq('floorPlanId', args.floorPlanId))
      .collect()

    if (jobs.length === 0) return null

    // Return latest job (highest createdAt)
    return jobs.sort((a, b) => b.createdAt - a.createdAt)[0]
  },
})
