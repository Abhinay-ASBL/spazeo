import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import type { QueryCtx, MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

async function requireBuildingOwner(ctx: QueryCtx | MutationCtx, buildingId: Id<'buildings'>) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) throw new Error('Not authenticated')

  const building = await ctx.db.get(buildingId)
  if (!building) throw new Error('Building not found')

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user || building.userId !== user._id) throw new Error('Not authorized')

  return user
}

/** Published buildings are publicly viewable; drafts only by their owner. */
async function isBuildingViewable(ctx: QueryCtx, buildingId: Id<'buildings'>) {
  const building = await ctx.db.get(buildingId)
  if (!building) return false
  if (building.status === 'published') return true

  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) return false
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
  return !!user && building.userId === user._id
}

export const listByBuilding = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    if (!(await isBuildingViewable(ctx, args.buildingId))) return []

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
    const block = await ctx.db.get(args.blockId)
    if (!block || !(await isBuildingViewable(ctx, block.buildingId))) return []

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
    const position = await ctx.db.get(args.positionId)
    if (!position || !(await isBuildingViewable(ctx, position.buildingId))) return null
    return position
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
    await requireBuildingOwner(ctx, args.buildingId)

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
    const existing = await ctx.db.get(args.positionId)
    if (!existing) throw new Error('View position not found')
    await requireBuildingOwner(ctx, existing.buildingId)

    const updates: Record<string, unknown> = {}
    if (args.coordinates) updates.coordinates = args.coordinates
    if (args.cameraDirection) updates.cameraDirection = args.cameraDirection

    await ctx.db.patch(args.positionId, updates)
  },
})

export const remove = mutation({
  args: { positionId: v.id('viewPositions') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.positionId)
    if (!existing) throw new Error('View position not found')
    await requireBuildingOwner(ctx, existing.buildingId)

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
    const block = await ctx.db.get(args.blockId)
    if (!block) throw new Error('Block not found')
    await requireBuildingOwner(ctx, block.buildingId)

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
    const buildingIds = new Set(args.positions.map((p) => p.buildingId))
    for (const buildingId of buildingIds) {
      await requireBuildingOwner(ctx, buildingId)
    }

    const ids = []
    for (const position of args.positions) {
      const id = await ctx.db.insert('viewPositions', position)
      ids.push(id)
    }
    return ids
  },
})
