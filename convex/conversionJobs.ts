import { v } from 'convex/values'
import {
  query,
  mutation,
  action,
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from './_generated/server'
import type { Id } from './_generated/dataModel'
import { api as _api } from './_generated/api'
import { deleteOptimizedModel } from './buildings'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = _api as any

// --- Queries ---

async function requireBuildingOwner(
  ctx: QueryCtx | MutationCtx,
  buildingId: Id<'buildings'>
) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) return null
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
  const building = await ctx.db.get(buildingId)
  if (!user || !building || building.userId !== user._id) return null
  return user
}

export const listByBuilding = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    if (!(await requireBuildingOwner(ctx, args.buildingId))) return []

    // Capped: unbounded .collect() caused the OOM crash-loop incident
    // (2026-08-26). A building's most-recent 200 conversion attempts is
    // plenty for this list view.
    return await ctx.db
      .query('conversionJobs')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .order('desc')
      .take(200)
  },
})

export const getById = query({
  args: { jobId: v.id('conversionJobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) return null
    if (!(await requireBuildingOwner(ctx, job.buildingId))) return null
    return job
  },
})

export const getLatest = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    if (!(await requireBuildingOwner(ctx, args.buildingId))) return null

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
    if (!(await requireBuildingOwner(ctx, args.buildingId))) throw new Error('Forbidden')

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

    // Replace the building's optimizedModelStorageId, deleting the previous
    // optimized file (and detaching it from the job that produced it).
    const building = await ctx.db.get(job.buildingId)
    const previous = building?.optimizedModelStorageId
    if (previous && previous !== args.outputStorageId && previous !== building?.modelStorageId) {
      await deleteOptimizedModel(ctx, job.buildingId, previous)
    }
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
    const job = await ctx.db.get(args.jobId)
    if (!job) throw new Error('Conversion job not found')
    if (!(await requireBuildingOwner(ctx, job.buildingId))) throw new Error('Forbidden')

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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
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
