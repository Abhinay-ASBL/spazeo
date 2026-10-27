import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { internal as _internal } from './_generated/api'
import { requireAdminKey } from './authHelpers'
import type { QueryCtx, MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any

/**
 * Deletes a scene image/thumbnail file unless another scene still uses it
 * (tours.duplicate copies storage ids instead of files).
 */
export async function deleteSceneFileIfUnused(
  ctx: MutationCtx,
  storageId: Id<'_storage'>,
  sceneId: Id<'scenes'>
) {
  const byImage = await ctx.db
    .query('scenes')
    .withIndex('by_imageStorageId', (q) => q.eq('imageStorageId', storageId))
    .take(2)
  const byThumb = await ctx.db
    .query('scenes')
    .withIndex('by_thumbnailStorageId', (q) => q.eq('thumbnailStorageId', storageId))
    .take(2)
  if ([...byImage, ...byThumb].some((s) => s._id !== sceneId)) return
  await ctx.storage.delete(storageId)
}

const SCENE_LIMITS: Record<string, number> = {
  free: 10,
  starter: 25,
  professional: 50,
  business: -1, // unlimited
  enterprise: -1,
}

const timeOfDayValidator = v.union(
  v.literal('morning'),
  v.literal('afternoon'),
  v.literal('evening'),
  v.literal('sunset'),
  v.literal('night')
)

const variantTypeValidator = v.union(
  v.literal('default'),
  v.literal('timeOfDay'),
  v.literal('staged'),
  v.literal('seasonal')
)

/** Option A: scenes without variantKey count as their own _id. */
function variantIdentity(scene: { _id: Id<'scenes'>; variantKey?: string }) {
  return scene.variantKey ?? (scene._id as string)
}

function countDistinctVariantKeys(
  scenes: Array<{ _id: Id<'scenes'>; variantKey?: string }>
) {
  return new Set(scenes.map(variantIdentity)).size
}

/** Group scenes by variantKey (or _id when missing). */
export function groupScenesByVariantKey<
  T extends { _id: Id<'scenes'>; variantKey?: string },
>(scenes: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const scene of scenes) {
    const key = variantIdentity(scene)
    const list = groups.get(key)
    if (list) list.push(scene)
    else groups.set(key, [scene])
  }
  return groups
}

async function refreshTourSceneCounts(
  ctx: MutationCtx,
  tourId: Id<'tours'>
) {
  const scenes = await ctx.db
    .query('scenes')
    .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
    .collect()
  await ctx.db.patch(tourId, {
    sceneCount: countDistinctVariantKeys(scenes),
    variantCount: scenes.length,
  })
}

async function requireSceneOwner(ctx: QueryCtx | MutationCtx, sceneId: Id<'scenes'>) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) throw new Error('Not authenticated')

  const scene = await ctx.db.get(sceneId)
  if (!scene) throw new Error('Scene not found')

  const tour = await ctx.db.get(scene.tourId)
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user || !tour || tour.userId !== user._id) throw new Error('Not authorized')

  return { scene, tour, user }
}

export const listByTour = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    const tour = await ctx.db.get(args.tourId)
    if (!user || !tour || tour.userId !== user._id) return []

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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    const scene = await ctx.db.get(args.sceneId)
    const owningTour = scene ? await ctx.db.get(scene.tourId) : null
    if (!scene || !user || !owningTour || owningTour.userId !== user._id) return null

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
    variantKey: v.optional(v.string()),
    variantType: v.optional(variantTypeValidator),
    timeOfDay: v.optional(timeOfDayValidator),
    isPrimaryVariant: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) throw new Error('Not authorized')

    const existingScenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    // Option A: plan limit = distinct variantKey (new variant of existing key does not consume)
    const sceneLimit = SCENE_LIMITS[user.plan] ?? 10
    if (sceneLimit !== -1) {
      const existingKeys = countDistinctVariantKeys(existingScenes)
      const isNewKey =
        !args.variantKey ||
        !existingScenes.some((s) => s.variantKey === args.variantKey)
      if (isNewKey && existingKeys >= sceneLimit) {
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
      ...(args.variantKey !== undefined ? { variantKey: args.variantKey } : {}),
      ...(args.variantType !== undefined ? { variantType: args.variantType } : {}),
      ...(args.timeOfDay !== undefined ? { timeOfDay: args.timeOfDay } : {}),
      ...(args.isPrimaryVariant !== undefined
        ? { isPrimaryVariant: args.isPrimaryVariant }
        : {}),
    })

    await refreshTourSceneCounts(ctx, args.tourId)

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
    variantKey: v.optional(v.string()),
    variantType: v.optional(variantTypeValidator),
    timeOfDay: v.optional(timeOfDayValidator),
    isPrimaryVariant: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { scene } = await requireSceneOwner(ctx, args.sceneId)

    const { sceneId, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )

    await ctx.db.patch(sceneId, cleanUpdates)

    // Recount when variant grouping fields change
    if (
      args.variantKey !== undefined ||
      args.variantType !== undefined ||
      args.timeOfDay !== undefined ||
      args.isPrimaryVariant !== undefined
    ) {
      await refreshTourSceneCounts(ctx, scene.tourId)
    }
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
    for (const { sceneId } of args.scenes) {
      await requireSceneOwner(ctx, sceneId)
    }

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
    const { scene } = await requireSceneOwner(ctx, args.sceneId)
    if (scene.tourId !== args.tourId) throw new Error('Scene does not belong to this tour')

    await ctx.db.patch(args.tourId, { coverSceneId: args.sceneId })
  },
})

export const replaceImage = mutation({
  args: {
    sceneId: v.id('scenes'),
    newImageStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const { scene } = await requireSceneOwner(ctx, args.sceneId)

    // Delete old image from storage
    if (scene.imageStorageId !== undefined) {
      await deleteSceneFileIfUnused(ctx, scene.imageStorageId, scene._id)
    }

    // Clear staged image if it exists
    if (scene.stagedImageStorageId !== undefined) {
      await ctx.storage.delete(scene.stagedImageStorageId)
    }

    await ctx.db.patch(args.sceneId, {
      imageStorageId: args.newImageStorageId,
      stagedImageStorageId: undefined,
      aiAnalysis: undefined,
    })
  },
})

/** CLI/admin re-upload (e.g. panorama recompress). No Clerk JWT — use with deploy admin key only. */
export const replaceImageAdmin = mutation({
  args: {
    sceneId: v.id('scenes'),
    newImageStorageId: v.id('_storage'),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdminKey(args.adminKey)
    const scene = await ctx.db.get(args.sceneId)
    if (!scene) throw new Error('Scene not found')

    if (scene.imageStorageId !== undefined && scene.imageStorageId !== args.newImageStorageId) {
      await deleteSceneFileIfUnused(ctx, scene.imageStorageId, scene._id)
    }
    if (scene.stagedImageStorageId !== undefined) {
      await ctx.storage.delete(scene.stagedImageStorageId)
    }

    await ctx.db.patch(args.sceneId, {
      imageStorageId: args.newImageStorageId,
      stagedImageStorageId: undefined,
    })
  },
})

/** CLI upload URL (pair with replaceImageAdmin). */
export const generateUploadUrlAdmin = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, args) => {
    requireAdminKey(args.adminKey)
    return await ctx.storage.generateUploadUrl()
  },
})

export const remove = mutation({
  args: { sceneId: v.id('scenes') },
  handler: async (ctx, args) => {
    const { user } = await requireSceneOwner(ctx, args.sceneId)

    const hotspots = await ctx.db
      .query('hotspots')
      .withIndex('by_sceneId', (q) => q.eq('sceneId', args.sceneId))
      .collect()

    for (const hotspot of hotspots) {
      await ctx.db.delete(hotspot._id)
    }

    const scene = await ctx.db.get(args.sceneId)
    let tourId: Id<'tours'> | null = null
    if (scene) {
      tourId = scene.tourId
      if (scene.imageStorageId !== undefined) {
        await deleteSceneFileIfUnused(ctx, scene.imageStorageId, scene._id)
      }
      if (scene.thumbnailStorageId !== undefined) {
        await deleteSceneFileIfUnused(ctx, scene.thumbnailStorageId, scene._id)
      }
      if (scene.stagedImageStorageId !== undefined) {
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

    if (tourId) {
      await refreshTourSceneCounts(ctx, tourId)
    }
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
