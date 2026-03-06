import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'

export const listByBuilding = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const panoramas = await ctx.db
      .query('exteriorPanoramas')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()

    return await Promise.all(
      panoramas.map(async (panorama) => ({
        ...panorama,
        imageUrl: await ctx.storage.getUrl(panorama.imageStorageId),
        thumbnailUrl: panorama.thumbnailStorageId
          ? await ctx.storage.getUrl(panorama.thumbnailStorageId)
          : null,
      }))
    )
  },
})

export const getByViewPosition = query({
  args: { viewPositionId: v.id('viewPositions') },
  handler: async (ctx, args) => {
    const panoramas = await ctx.db
      .query('exteriorPanoramas')
      .withIndex('by_viewPositionId', (q) =>
        q.eq('viewPositionId', args.viewPositionId)
      )
      .collect()

    return await Promise.all(
      panoramas.map(async (panorama) => ({
        ...panorama,
        imageUrl: await ctx.storage.getUrl(panorama.imageStorageId),
        thumbnailUrl: panorama.thumbnailStorageId
          ? await ctx.storage.getUrl(panorama.thumbnailStorageId)
          : null,
      }))
    )
  },
})

export const getById = query({
  args: { panoramaId: v.id('exteriorPanoramas') },
  handler: async (ctx, args) => {
    const panorama = await ctx.db.get(args.panoramaId)
    if (!panorama) return null

    return {
      ...panorama,
      imageUrl: await ctx.storage.getUrl(panorama.imageStorageId),
      thumbnailUrl: panorama.thumbnailStorageId
        ? await ctx.storage.getUrl(panorama.thumbnailStorageId)
        : null,
    }
  },
})

export const create = internalMutation({
  args: {
    viewPositionId: v.id('viewPositions'),
    buildingId: v.id('buildings'),
    imageStorageId: v.id('_storage'),
    thumbnailStorageId: v.optional(v.id('_storage')),
    format: v.literal('equirectangular'),
    resolution: v.object({
      w: v.number(),
      h: v.number(),
    }),
    timeOfDay: v.union(
      v.literal('morning'),
      v.literal('afternoon'),
      v.literal('sunset'),
      v.literal('night')
    ),
    environmentUsed: v.optional(v.string()),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('exteriorPanoramas', {
      viewPositionId: args.viewPositionId,
      buildingId: args.buildingId,
      imageStorageId: args.imageStorageId,
      thumbnailStorageId: args.thumbnailStorageId,
      format: args.format,
      resolution: args.resolution,
      timeOfDay: args.timeOfDay,
      environmentUsed: args.environmentUsed,
      generatedAt: args.generatedAt,
    })
  },
})

export const remove = mutation({
  args: { panoramaId: v.id('exteriorPanoramas') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const panorama = await ctx.db.get(args.panoramaId)
    if (!panorama) throw new Error('Panorama not found')

    await ctx.storage.delete(panorama.imageStorageId)
    if (panorama.thumbnailStorageId) {
      await ctx.storage.delete(panorama.thumbnailStorageId)
    }

    await ctx.db.delete(args.panoramaId)
  },
})

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    return await ctx.storage.generateUploadUrl()
  },
})

export const savePanorama = mutation({
  args: {
    viewPositionId: v.id('viewPositions'),
    buildingId: v.id('buildings'),
    imageStorageId: v.id('_storage'),
    resolution: v.object({
      w: v.number(),
      h: v.number(),
    }),
    timeOfDay: v.union(
      v.literal('morning'),
      v.literal('afternoon'),
      v.literal('sunset'),
      v.literal('night')
    ),
    environmentUsed: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    return await ctx.db.insert('exteriorPanoramas', {
      viewPositionId: args.viewPositionId,
      buildingId: args.buildingId,
      imageStorageId: args.imageStorageId,
      format: 'equirectangular',
      resolution: args.resolution,
      timeOfDay: args.timeOfDay,
      environmentUsed: args.environmentUsed,
      generatedAt: Date.now(),
    })
  },
})
