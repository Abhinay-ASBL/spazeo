import { v } from 'convex/values'
import { query, mutation, action, internalMutation } from './_generated/server'
import { api as _api, internal as _internal } from './_generated/api'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = _api as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any

// --- Queries ---

export const listByBuilding = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('conversionJobs')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .order('desc')
      .collect()
  },
})

export const getById = query({
  args: { jobId: v.id('conversionJobs') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId)
  },
})

export const getLatest = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('conversionJobs')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .order('desc')
      .first()
  },
})

// --- Mutations ---

export const create = mutation({
  args: {
    buildingId: v.id('buildings'),
    inputStorageId: v.id('_storage'),
    inputFormat: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    return await ctx.db.insert('conversionJobs', {
      buildingId: args.buildingId,
      inputStorageId: args.inputStorageId,
      inputFormat: args.inputFormat,
      status: 'pending',
      progress: 0,
      startedAt: Date.now(),
    })
  },
})

export const updateProgress = internalMutation({
  args: {
    jobId: v.id('conversionJobs'),
    progress: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) throw new Error('Conversion job not found')

    const patch: { progress: number; status?: 'processing' } = {
      progress: args.progress,
    }

    if (job.status === 'pending') {
      patch.status = 'processing'
    }

    await ctx.db.patch(args.jobId, patch)
  },
})

export const complete = internalMutation({
  args: {
    jobId: v.id('conversionJobs'),
    outputStorageId: v.id('_storage'),
    polyCount: v.optional(v.number()),
    textureCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) throw new Error('Conversion job not found')

    await ctx.db.patch(args.jobId, {
      status: 'completed',
      completedAt: Date.now(),
      progress: 100,
      outputStorageId: args.outputStorageId,
      polyCount: args.polyCount,
      textureCount: args.textureCount,
    })

    // Update the building's optimizedModelStorageId
    await ctx.db.patch(job.buildingId, {
      optimizedModelStorageId: args.outputStorageId,
    })
  },
})

export const fail = internalMutation({
  args: {
    jobId: v.id('conversionJobs'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) throw new Error('Conversion job not found')

    await ctx.db.patch(args.jobId, {
      status: 'failed',
      error: args.error,
    })
  },
})

export const retry = mutation({
  args: { jobId: v.id('conversionJobs') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const job = await ctx.db.get(args.jobId)
    if (!job) throw new Error('Conversion job not found')

    await ctx.db.patch(args.jobId, {
      status: 'pending',
      progress: 0,
      error: undefined,
      outputStorageId: undefined,
      startedAt: Date.now(),
    })
  },
})

// --- Action ---

export const triggerConversion = action({
  args: {
    buildingId: v.id('buildings'),
    inputStorageId: v.id('_storage'),
    inputFormat: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const jobId = await ctx.runMutation(
      api.conversionJobs.create,
      {
        buildingId: args.buildingId,
        inputStorageId: args.inputStorageId,
        inputFormat: args.inputFormat,
      }
    )

    // TODO: Call external Docker worker for actual conversion
    console.log(
      'Conversion job created, external worker would be triggered here'
    )

    return jobId
  },
})
