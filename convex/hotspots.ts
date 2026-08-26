import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import type { QueryCtx, MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { requireAdmin } from './authHelpers'

/** Throws unless the caller owns the tour that this scene belongs to. */
async function requireSceneOwner(ctx: QueryCtx | MutationCtx, sceneId: Id<'scenes'>) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) throw new Error('Not authenticated')

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user) throw new Error('Not authenticated')

  const scene = await ctx.db.get(sceneId)
  if (!scene) throw new Error('Scene not found')

  const tour = await ctx.db.get(scene.tourId)
  if (!tour || tour.userId !== user._id) throw new Error('Not authorized')

  return { user, scene, tour }
}

/** Throws unless the caller owns this tour. */
async function requireTourOwner(ctx: QueryCtx | MutationCtx, tourId: Id<'tours'>) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) throw new Error('Not authenticated')

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user) throw new Error('Not authenticated')

  const tour = await ctx.db.get(tourId)
  if (!tour || tour.userId !== user._id) throw new Error('Not authorized')

  return { user, tour }
}

export const listByScene = query({
  args: { sceneId: v.id('scenes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    const scene = await ctx.db.get(args.sceneId)
    const tour = scene ? await ctx.db.get(scene.tourId) : null
    if (!user || !tour || tour.userId !== user._id) return []

    const hotspots = await ctx.db
      .query('hotspots')
      .withIndex('by_sceneId', (q) => q.eq('sceneId', args.sceneId))
      .collect()
    return await Promise.all(hotspots.map(async (h) => ({
      ...h,
      imageUrl: h.imageStorageId ? await ctx.storage.getUrl(h.imageStorageId) : undefined,
    })))
  },
})

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

    const allHotspots = await Promise.all(
      scenes.map(async (scene) => {
        const hotspots = await ctx.db
          .query('hotspots')
          .withIndex('by_sceneId', (q) => q.eq('sceneId', scene._id))
          .collect()
        return await Promise.all(hotspots.map(async (h) => ({
          ...h,
          sceneTitle: scene.title,
          sceneOrder: scene.order,
          imageUrl: h.imageStorageId ? await ctx.storage.getUrl(h.imageStorageId) : undefined,
        })))
      })
    )

    return allHotspots.flat()
  },
})

export const create = mutation({
  args: {
    sceneId: v.id('scenes'),
    targetSceneId: v.optional(v.id('scenes')),
    type: v.union(v.literal('navigation'), v.literal('info'), v.literal('media'), v.literal('link')),
    position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
    tooltip: v.optional(v.string()),
    icon: v.optional(v.string()),
    content: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    visible: v.optional(v.boolean()),
    iconName: v.optional(v.string()),
    panelLayout: v.optional(v.union(v.literal('compact'), v.literal('rich'), v.literal('video'))),
    videoUrl: v.optional(v.string()),
    ctaLabel: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    markerStyle: v.optional(v.union(v.literal('ring'), v.literal('arrow'), v.literal('dot'), v.literal('label'))),
    lineHeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSceneOwner(ctx, args.sceneId)
    return await ctx.db.insert('hotspots', args)
  },
})

export const update = mutation({
  args: {
    hotspotId: v.id('hotspots'),
    targetSceneId: v.optional(v.id('scenes')),
    type: v.optional(v.union(v.literal('navigation'), v.literal('info'), v.literal('media'), v.literal('link'))),
    position: v.optional(v.object({ x: v.number(), y: v.number(), z: v.number() })),
    tooltip: v.optional(v.string()),
    icon: v.optional(v.string()),
    content: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    visible: v.optional(v.boolean()),
    iconName: v.optional(v.string()),
    panelLayout: v.optional(v.union(v.literal('compact'), v.literal('rich'), v.literal('video'))),
    videoUrl: v.optional(v.string()),
    ctaLabel: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    markerStyle: v.optional(v.union(v.literal('ring'), v.literal('arrow'), v.literal('dot'), v.literal('label'))),
    lineHeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.hotspotId)
    if (!doc) throw new Error('Hotspot not found')
    await requireSceneOwner(ctx, doc.sceneId)

    const { hotspotId, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )
    await ctx.db.patch(hotspotId, cleanUpdates)
  },
})

export const remove = mutation({
  args: { hotspotId: v.id('hotspots') },
  handler: async (ctx, args) => {
    // Idempotent: bulk clear / double-click can race past a gone id
    const doc = await ctx.db.get(args.hotspotId)
    if (!doc) return
    await requireSceneOwner(ctx, doc.sceneId)
    await ctx.db.delete(args.hotspotId)
  },
})

/** CLI bulk insert — no Clerk JWT (deploy admin only). */
export const bulkCreateAdmin = mutation({
  args: {
    sceneId: v.id('scenes'),
    clearExisting: v.optional(v.boolean()),
    hotspots: v.array(
      v.object({
        type: v.union(
          v.literal('navigation'),
          v.literal('info'),
          v.literal('media'),
          v.literal('link'),
        ),
        position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
        title: v.optional(v.string()),
        tooltip: v.optional(v.string()),
        description: v.optional(v.string()),
        content: v.optional(v.string()),
        markerStyle: v.optional(
          v.union(
            v.literal('ring'),
            v.literal('arrow'),
            v.literal('dot'),
            v.literal('label'),
          ),
        ),
        iconName: v.optional(v.string()),
        accentColor: v.optional(v.string()),
        visible: v.optional(v.boolean()),
        lineHeight: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    if (args.clearExisting) {
      const existing = await ctx.db
        .query('hotspots')
        .withIndex('by_sceneId', (q) => q.eq('sceneId', args.sceneId))
        .collect()
      for (const h of existing) {
        await ctx.db.delete(h._id)
      }
    }

    const ids = []
    for (const h of args.hotspots) {
      const id = await ctx.db.insert('hotspots', {
        sceneId: args.sceneId,
        type: h.type,
        position: h.position,
        title: h.title,
        tooltip: h.tooltip,
        description: h.description,
        content: h.content,
        markerStyle: h.markerStyle,
        iconName: h.iconName,
        accentColor: h.accentColor,
        visible: h.visible ?? true,
        lineHeight: h.lineHeight,
      })
      ids.push(id)
    }
    return { count: ids.length, ids }
  },
})

export const copyToAllScenes = mutation({
  args: {
    sourceSceneId: v.id('scenes'),
    tourId: v.id('tours'),
  },
  handler: async (ctx, { sourceSceneId, tourId }) => {
    await requireTourOwner(ctx, tourId)

    const sourceScene = await ctx.db.get(sourceSceneId)
    if (!sourceScene || sourceScene.tourId !== tourId) {
      throw new Error('Source scene does not belong to this tour')
    }

    const sourceHotspots = await ctx.db
      .query('hotspots')
      .withIndex('by_sceneId', (q) => q.eq('sceneId', sourceSceneId))
      .collect()

    if (sourceHotspots.length === 0) return { copied: 0 }

    const allScenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
      .collect()

    const targetScenes = allScenes.filter((s) => s._id !== sourceSceneId)

    let copied = 0
    for (const scene of targetScenes) {
      for (const h of sourceHotspots) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, _creationTime, sceneId, ...rest } = h
        await ctx.db.insert('hotspots', { ...rest, sceneId: scene._id })
        copied++
      }
    }
    return { copied }
  },
})

// Phase 5: Bulk-insert doorway hotspots for a floor-plan-derived scene.
// Used standalone from public pages after a tour has already been created.
export const insertDoorwayHotspots = mutation({
  args: {
    sceneId: v.id('scenes'),
    doors: v.array(
      v.object({
        position: v.object({ x: v.number(), y: v.number() }),
        width: v.number(),
      })
    ),
  },
  handler: async (ctx, { sceneId, doors }) => {
    await requireSceneOwner(ctx, sceneId)

    for (const door of doors) {
      await ctx.db.insert('hotspots', {
        sceneId,
        type: 'navigation',
        position: { x: door.position.x, y: 0, z: door.position.y },
        tooltip: 'Room entrance',
        visible: true,
      })
    }
  },
})
