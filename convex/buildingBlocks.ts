import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// === Queries ===

export const listByBuilding = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const blocks = await ctx.db
      .query('buildingBlocks')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()

    return blocks.sort((a, b) => a.blockNumber - b.blockNumber)
  },
})

// === Mutations ===

export const create = mutation({
  args: {
    buildingId: v.id('buildings'),
    blockNumber: v.number(),
    name: v.string(),
    position: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        z: v.number(),
      })
    ),
    apartmentsPerFloor: v.number(),
    modelPartId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    return await ctx.db.insert('buildingBlocks', {
      buildingId: args.buildingId,
      blockNumber: args.blockNumber,
      name: args.name,
      position: args.position,
      apartmentsPerFloor: args.apartmentsPerFloor,
      modelPartId: args.modelPartId,
    })
  },
})

export const update = mutation({
  args: {
    blockId: v.id('buildingBlocks'),
    name: v.optional(v.string()),
    position: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        z: v.number(),
      })
    ),
    apartmentsPerFloor: v.optional(v.number()),
    modelPartId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const { blockId, ...fields } = args
    const patch: Record<string, unknown> = {}

    if (fields.name !== undefined) patch.name = fields.name
    if (fields.position !== undefined) patch.position = fields.position
    if (fields.apartmentsPerFloor !== undefined) patch.apartmentsPerFloor = fields.apartmentsPerFloor
    if (fields.modelPartId !== undefined) patch.modelPartId = fields.modelPartId

    await ctx.db.patch(blockId, patch)
  },
})

export const remove = mutation({
  args: { blockId: v.id('buildingBlocks') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const block = await ctx.db.get(args.blockId)
    if (!block) throw new Error('Block not found')

    // 1. Collect all viewPositions for this block (across all floors)
    const viewPositions = await ctx.db
      .query('viewPositions')
      .withIndex('by_blockId_floor', (q) => q.eq('blockId', args.blockId))
      .collect()

    // 2. Delete all exteriorPanoramas linked to those viewPositions + their storage files
    for (const vp of viewPositions) {
      const panoramas = await ctx.db
        .query('exteriorPanoramas')
        .withIndex('by_viewPositionId', (q) => q.eq('viewPositionId', vp._id))
        .collect()

      for (const pano of panoramas) {
        await ctx.storage.delete(pano.imageStorageId)
        if (pano.thumbnailStorageId) {
          await ctx.storage.delete(pano.thumbnailStorageId)
        }
        await ctx.db.delete(pano._id)
      }
    }

    // 3. Delete all viewPositions
    for (const vp of viewPositions) {
      await ctx.db.delete(vp._id)
    }

    // 4. Delete all buildingUnits with this blockId
    const units = await ctx.db
      .query('buildingUnits')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', block.buildingId))
      .collect()

    for (const unit of units) {
      if (unit.blockId === args.blockId) {
        await ctx.db.delete(unit._id)
      }
    }

    // 5. Delete the block itself
    await ctx.db.delete(args.blockId)
  },
})

export const bulkCreate = mutation({
  args: {
    buildingId: v.id('buildings'),
    blocks: v.array(
      v.object({
        blockNumber: v.number(),
        name: v.string(),
        apartmentsPerFloor: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const ids = []
    for (const block of args.blocks) {
      const id = await ctx.db.insert('buildingBlocks', {
        buildingId: args.buildingId,
        blockNumber: block.blockNumber,
        name: block.name,
        apartmentsPerFloor: block.apartmentsPerFloor,
      })
      ids.push(id)
    }

    return ids
  },
})
