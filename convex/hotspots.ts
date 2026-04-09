import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const listByScene = query({
  args: { sceneId: v.id('scenes') },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await ctx.db.delete(args.hotspotId)
  },
})

export const copyToAllScenes = mutation({
  args: {
    sourceSceneId: v.id('scenes'),
    tourId: v.id('tours'),
  },
  handler: async (ctx, { sourceSceneId, tourId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

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
