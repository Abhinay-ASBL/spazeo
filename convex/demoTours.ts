import { v } from 'convex/values'
import { query } from './_generated/server'

export const list = query({
  args: {
    propertyType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let demos
    if (args.propertyType) {
      demos = await ctx.db
        .query('demoTours')
        .withIndex('by_propertyType', (q) => q.eq('propertyType', args.propertyType as any))
        .collect()
    } else {
      demos = await ctx.db.query('demoTours').collect()
    }

    // Get thumbnail URLs
    const results = await Promise.all(
      demos.map(async (demo) => {
        const thumbnailUrl = demo.thumbnailStorageId
          ? await ctx.storage.getUrl(demo.thumbnailStorageId)
          : null
        return { ...demo, thumbnailUrl }
      })
    )

    return results.sort((a, b) => a.order - b.order)
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const demo = await ctx.db
      .query('demoTours')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()

    if (!demo) return null

    const thumbnailUrl = demo.thumbnailStorageId
      ? await ctx.storage.getUrl(demo.thumbnailStorageId)
      : null

    // If linked to an actual tour, get scenes
    let scenes: any[] = []
    if (demo.tourId) {
      const tourScenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', demo.tourId!))
        .collect()

      scenes = await Promise.all(
        tourScenes.map(async (scene) => ({
          ...scene,
          imageUrl: scene.imageStorageId !== undefined ? await ctx.storage.getUrl(scene.imageStorageId) : null,
          thumbnailUrl: scene.thumbnailStorageId !== undefined
            ? await ctx.storage.getUrl(scene.thumbnailStorageId)
            : null,
        }))
      )
    }

    return { ...demo, thumbnailUrl, scenes }
  },
})
