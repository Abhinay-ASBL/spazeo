import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

const unitTypeValidator = v.union(
  v.literal('1BHK'),
  v.literal('2BHK'),
  v.literal('3BHK'),
  v.literal('4BHK'),
  v.literal('penthouse')
)

const statusValidator = v.union(
  v.literal('available'),
  v.literal('sold'),
  v.literal('reserved')
)

// --- Queries ---

/** Published buildings are publicly viewable; drafts only by their owner. */
async function isBuildingViewable(ctx: any, buildingId: any) {
  const building = await ctx.db.get(buildingId)
  if (!building) return false
  if (building.status === 'published') return true

  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) return false
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .unique()
  return !!user && building.userId === user._id
}

export const listByBuilding = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    if (!(await isBuildingViewable(ctx, args.buildingId))) return []

    const units = await ctx.db
      .query('buildingUnits')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()

    return units.sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor
      return a.unitNumber.localeCompare(b.unitNumber)
    })
  },
})

export const listByFloor = query({
  args: {
    buildingId: v.id('buildings'),
    floor: v.number(),
  },
  handler: async (ctx, args) => {
    if (!(await isBuildingViewable(ctx, args.buildingId))) return []

    const units = await ctx.db
      .query('buildingUnits')
      .withIndex('by_buildingId_floor', (q) =>
        q.eq('buildingId', args.buildingId).eq('floor', args.floor)
      )
      .collect()

    return units.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber))
  },
})

export const getById = query({
  args: { unitId: v.id('buildingUnits') },
  handler: async (ctx, args) => {
    const unit = await ctx.db.get(args.unitId)
    if (!unit || !(await isBuildingViewable(ctx, unit.buildingId))) return null

    let tourTitle: string | undefined
    let tourSlug: string | undefined

    if (unit.tourId) {
      const tour = await ctx.db.get(unit.tourId)
      if (tour) {
        tourTitle = tour.title
        tourSlug = tour.slug
      }
    }

    return { ...unit, tourTitle, tourSlug }
  },
})

export const getStats = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    if (!(await isBuildingViewable(ctx, args.buildingId))) {
      return { total: 0, available: 0, sold: 0, reserved: 0 }
    }

    const units = await ctx.db
      .query('buildingUnits')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()

    return {
      total: units.length,
      available: units.filter((u) => u.status === 'available').length,
      sold: units.filter((u) => u.status === 'sold').length,
      reserved: units.filter((u) => u.status === 'reserved').length,
    }
  },
})

// --- Mutations ---

export const create = mutation({
  args: {
    buildingId: v.id('buildings'),
    blockId: v.id('buildingBlocks'),
    floor: v.number(),
    unitNumber: v.string(),
    type: unitTypeValidator,
    area: v.optional(v.number()),
    facing: v.optional(v.string()),
    tourId: v.optional(v.id('tours')),
    balconyViewPositionIds: v.optional(v.array(v.id('viewPositions'))),
    status: statusValidator,
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    const building = await ctx.db.get(args.buildingId)
    if (!user || !building || building.userId !== user._id) throw new Error('Forbidden')

    return await ctx.db.insert('buildingUnits', {
      buildingId: args.buildingId,
      blockId: args.blockId,
      floor: args.floor,
      unitNumber: args.unitNumber,
      type: args.type,
      area: args.area,
      facing: args.facing,
      tourId: args.tourId,
      balconyViewPositionIds: args.balconyViewPositionIds,
      status: args.status,
      price: args.price,
    })
  },
})

export const update = mutation({
  args: {
    unitId: v.id('buildingUnits'),
    type: v.optional(unitTypeValidator),
    area: v.optional(v.number()),
    facing: v.optional(v.string()),
    status: v.optional(statusValidator),
    price: v.optional(v.number()),
    balconyViewPositionIds: v.optional(v.array(v.id('viewPositions'))),
  },
  handler: async (ctx, args) => {
    await requireUnitOwner(ctx, args.unitId)

    const { unitId, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )

    await ctx.db.patch(unitId, cleanUpdates)
  },
})

async function requireUnitOwner(ctx: any, unitId: any) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) throw new Error('Not authenticated')

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .unique()
  const unit = await ctx.db.get(unitId)
  const building = unit ? await ctx.db.get(unit.buildingId) : null
  if (!user || !building || building.userId !== user._id) throw new Error('Forbidden')
}

export const remove = mutation({
  args: { unitId: v.id('buildingUnits') },
  handler: async (ctx, args) => {
    await requireUnitOwner(ctx, args.unitId)

    await ctx.db.delete(args.unitId)
  },
})

export const linkTour = mutation({
  args: {
    unitId: v.id('buildingUnits'),
    tourId: v.id('tours'),
  },
  handler: async (ctx, args) => {
    await requireUnitOwner(ctx, args.unitId)

    await ctx.db.patch(args.unitId, { tourId: args.tourId })
  },
})

export const unlinkTour = mutation({
  args: { unitId: v.id('buildingUnits') },
  handler: async (ctx, args) => {
    await requireUnitOwner(ctx, args.unitId)

    await ctx.db.patch(args.unitId, { tourId: undefined })
  },
})

export const updateStatus = mutation({
  args: {
    unitId: v.id('buildingUnits'),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    await requireUnitOwner(ctx, args.unitId)

    await ctx.db.patch(args.unitId, { status: args.status })
  },
})

export const bulkCreate = mutation({
  args: {
    units: v.array(
      v.object({
        buildingId: v.id('buildings'),
        blockId: v.id('buildingBlocks'),
        floor: v.number(),
        unitNumber: v.string(),
        type: unitTypeValidator,
        area: v.optional(v.number()),
        facing: v.optional(v.string()),
        status: statusValidator,
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('Forbidden')

    const buildingIds = [...new Set(args.units.map((u) => u.buildingId))]
    for (const id of buildingIds) {
      const building = await ctx.db.get(id)
      if (!building || building.userId !== user._id) throw new Error('Forbidden')
    }

    const ids = []
    for (const unit of args.units) {
      const id = await ctx.db.insert('buildingUnits', {
        buildingId: unit.buildingId,
        blockId: unit.blockId,
        floor: unit.floor,
        unitNumber: unit.unitNumber,
        type: unit.type,
        area: unit.area,
        facing: unit.facing,
        status: unit.status,
      })
      ids.push(id)
    }

    return ids
  },
})
