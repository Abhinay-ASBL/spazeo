import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const track = mutation({
  args: {
    buildingId: v.id('buildings'),
    event: v.string(),
    sessionId: v.string(),
    floor: v.optional(v.number()),
    unitNumber: v.optional(v.string()),
    viewPositionId: v.optional(v.id('viewPositions')),
    device: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('buildingAnalytics', {
      ...args,
      timestamp: Date.now(),
    })

    if (args.event === 'model_view') {
      const building = await ctx.db.get(args.buildingId)
      if (building) {
        await ctx.db.patch(args.buildingId, {
          viewCount: building.viewCount + 1,
        })
      }
    }
  },
})

export const getByBuilding = query({
  args: {
    buildingId: v.id('buildings'),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return []

    let events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .order('desc')
      .collect()

    if (args.startDate) {
      events = events.filter((e) => e.timestamp >= args.startDate!)
    }
    if (args.endDate) {
      events = events.filter((e) => e.timestamp <= args.endDate!)
    }

    return events
  },
})

export const getOverview = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return null

    const events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()

    const totalViews = events.filter((e) => e.event === 'model_view').length
    const uniqueSessions = new Set(events.map((e) => e.sessionId)).size

    // Most clicked floor
    const floorClicks: Record<number, number> = {}
    for (const e of events) {
      if (e.event === 'floor_select' && e.floor !== undefined) {
        floorClicks[e.floor] = (floorClicks[e.floor] ?? 0) + 1
      }
    }
    let mostClickedFloor: number | null = null
    let maxFloorClicks = 0
    for (const [floor, count] of Object.entries(floorClicks)) {
      if (count > maxFloorClicks) {
        maxFloorClicks = count
        mostClickedFloor = Number(floor)
      }
    }

    // Most viewed unit
    const unitViews: Record<string, number> = {}
    for (const e of events) {
      if (e.event === 'unit_click' && e.unitNumber) {
        unitViews[e.unitNumber] = (unitViews[e.unitNumber] ?? 0) + 1
      }
    }
    let mostViewedUnit: string | null = null
    let maxUnitViews = 0
    for (const [unit, count] of Object.entries(unitViews)) {
      if (count > maxUnitViews) {
        maxUnitViews = count
        mostViewedUnit = unit
      }
    }

    // Average duration
    const durations = events.filter((e) => e.duration).map((e) => e.duration!)
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0

    return {
      totalViews,
      uniqueSessions,
      mostClickedFloor,
      mostViewedUnit,
      avgDuration,
    }
  },
})

export const getFloorHeatmap = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return []

    const events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()

    const floorViews: Record<number, number> = {}
    for (const e of events) {
      if (e.floor !== undefined) {
        floorViews[e.floor] = (floorViews[e.floor] ?? 0) + 1
      }
    }

    return Object.entries(floorViews)
      .map(([floor, views]) => ({ floor: Number(floor), views }))
      .sort((a, b) => a.floor - b.floor)
  },
})

export const getUnitInteractions = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return []

    const events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()

    const unitClicks: Record<string, number> = {}
    for (const e of events) {
      if (e.event === 'unit_click' && e.unitNumber) {
        unitClicks[e.unitNumber] = (unitClicks[e.unitNumber] ?? 0) + 1
      }
    }

    return Object.entries(unitClicks)
      .map(([unitNumber, clicks]) => ({ unitNumber, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
  },
})

export const getViewComparisons = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return []

    const events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()

    const comparisonEvents = events.filter((e) => e.event === 'comparison_view')

    const pairCounts: Record<string, number> = {}
    for (const e of comparisonEvents) {
      if (e.floor !== undefined && e.viewPositionId) {
        const key = `floor_${e.floor}_pos_${e.viewPositionId}`
        pairCounts[key] = (pairCounts[key] ?? 0) + 1
      }
    }

    return Object.entries(pairCounts)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
  },
})
