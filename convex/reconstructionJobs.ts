import { v } from 'convex/values'
import { query, mutation, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'

/** Monthly reconstruction limits per plan tier */
const RECONSTRUCTION_LIMITS: Record<string, number> = {
  free: 1,
  starter: 5,
  professional: 20,
  business: 20,
  enterprise: Infinity,
}

// Helper to get the authenticated user
async function getAuthUser(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
  db: any
}) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user) throw new Error('User not found')
  return user
}

/**
 * Count non-failed, non-cancelled reconstruction jobs for a user in the current calendar month.
 */
async function countMonthlyJobs(
  db: any,
  userId: string
): Promise<number> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  const jobs = await db
    .query('reconstructionJobs')
    .withIndex('by_userId', (q: any) => q.eq('userId', userId))
    .collect()

  return jobs.filter(
    (j: any) =>
      j._creationTime >= startOfMonth &&
      j.status !== 'failed' &&
      j.status !== 'cancelled'
  ).length
}

// --- Internal Queries ---

/**
 * Get a reconstruction job by ID. Internal query used by actions.
 */
export const getById = internalQuery({
  args: { jobId: v.id('reconstructionJobs') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId)
  },
})

/**
 * Get stale reconstruction jobs (started >30 min ago, still in active status).
 * Used by the polling cron to detect stuck jobs.
 */
export const getStaleJobs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const THIRTY_MINUTES_MS = 30 * 60 * 1000
    const cutoff = Date.now() - THIRTY_MINUTES_MS
    const activeStatuses = ['queued', 'extracting_frames', 'reconstructing', 'compressing']

    const allActive = await ctx.db
      .query('reconstructionJobs')
      .withIndex('by_status')
      .collect()

    return allActive.filter(
      (j) =>
        activeStatuses.includes(j.status) &&
        j.startedAt !== undefined &&
        j.startedAt < cutoff
    )
  },
})

/**
 * Find a reconstruction job by its RunPod job ID.
 * Used by the webhook handler for IN_PROGRESS updates.
 */
export const findByRunpodJobId = internalQuery({
  args: { runpodJobId: v.string() },
  handler: async (ctx, args) => {
    const allJobs = await ctx.db
      .query('reconstructionJobs')
      .collect()
    return allJobs.find((j) => j.runpodJobId === args.runpodJobId) ?? null
  },
})

// --- Internal Mutations ---

/**
 * Mark a job as failed by job ID (not runpodJobId).
 * Used when we have the Convex ID but not necessarily a runpodJobId.
 */
export const failById = internalMutation({
  args: {
    jobId: v.id('reconstructionJobs'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: 'failed' as const,
      error: args.error,
      completedAt: Date.now(),
    })
  },
})

// --- Mutations ---

/**
 * Create a new reconstruction job. Validates user owns the tour and checks plan limits.
 */
export const create = mutation({
  args: {
    tourId: v.id('tours'),
    inputType: v.union(v.literal('video'), v.literal('photos')),
    inputStorageIds: v.array(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    // Validate user owns the tour
    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    // Check plan limits
    const limit = RECONSTRUCTION_LIMITS[user.plan] ?? 1
    if (limit !== Infinity) {
      const used = await countMonthlyJobs(ctx.db, user._id)
      if (used >= limit) {
        throw new Error(
          `Reconstruction limit reached. Your ${user.plan} plan allows ${limit} reconstruction${limit === 1 ? '' : 's'} per month. Upgrade to create more.`
        )
      }
    }

    const jobId = await ctx.db.insert('reconstructionJobs', {
      tourId: args.tourId,
      userId: user._id,
      inputType: args.inputType,
      inputStorageIds: args.inputStorageIds,
      status: 'uploading',
      progress: 0,
    })

    // Auto-schedule submission to RunPod GPU after mutation commits
    await ctx.scheduler.runAfter(0, internal.reconstructionActions.submitToRunPod, { jobId })

    return jobId
  },
})

/**
 * Update job status and progress. Internal mutation used by actions and webhooks.
 */
export const updateStatus = internalMutation({
  args: {
    jobId: v.id('reconstructionJobs'),
    status: v.union(
      v.literal('uploading'),
      v.literal('queued'),
      v.literal('extracting_frames'),
      v.literal('reconstructing'),
      v.literal('compressing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
    progress: v.number(),
    runpodJobId: v.optional(v.string()),
    startedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )
    await ctx.db.patch(jobId, cleanUpdates)
  },
})

/**
 * Mark a job as completed. Finds job by runpodJobId, stores output, creates notification.
 * Internal mutation called by the RunPod webhook handler or polling action.
 */
export const complete = internalMutation({
  args: {
    runpodJobId: v.string(),
    outputStorageId: v.id('_storage'),
    outputMetadata: v.object({
      fileSizeBytes: v.number(),
      gaussianCount: v.number(),
      processingTimeMs: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Find job by runpodJobId
    const allJobs = await ctx.db
      .query('reconstructionJobs')
      .collect()
    const job = allJobs.find((j: any) => j.runpodJobId === args.runpodJobId)
    if (!job) throw new Error(`No reconstruction job found for runpodJobId: ${args.runpodJobId}`)

    await ctx.db.patch(job._id, {
      status: 'completed' as const,
      progress: 100,
      outputStorageId: args.outputStorageId,
      outputMetadata: args.outputMetadata,
      completedAt: Date.now(),
    })

    // Get tour title for notification message
    const tour = await ctx.db.get(job.tourId)
    const tourTitle = tour?.title ?? 'Unknown tour'

    // Create notification for the user
    await ctx.db.insert('notifications', {
      userId: job.userId,
      type: 'system' as const,
      title: '3D Reconstruction Complete',
      message: `Your tour "${tourTitle}" has been reconstructed. Review and accept the result.`,
      tourId: job.tourId,
      read: false,
      createdAt: Date.now(),
    })
  },
})

/**
 * Mark a job as failed. Finds job by runpodJobId, stores error message.
 * Internal mutation called by the RunPod webhook handler or polling action.
 */
export const fail = internalMutation({
  args: {
    runpodJobId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const allJobs = await ctx.db
      .query('reconstructionJobs')
      .collect()
    const job = allJobs.find((j: any) => j.runpodJobId === args.runpodJobId)
    if (!job) throw new Error(`No reconstruction job found for runpodJobId: ${args.runpodJobId}`)

    await ctx.db.patch(job._id, {
      status: 'failed' as const,
      error: args.error,
      completedAt: Date.now(),
    })
  },
})

/**
 * Cancel a reconstruction job. Authenticated mutation — user must own the job.
 */
export const cancel = mutation({
  args: { jobId: v.id('reconstructionJobs') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const job = await ctx.db.get(args.jobId)
    if (!job) throw new Error('Reconstruction job not found')
    if (job.userId !== user._id) throw new Error('Not authorized')

    await ctx.db.patch(args.jobId, {
      status: 'cancelled' as const,
      completedAt: Date.now(),
    })
  },
})

/**
 * Accept reconstruction result and link the splat to the tour.
 * Authenticated mutation — user must own the job and job must be completed.
 */
export const acceptResult = mutation({
  args: { jobId: v.id('reconstructionJobs') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const job = await ctx.db.get(args.jobId)
    if (!job) throw new Error('Reconstruction job not found')
    if (job.userId !== user._id) throw new Error('Not authorized')
    if (job.status !== 'completed') throw new Error('Job is not completed')
    if (!job.outputStorageId || !job.outputMetadata) {
      throw new Error('Job has no output to accept')
    }

    // Link splat to tour via internal mutation
    await ctx.runMutation(internal.tours.linkSplat, {
      tourId: job.tourId,
      splatStorageId: job.outputStorageId,
      splatMetadata: {
        ...job.outputMetadata,
        inputType: job.inputType,
      },
    })
  },
})

// --- Queries ---

/**
 * Get the most recent reconstruction job for a tour.
 * No auth required — used by the public viewer to show reconstruction status.
 */
export const getByTourId = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query('reconstructionJobs')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .order('desc')
      .take(1)
    return jobs[0] ?? null
  },
})

/**
 * Get the active (in-progress) reconstruction job for a tour.
 * Returns null if no active job exists.
 */
export const getActiveByTourId = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query('reconstructionJobs')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .order('desc')
      .collect()

    const activeStatuses = ['uploading', 'queued', 'extracting_frames', 'reconstructing', 'compressing']
    const activeJob = jobs.find((j) => activeStatuses.includes(j.status))
    return activeJob ?? null
  },
})

/**
 * Get all reconstruction jobs for the current user, ordered by creation time desc.
 * Authenticated query.
 */
export const getByUserId = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx)

    const jobs = await ctx.db
      .query('reconstructionJobs')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect()

    return jobs
  },
})

/**
 * Get the splat URL for a completed reconstruction job.
 * Returns null if job has no output or storage URL cannot be resolved.
 */
export const getSplatUrl = query({
  args: { jobId: v.id('reconstructionJobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job || !job.outputStorageId) return null
    const url = await ctx.storage.getUrl(job.outputStorageId)
    return url
  },
})

/**
 * Get remaining reconstruction quota for the current month.
 * Authenticated query.
 */
export const getRemainingQuota = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx)

    const limit = RECONSTRUCTION_LIMITS[user.plan] ?? 1
    const used = await countMonthlyJobs(ctx.db, user._id)

    return {
      used,
      limit: limit === Infinity ? -1 : limit,
      remaining: limit === Infinity ? -1 : Math.max(0, limit - used),
    }
  },
})
