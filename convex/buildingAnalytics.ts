import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { consumeRateLimit } from './rateLimit'

/**
 * A view that bumps buildings.viewCount and getOverview.totalViews alike.
 * The viewer emits `building_view` (plus a `linked: true` re-send once the
 * visitor is identified, which must not double count); `model_view` is legacy.
 */
function isCountedView(
  event: string,
  metadata: Record<string, string | number | boolean | null> | undefined
): boolean {
  if (event !== 'model_view' && event !== 'building_view') return false
  return metadata?.linked !== true
}

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
    visitorId: v.optional(v.id('visitors')),
    timeOfDay: v.optional(
      v.union(
        v.literal('morning'),
        v.literal('afternoon'),
        v.literal('evening'),
        v.literal('sunset'),
        v.literal('night')
      )
    ),
    metadata: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null())
      )
    ),
  },
  handler: async (ctx, args) => {
    const building = await ctx.db.get(args.buildingId)
    if (!building) return

    await consumeRateLimit(ctx, `buildingAnalytics:session:${args.sessionId}`, {
      windowMs: 60_000,
      max: 120,
    })
    await consumeRateLimit(ctx, `buildingAnalytics:building:${args.buildingId}`, {
      windowMs: 60_000,
      max: 2000,
    })

    const visitorId = args.visitorId
      ? ctx.db.normalizeId('visitors', args.visitorId) ?? undefined
      : undefined

    await ctx.db.insert('buildingAnalytics', {
      ...args,
      visitorId,
      timestamp: Date.now(),
    })

    if (isCountedView(args.event, args.metadata)) {
      await ctx.db.patch(args.buildingId, {
        viewCount: building.viewCount + 1,
      })
    }

    if (visitorId) {
      const visitor = await ctx.db.get(visitorId)
      if (visitor && visitor.mergedInto === undefined) {
        const added =
          args.event === 'section_dwell' &&
          typeof args.duration === 'number' &&
          args.duration > 0
            ? args.duration
            : 0
        const mm =
          args.metadata && typeof args.metadata.mm === 'string'
            ? args.metadata.mm
            : undefined
        const city =
          args.metadata && typeof args.metadata.city === 'string'
            ? args.metadata.city
            : undefined
        const country =
          args.metadata && typeof args.metadata.country === 'string'
            ? args.metadata.country
            : undefined
        await ctx.db.patch(visitorId, {
          lastSeenAt: Date.now(),
          totalSecondsViewed: visitor.totalSecondsViewed + added,
          ...(city && !visitor.city ? { city } : {}),
          ...(country && !visitor.countryCode ? { countryCode: country } : {}),
          ...(mm
            ? { micromarket: mm, micromarketSource: 'qr_campaign' as const }
            : {}),
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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return []

    // Capped: unbounded .collect() over buildingAnalytics caused the OOM
    // crash-loop incident (2026-08-26) when a building's event history grew
    // large. Most recent 10k events is plenty for this dashboard view.
    const events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId_timestamp', (q) =>
        q
          .eq('buildingId', args.buildingId)
          .gte('timestamp', args.startDate ?? -Infinity)
          .lte('timestamp', args.endDate ?? Infinity)
      )
      .order('desc')
      .take(10000)

    return events
  },
})

export const getOverview = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return null

    // Capped: unbounded .collect() over buildingAnalytics caused the OOM
    // crash-loop incident (2026-08-26). 10k most-recent events bounds the
    // worst case while leaving normal-sized buildings unaffected.
    const events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .order('desc')
      .take(10000)

    const totalViews = events.filter((e) => isCountedView(e.event, e.metadata)).length
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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return []

    // Capped: unbounded .collect() over buildingAnalytics caused the OOM
    // crash-loop incident (2026-08-26). 10k most-recent events bounds the
    // worst case while leaving normal-sized buildings unaffected.
    const events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .order('desc')
      .take(10000)

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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return []

    // Capped: unbounded .collect() over buildingAnalytics caused the OOM
    // crash-loop incident (2026-08-26). 10k most-recent events bounds the
    // worst case while leaving normal-sized buildings unaffected.
    const events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .order('desc')
      .take(10000)

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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const building = await ctx.db.get(args.buildingId)
    if (!building || building.userId !== user._id) return []

    // Capped: unbounded .collect() over buildingAnalytics caused the OOM
    // crash-loop incident (2026-08-26). 10k most-recent events bounds the
    // worst case while leaving normal-sized buildings unaffected.
    const events = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .order('desc')
      .take(10000)

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
