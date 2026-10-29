import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { internal as _internal } from './_generated/api'
import { requireAdminKey } from './authHelpers'
import type { QueryCtx, MutationCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any

/**
 * Deletes a scene image/thumbnail file unless another scene, or a scene in the
 * trash, still uses it (tours.duplicate copies storage ids instead of files).
 * `self` is the scene or trash row being removed.
 */
export async function deleteSceneFileIfUnused(
  ctx: MutationCtx,
  storageId: Id<'_storage'>,
  self: Id<'scenes'> | Id<'deletedScenes'>
) {
  const users = await Promise.all([
    ctx.db
      .query('scenes')
      .withIndex('by_imageStorageId', (q) => q.eq('imageStorageId', storageId))
      .take(2),
    ctx.db
      .query('scenes')
      .withIndex('by_thumbnailStorageId', (q) => q.eq('thumbnailStorageId', storageId))
      .take(2),
    ctx.db
      .query('deletedScenes')
      .withIndex('by_imageStorageId', (q) => q.eq('imageStorageId', storageId))
      .take(2),
    ctx.db
      .query('deletedScenes')
      .withIndex('by_thumbnailStorageId', (q) => q.eq('thumbnailStorageId', storageId))
      .take(2),
  ])
  if (users.flat().some((d) => d._id !== self)) return
  await ctx.storage.delete(storageId)
}

/** Permanently deletes a trashed scene and any files nothing else uses. */
export async function purgeDeletedScene(ctx: MutationCtx, trash: Doc<'deletedScenes'>) {
  await ctx.db.delete(trash._id)
  if (trash.imageStorageId) await deleteSceneFileIfUnused(ctx, trash.imageStorageId, trash._id)
  if (trash.thumbnailStorageId) {
    await deleteSceneFileIfUnused(ctx, trash.thumbnailStorageId, trash._id)
  }
  if (trash.stagedImageStorageId) await ctx.storage.delete(trash.stagedImageStorageId)
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

/**
 * Backfill for scenes uploaded before client-side optimization: swaps in the
 * optimized display image + preview thumbnail. The previous image file is left
 * in storage on purpose (it may be the only full-resolution copy).
 */
export const setOptimizedImage = mutation({
  args: {
    sceneId: v.id('scenes'),
    imageStorageId: v.id('_storage'),
    thumbnailStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const { scene } = await requireSceneOwner(ctx, args.sceneId)
    // Another tab already optimized this scene — drop the duplicate uploads
    if (scene.thumbnailStorageId) {
      if (args.imageStorageId !== scene.imageStorageId) await ctx.storage.delete(args.imageStorageId)
      await ctx.storage.delete(args.thumbnailStorageId)
      return
    }
    await ctx.db.patch(args.sceneId, {
      imageStorageId: args.imageStorageId,
      thumbnailStorageId: args.thumbnailStorageId,
    })
  },
})

const vec3 = v.object({ x: v.number(), y: v.number(), z: v.number() })

/**
 * Marks (or clears, with ref = null) the shared landmark in a scene. The first
 * scene marked defines the tour's target direction, so it stays unrotated.
 */
export const setAlignment = mutation({
  args: { sceneId: v.id('scenes'), ref: v.union(vec3, v.null()) },
  handler: async (ctx, { sceneId, ref }) => {
    const { tour } = await requireSceneOwner(ctx, sceneId)
    if (ref) {
      const len = Math.hypot(ref.x, ref.y, ref.z)
      if (!len) throw new Error('Invalid landmark direction')
      const unit = { x: ref.x / len, y: ref.y / len, z: ref.z / len }
      await ctx.db.patch(sceneId, { alignRef: unit })
      if (!tour.alignTarget) await ctx.db.patch(tour._id, { alignTarget: unit })
      return
    }
    await ctx.db.patch(sceneId, { alignRef: undefined })
    const stillAligned = (
      await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
    ).some((s) => s._id !== sceneId && s.alignRef)
    // Last aligned scene cleared — next mark starts a fresh reference
    if (!stillAligned) await ctx.db.patch(tour._id, { alignTarget: undefined })
  },
})

export const create = mutation({
  args: {
    tourId: v.id('tours'),
    title: v.string(),
    imageStorageId: v.id('_storage'),
    thumbnailStorageId: v.optional(v.id('_storage')),
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
      ...(args.thumbnailStorageId ? { thumbnailStorageId: args.thumbnailStorageId } : {}),
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
    const { scene, tour, user } = await requireSceneOwner(ctx, args.sceneId)

    const hotspots = await ctx.db
      .query('hotspots')
      .withIndex('by_sceneId', (q) => q.eq('sceneId', args.sceneId))
      .collect()

    // Move to trash instead of deleting; files stay in storage until purge.
    const { _id, _creationTime, ...sceneFields } = scene
    await ctx.db.insert('deletedScenes', {
      tourId: scene.tourId,
      title: scene.title,
      originalSceneId: _id,
      scene: sceneFields,
      hotspots: hotspots.map(({ _id, _creationTime, sceneId: _sceneId, ...rest }) => rest),
      wasCover: tour.coverSceneId === _id,
      imageStorageId: scene.imageStorageId,
      thumbnailStorageId: scene.thumbnailStorageId,
      stagedImageStorageId: scene.stagedImageStorageId,
      deletedAt: Date.now(),
    })

    for (const hotspot of hotspots) {
      await ctx.db.delete(hotspot._id)
    }
    if (tour.coverSceneId === _id) {
      await ctx.db.patch(scene.tourId, { coverSceneId: undefined })
    }

    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'scene_removed',
      tourId: scene.tourId,
      message: `Removed scene "${scene.title}" from tour`,
    })

    await ctx.db.delete(args.sceneId)
    await refreshTourSceneCounts(ctx, scene.tourId)
  },
})

export const listDeleted = query({
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

    const rows = await ctx.db
      .query('deletedScenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()
    return rows
      .sort((a, b) => b.deletedAt - a.deletedAt)
      .map((r) => ({ _id: r._id, title: r.title, deletedAt: r.deletedAt }))
  },
})

export const restore = mutation({
  args: { deletedSceneId: v.id('deletedScenes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) throw new Error('Not authenticated')
    const trash = await ctx.db.get(args.deletedSceneId)
    if (!trash) throw new Error('Deleted scene not found')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    const tour = await ctx.db.get(trash.tourId)
    if (!user || !tour || tour.userId !== user._id) throw new Error('Not authorized')
    if (tour.deletedAt) throw new Error('Restore the tour first')

    const existingScenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', trash.tourId))
      .collect()
    const sceneLimit = SCENE_LIMITS[user.plan] ?? 10
    const variantKey: string | undefined = trash.scene.variantKey
    const isNewKey = !variantKey || !existingScenes.some((s) => s.variantKey === variantKey)
    if (sceneLimit !== -1 && isNewKey && countDistinctVariantKeys(existingScenes) >= sceneLimit) {
      throw new Error(
        `Scene limit reached. Your ${user.plan} plan allows ${sceneLimit} scenes per tour.`
      )
    }

    // ponytail: restored scene gets a new id; analytics/aiJobs rows keep pointing at the old one.
    const sceneId = await ctx.db.insert('scenes', trash.scene)
    for (const hotspot of trash.hotspots) {
      await ctx.db.insert('hotspots', { ...hotspot, sceneId })
    }

    // Re-link navigation hotspots in other scenes that pointed at the old id.
    for (const other of existingScenes) {
      const links = await ctx.db
        .query('hotspots')
        .withIndex('by_sceneId', (q) => q.eq('sceneId', other._id))
        .collect()
      for (const link of links) {
        if (link.targetSceneId === trash.originalSceneId) {
          await ctx.db.patch(link._id, { targetSceneId: sceneId })
        }
      }
    }

    if (trash.wasCover && !tour.coverSceneId) {
      await ctx.db.patch(trash.tourId, { coverSceneId: sceneId })
    }

    await ctx.db.delete(trash._id)
    await refreshTourSceneCounts(ctx, trash.tourId)
    return sceneId
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
