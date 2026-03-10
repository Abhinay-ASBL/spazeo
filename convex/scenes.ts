import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { internal as _internal } from './_generated/api'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any

const SCENE_LIMITS: Record<string, number> = {
  free: 10,
  starter: 25,
  professional: 50,
  business: -1, // unlimited
  enterprise: -1,
}

export const listByTour = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const scenesWithUrls = await Promise.all(
      scenes.map(async (scene) => {
        const imageUrl = scene.imageStorageId
          ? await ctx.storage.getUrl(scene.imageStorageId)
          : null
        const thumbnailUrl = scene.thumbnailStorageId
          ? await ctx.storage.getUrl(scene.thumbnailStorageId)
          : null
        const stagedImageUrl = scene.stagedImageStorageId
          ? await ctx.storage.getUrl(scene.stagedImageStorageId)
          : null
        return { ...scene, imageUrl, thumbnailUrl, stagedImageUrl }
      })
    )

    return scenesWithUrls.sort((a, b) => a.order - b.order)
  },
})

export const getById = query({
  args: { sceneId: v.id('scenes') },
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.sceneId)
    if (!scene) return null

    const imageUrl = scene.imageStorageId
      ? await ctx.storage.getUrl(scene.imageStorageId)
      : null
    const thumbnailUrl = scene.thumbnailStorageId
      ? await ctx.storage.getUrl(scene.thumbnailStorageId)
      : null
    const stagedImageUrl = scene.stagedImageStorageId
      ? await ctx.storage.getUrl(scene.stagedImageStorageId)
      : null

    const hotspots = await ctx.db
      .query('hotspots')
      .withIndex('by_sceneId', (q) => q.eq('sceneId', args.sceneId))
      .collect()

    return { ...scene, imageUrl, thumbnailUrl, stagedImageUrl, hotspots }
  },
})

export const create = mutation({
  args: {
    tourId: v.id('tours'),
    title: v.string(),
    imageStorageId: v.id('_storage'),
    order: v.number(),
    panoramaType: v.optional(
      v.union(v.literal('equirectangular'), v.literal('cubemap'), v.literal('gaussian'))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    // Enforce plan scene-per-tour limits
    const sceneLimit = SCENE_LIMITS[user.plan] ?? 10
    if (sceneLimit !== -1) {
      const existingScenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
        .collect()
      if (existingScenes.length >= sceneLimit) {
        throw new Error(
          `Scene limit reached. Your ${user.plan} plan allows ${sceneLimit} scenes per tour. Upgrade your plan to add more.`
        )
      }
    }

    const sceneId = await ctx.db.insert('scenes', {
      tourId: args.tourId,
      title: args.title,
      imageStorageId: args.imageStorageId,
      order: args.order,
      panoramaType: args.panoramaType ?? 'equirectangular',
    })

    // Log activity
    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'scene_uploaded',
      tourId: args.tourId,
      message: `Uploaded scene "${args.title}"`,
    })

    // Auto-trigger AI analysis on upload (use internal action to avoid auth issues in scheduler)
    const jobId = await ctx.runMutation(internal.aiHelpers.createJob, {
      tourId: args.tourId,
      sceneId,
      type: 'scene_analysis' as const,
      provider: 'openai',
      userId: user._id,
      creditsUsed: 1,
    })

    await ctx.scheduler.runAfter(0, internal.aiActions.processAnalyzeScene, {
      jobId,
      sceneStorageId: args.imageStorageId,
      tourId: args.tourId,
      sceneId,
      userId: user._id,
    })

    return sceneId
  },
})

export const update = mutation({
  args: {
    sceneId: v.id('scenes'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    roomType: v.optional(v.string()),
    aiAnalysis: v.optional(
      v.object({
        objects: v.optional(v.array(v.string())),
        features: v.optional(v.array(v.string())),
        qualityScore: v.optional(v.number()),
        suggestions: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const { sceneId, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )

    await ctx.db.patch(sceneId, cleanUpdates)
  },
})

export const reorder = mutation({
  args: {
    scenes: v.array(
      v.object({
        sceneId: v.id('scenes'),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    for (const { sceneId, order } of args.scenes) {
      await ctx.db.patch(sceneId, { order })
    }
  },
})

export const setCover = mutation({
  args: {
    tourId: v.id('tours'),
    sceneId: v.id('scenes'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    await ctx.db.patch(args.tourId, { coverSceneId: args.sceneId })
  },
})

export const replaceImage = mutation({
  args: {
    sceneId: v.id('scenes'),
    newImageStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const scene = await ctx.db.get(args.sceneId)
    if (!scene) throw new Error('Scene not found')

    // Delete old image from storage
    if (scene.imageStorageId) {
      await ctx.storage.delete(scene.imageStorageId)
    }

    // Clear staged image if it exists
    if (scene.stagedImageStorageId) {
      await ctx.storage.delete(scene.stagedImageStorageId)
    }

    await ctx.db.patch(args.sceneId, {
      imageStorageId: args.newImageStorageId,
      stagedImageStorageId: undefined,
      aiAnalysis: undefined,
    })
  },
})

export const remove = mutation({
  args: { sceneId: v.id('scenes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()

    const hotspots = await ctx.db
      .query('hotspots')
      .withIndex('by_sceneId', (q) => q.eq('sceneId', args.sceneId))
      .collect()

    for (const hotspot of hotspots) {
      await ctx.db.delete(hotspot._id)
    }

    const scene = await ctx.db.get(args.sceneId)
    if (scene) {
      if (scene.imageStorageId) {
        await ctx.storage.delete(scene.imageStorageId)
      }
      if (scene.thumbnailStorageId) {
        await ctx.storage.delete(scene.thumbnailStorageId)
      }
      if (scene.stagedImageStorageId) {
        await ctx.storage.delete(scene.stagedImageStorageId)
      }

      // If this scene was the cover, clear cover
      const tour = await ctx.db.get(scene.tourId)
      if (tour && tour.coverSceneId === args.sceneId) {
        await ctx.db.patch(scene.tourId, { coverSceneId: undefined })
      }

      // Log activity
      if (user) {
        await ctx.runMutation(internal.activity.log, {
          userId: user._id,
          type: 'scene_removed',
          tourId: scene.tourId,
          message: `Removed scene "${scene.title}" from tour`,
        })
      }
    }

    await ctx.db.delete(args.sceneId)
  },
})

// Internal mutation: update scene with AI analysis results
export const updateAiAnalysis = internalMutation({
  args: {
    sceneId: v.id('scenes'),
    roomType: v.optional(v.string()),
    aiAnalysis: v.object({
      objects: v.optional(v.array(v.string())),
      features: v.optional(v.array(v.string())),
      qualityScore: v.optional(v.number()),
      suggestions: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { aiAnalysis: args.aiAnalysis }
    if (args.roomType) updates.roomType = args.roomType
    await ctx.db.patch(args.sceneId, updates)
  },
})
