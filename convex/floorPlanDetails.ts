import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'

export const create = mutation({
  args: {
    projectId: v.optional(v.id('floorPlanProjects')),
    tourId: v.optional(v.id('tours')),
    floorNumber: v.number(),
    label: v.optional(v.string()),
    imageStorageId: v.id('_storage'),
    originalFileType: v.union(v.literal('pdf'), v.literal('image'), v.literal('sketch')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const now = Date.now()
    return await ctx.db.insert('floorPlanDetails', {
      ...args,
      userId: user._id,
      extractionStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const getById = query({
  args: { floorPlanId: v.id('floorPlanDetails') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const floorPlan = await ctx.db.get(args.floorPlanId)
    if (!floorPlan) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user._id !== floorPlan.userId) return null

    return floorPlan
  },
})

export const listByProject = query({
  args: { projectId: v.id('floorPlanProjects') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const floorPlans = await ctx.db
      .query('floorPlanDetails')
      .withIndex('by_projectId', (q) => q.eq('projectId', args.projectId))
      .collect()

    return floorPlans.sort((a, b) => a.floorNumber - b.floorNumber)
  },
})

export const listByProjectWithUrls = query({
  args: { projectId: v.id('floorPlanProjects') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const floorPlans = await ctx.db
      .query('floorPlanDetails')
      .withIndex('by_projectId', (q) => q.eq('projectId', args.projectId))
      .collect()

    const withUrls = await Promise.all(
      floorPlans.map(async (fp) => {
        const imageUrl = await ctx.storage.getUrl(fp.imageStorageId)
        return { ...fp, imageUrl: imageUrl ?? '' }
      })
    )

    return withUrls.sort((a, b) => a.floorNumber - b.floorNumber)
  },
})

export const updateGeometry = mutation({
  args: {
    floorPlanId: v.id('floorPlanDetails'),
    geometry: v.object({
      walls: v.array(v.any()),
      rooms: v.array(v.any()),
      doors: v.optional(v.array(v.any())),
      windows: v.optional(v.array(v.any())),
      fixtures: v.optional(v.array(v.any())),
      dimensions: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const floorPlan = await ctx.db.get(args.floorPlanId)
    if (!floorPlan) throw new Error('Floor plan not found')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user._id !== floorPlan.userId) throw new Error('Not authorized')

    const newVersion = (floorPlan.currentVersion ?? 0) + 1

    await ctx.db.patch(args.floorPlanId, {
      geometry: args.geometry,
      currentVersion: newVersion,
      updatedAt: Date.now(),
    })

    // Save version snapshot
    await ctx.db.insert('floorPlanVersions', {
      floorPlanId: args.floorPlanId,
      versionNumber: newVersion,
      geometry: args.geometry,
      source: 'user',
      createdAt: Date.now(),
    })
  },
})

export const saveVersion = internalMutation({
  args: {
    floorPlanId: v.id('floorPlanDetails'),
    versionNumber: v.number(),
    geometry: v.any(),
    source: v.union(v.literal('ai'), v.literal('user')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('floorPlanVersions', {
      floorPlanId: args.floorPlanId,
      versionNumber: args.versionNumber,
      geometry: args.geometry,
      source: args.source,
      createdAt: Date.now(),
    })
  },
})

export const resetToAiVersion = mutation({
  args: { floorPlanId: v.id('floorPlanDetails') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const floorPlan = await ctx.db.get(args.floorPlanId)
    if (!floorPlan) throw new Error('Floor plan not found')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user._id !== floorPlan.userId) throw new Error('Not authorized')

    // Find version 1 (the AI-generated version)
    const versions = await ctx.db
      .query('floorPlanVersions')
      .withIndex('by_floorPlanId', (q) => q.eq('floorPlanId', args.floorPlanId))
      .collect()

    const aiVersion = versions.find((v) => v.versionNumber === 1 && v.source === 'ai')
    if (!aiVersion) throw new Error('No AI version found to reset to')

    const newVersion = (floorPlan.currentVersion ?? 0) + 1

    await ctx.db.patch(args.floorPlanId, {
      geometry: aiVersion.geometry,
      currentVersion: newVersion,
      updatedAt: Date.now(),
    })

    // Create a new version record for this reset
    await ctx.db.insert('floorPlanVersions', {
      floorPlanId: args.floorPlanId,
      versionNumber: newVersion,
      geometry: aiVersion.geometry,
      source: 'user',
      createdAt: Date.now(),
    })

    return { geometry: aiVersion.geometry }
  },
})

// Internal mutation for AI extraction to update geometry and status
export const updateExtractionResult = internalMutation({
  args: {
    floorPlanId: v.id('floorPlanDetails'),
    geometry: v.any(),
    extractionJobId: v.id('floorPlanJobs'),
    extractionStatus: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.floorPlanId, {
      geometry: args.geometry,
      extractionJobId: args.extractionJobId,
      extractionStatus: args.extractionStatus,
      currentVersion: 1,
      updatedAt: Date.now(),
    })
  },
})

// Internal mutation to update extraction status only (for processing/failed states)
export const updateExtractionStatus = internalMutation({
  args: {
    floorPlanId: v.id('floorPlanDetails'),
    extractionJobId: v.optional(v.id('floorPlanJobs')),
    extractionStatus: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      extractionStatus: args.extractionStatus,
      updatedAt: Date.now(),
    }
    if (args.extractionJobId !== undefined) {
      patch.extractionJobId = args.extractionJobId
    }
    await ctx.db.patch(args.floorPlanId, patch)
  },
})
