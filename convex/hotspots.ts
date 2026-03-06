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
