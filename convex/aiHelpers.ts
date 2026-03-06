import { v } from 'convex/values'
import { mutation, internalMutation, internalQuery } from './_generated/server'
import { internal as _internal } from './_generated/api'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any

export const checkCredits = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) return { allowed: false, remaining: 0 }

    // Professional, Business, Enterprise: unlimited
    if (user.plan === 'professional' || user.plan === 'business' || user.plan === 'enterprise') {
      return { allowed: true, remaining: -1 }
    }

    // Starter: 5 credits/month, Free: 3 credits/month
    const used = user.aiCreditsUsed ?? 0
    const limit = user.plan === 'starter' ? 5 : 3
    return { allowed: used < limit, remaining: limit - used }
  },
})

export const createJob = internalMutation({
  args: {
    tourId: v.id('tours'),
    sceneId: v.optional(v.id('scenes')),
    type: v.union(
      v.literal('scene_analysis'),
      v.literal('staging'),
      v.literal('description'),
      v.literal('floor_plan'),
      v.literal('enhancement'),
      v.literal('auto_hotspots')
    ),
    input: v.optional(v.any()),
    provider: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    creditsUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('aiJobs', {
      ...args,
      status: 'pending',
    })
  },
})

export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id('aiJobs'),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )
    await ctx.db.patch(jobId, cleanUpdates)
  },
})

export const retryJob = mutation({
  args: { jobId: v.id('aiJobs') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const job = await ctx.db.get(args.jobId)
    if (!job) throw new Error('Job not found')
    if (job.status !== 'failed') throw new Error('Only failed jobs can be retried')

    await ctx.db.patch(args.jobId, {
      status: 'pending',
      error: undefined,
      output: undefined,
    })

    // Re-schedule the appropriate action based on job type
    if (job.type === 'scene_analysis' && job.sceneId) {
      const scene = await ctx.db.get(job.sceneId)
      if (scene) {
        await ctx.scheduler.runAfter(0, internal.aiActions.processAnalyzeScene, {
          jobId: args.jobId,
          sceneStorageId: scene.imageStorageId,
        })
      }
    } else if (job.type === 'staging' && job.sceneId) {
      const scene = await ctx.db.get(job.sceneId)
      if (scene) {
        await ctx.scheduler.runAfter(0, internal.aiActions.processStageScene, {
          jobId: args.jobId,
          sceneStorageId: scene.imageStorageId,
          style: job.input?.style ?? 'modern',
        })
      }
    } else if (job.type === 'enhancement' && job.sceneId) {
      const scene = await ctx.db.get(job.sceneId)
      if (scene) {
        await ctx.scheduler.runAfter(0, internal.aiActions.processEnhanceImage, {
          jobId: args.jobId,
          sceneStorageId: scene.imageStorageId,
        })
      }
    } else if (job.type === 'description') {
      await ctx.scheduler.runAfter(0, internal.aiActions.processGenerateDescription, {
        jobId: args.jobId,
        tourTitle: job.input?.tourTitle ?? '',
        sceneAnalyses: job.input?.sceneAnalyses ?? [],
        tone: job.input?.tone ?? 'professional',
      })
    }
  },
})

export const deductUserCredits = internalMutation({
  args: {
    userId: v.id('users'),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) return
    if (user.plan === 'professional' || user.plan === 'business' || user.plan === 'enterprise') return
    await ctx.db.patch(args.userId, {
      aiCreditsUsed: (user.aiCreditsUsed ?? 0) + args.credits,
    })
  },
})
