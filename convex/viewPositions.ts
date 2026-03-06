import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const listByBuilding = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('viewPositions')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()
  },
})

export const listByBlockAndFloor = query({
  args: {
    blockId: v.id('buildingBlocks'),
    floor: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('viewPositions')
      .withIndex('by_blockId_floor', (q) =>
        q.eq('blockId', args.blockId).eq('floor', args.floor)
      )
      .collect()
  },
})

export const getById = query({
  args: { positionId: v.id('viewPositions') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.positionId)
  },
})

export const create = mutation({
  args: {
    buildingId: v.id('buildings'),
    blockId: v.id('buildingBlocks'),
    floor: v.number(),
    positionIndex: v.number(),
    direction: v.union(
      v.literal('N'),
      v.literal('NE'),
      v.literal('E'),
      v.literal('SE'),
      v.literal('S'),
      v.literal('SW')
    ),
    cornerType: v.union(v.literal('corner'), v.literal('middle')),
    coordinates: v.object({
      x: v.number(),
      y: v.number(),
      z: v.number(),
    }),
    cameraDirection: v.object({
      heading: v.number(),
      pitch: v.number(),
      roll: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    return await ctx.db.insert('viewPositions', {
      buildingId: args.buildingId,
      blockId: args.blockId,
      floor: args.floor,
      positionIndex: args.positionIndex,
      direction: args.direction,
      cornerType: args.cornerType,
      coordinates: args.coordinates,
      cameraDirection: args.cameraDirection,
    })
  },
})

export const update = mutation({
  args: {
    positionId: v.id('viewPositions'),
    coordinates: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        z: v.number(),
      })
    ),
    cameraDirection: v.optional(
      v.object({
        heading: v.number(),
        pitch: v.number(),
        roll: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const existing = await ctx.db.get(args.positionId)
    if (!existing) throw new Error('View position not found')

    const updates: Record<string, unknown> = {}
    if (args.coordinates) updates.coordinates = args.coordinates
    if (args.cameraDirection) updates.cameraDirection = args.cameraDirection

    await ctx.db.patch(args.positionId, updates)
  },
})

export const remove = mutation({
  args: { positionId: v.id('viewPositions') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const existing = await ctx.db.get(args.positionId)
    if (!existing) throw new Error('View position not found')

    // Delete all exterior panoramas linked to this position
    const panoramas = await ctx.db
      .query('exteriorPanoramas')
      .withIndex('by_viewPositionId', (q) =>
        q.eq('viewPositionId', args.positionId)
      )
      .collect()

    for (const panorama of panoramas) {
      await ctx.storage.delete(panorama.imageStorageId)
      if (panorama.thumbnailStorageId) {
        await ctx.storage.delete(panorama.thumbnailStorageId)
      }
      await ctx.db.delete(panorama._id)
    }

    await ctx.db.delete(args.positionId)
  },
})

export const cloneToFloors = mutation({
  args: {
    sourceFloor: v.number(),
    targetFloors: v.array(v.number()),
    blockId: v.id('buildingBlocks'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const sourcePositions = await ctx.db
      .query('viewPositions')
      .withIndex('by_blockId_floor', (q) =>
        q.eq('blockId', args.blockId).eq('floor', args.sourceFloor)
      )
      .collect()

    let count = 0
    for (const position of sourcePositions) {
      for (const targetFloor of args.targetFloors) {
        const floorDifference = targetFloor - args.sourceFloor
        const yOffset = floorDifference * 3.0

        await ctx.db.insert('viewPositions', {
          buildingId: position.buildingId,
          blockId: position.blockId,
          floor: targetFloor,
          positionIndex: position.positionIndex,
          direction: position.direction,
          cornerType: position.cornerType,
          coordinates: {
            x: position.coordinates.x,
            y: position.coordinates.y + yOffset,
            z: position.coordinates.z,
          },
          cameraDirection: position.cameraDirection,
        })
        count++
      }
    }

    return count
  },
})

export const bulkCreate = mutation({
  args: {
    positions: v.array(
      v.object({
        buildingId: v.id('buildings'),
        blockId: v.id('buildingBlocks'),
        floor: v.number(),
        positionIndex: v.number(),
        direction: v.union(
          v.literal('N'),
          v.literal('NE'),
          v.literal('E'),
          v.literal('SE'),
          v.literal('S'),
          v.literal('SW')
        ),
        cornerType: v.union(v.literal('corner'), v.literal('middle')),
        coordinates: v.object({
          x: v.number(),
          y: v.number(),
          z: v.number(),
        }),
        cameraDirection: v.object({
          heading: v.number(),
          pitch: v.number(),
          roll: v.number(),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const ids = []
    for (const position of args.positions) {
      const id = await ctx.db.insert('viewPositions', position)
      ids.push(id)
    }
    return ids
  },
})
