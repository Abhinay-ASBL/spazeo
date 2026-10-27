import { v } from 'convex/values'
import {
  query,
  mutation,
  internalMutation,
  action,
  internalQuery,
  type QueryCtx,
} from './_generated/server'
import { internal } from './_generated/api'
import { consumeRateLimit, purgeStaleRateLimits } from './rateLimit'
import type { Doc, Id } from './_generated/dataModel'

const MAX_BATCH_EVENTS = 50
// ponytail: hard cap on raw per-tour event scans in dashboard aggregates —
// unbounded .collect() on 'all'/wide windows blew the 15s isolate budget on
// self-hosted (small instance). Upgrade to dailyAnalytics rollups if precision matters.
const DASHBOARD_EVENT_SCAN_CAP = 2000
// Per-tour raw-event aggregates: bounded window + hard cap (matches buildingAnalytics.ts).
const AGGREGATE_EVENT_SCAN_CAP = 10000
const DEFAULT_AGGREGATE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000
const GET_BY_TOUR_DEFAULT_LIMIT = 100
const GET_BY_TOUR_MAX_LIMIT = 500

const periodArg = v.optional(
  v.union(v.literal('7d'), v.literal('30d'), v.literal('90d'), v.literal('all'))
)

function dateStrUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function periodWindow(period: '7d' | '30d' | '90d' | 'all' | undefined): {
  periodStart: number
  prevPeriodStart: number
  isAll: boolean
} {
  const isAll = period === 'all'
  if (isAll) {
    return { periodStart: 0, prevPeriodStart: 0, isAll: true }
  }
  const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const now = Date.now()
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000
  return {
    periodStart,
    prevPeriodStart: periodStart - periodDays * 24 * 60 * 60 * 1000,
    isAll: false,
  }
}

function summarizeVisitorDocs(
  docs: Array<Doc<'visitors'> | null>,
  sessionUniques: number
) {
  const live = docs.filter(
    (d): d is Doc<'visitors'> => d != null && d.mergedInto === undefined
  )
  if (live.length === 0) {
    return {
      uniqueVisitorsEstimated: 0,
      uniqueVisitorsVerified: 0,
      uniqueVisitorsIdentified: 0,
      knownContacts: 0,
      uniqueDevices: 0,
      returningVisitors: 0,
      hasVisitorIds: false,
      sessionUniques,
    }
  }
  const estimated = live.filter((v) => v.confidence >= 70).length
  const knownContacts = live.filter((v) => v.phoneHash != null).length
  const returningVisitors = live.filter((v) => v.totalSessions > 1).length
  return {
    uniqueVisitorsEstimated: estimated,
    uniqueVisitorsVerified: knownContacts,
    uniqueVisitorsIdentified: knownContacts,
    knownContacts,
    uniqueDevices: 0,
    returningVisitors,
    hasVisitorIds: true,
    sessionUniques,
  }
}

async function countDistinctDeviceIds(
  ctx: QueryCtx,
  visitorIds: Id<'visitors'>[]
): Promise<number> {
  const values = new Set<string>()
  for (const visitorId of visitorIds) {
    const rows = await ctx.db
      .query('visitorIdentities')
      .withIndex('by_visitorId', (q) => q.eq('visitorId', visitorId))
      .collect()
    for (const row of rows) {
      if (row.kind === 'device') values.add(row.value)
    }
  }
  return values.size
}

/** Most recent capped events for a tour since `startDate` (default last 90 days). */
async function recentTourEvents(
  ctx: QueryCtx,
  tourId: Id<'tours'>,
  startDate?: number
): Promise<Doc<'analytics'>[]> {
  return ctx.db
    .query('analytics')
    .withIndex('by_tourId_timestamp', (q) =>
      q
        .eq('tourId', tourId)
        .gte('timestamp', startDate ?? Date.now() - DEFAULT_AGGREGATE_WINDOW_MS)
    )
    .order('desc')
    .take(AGGREGATE_EVENT_SCAN_CAP)
}

/** tour_view counts once per session; the `linked: true` re-emit (visitor id resolved) is not a view. */
function isCountedView(e: { event: string; metadata?: unknown }): boolean {
  return (
    e.event === 'tour_view' &&
    !(
      e.metadata &&
      typeof e.metadata === 'object' &&
      (e.metadata as { linked?: boolean }).linked === true
    )
  )
}

const timeOfDayValidator = v.union(
  v.literal('morning'),
  v.literal('afternoon'),
  v.literal('evening'),
  v.literal('sunset'),
  v.literal('night')
)

export const track = mutation({
  args: {
    tourId: v.id('tours'),
    event: v.string(),
    sessionId: v.string(),
    sceneId: v.optional(v.id('scenes')),
    metadata: v.optional(v.any()),
    deviceType: v.optional(
      v.union(v.literal('desktop'), v.literal('mobile'), v.literal('tablet'))
    ),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    duration: v.optional(v.number()),
    visitorId: v.optional(v.id('visitors')),
    variantKey: v.optional(v.string()),
    timeOfDay: v.optional(timeOfDayValidator),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `analytics:session:${args.sessionId}`, {
      windowMs: 60_000,
      max: 120,
    })
    await consumeRateLimit(ctx, `analytics:tour:${args.tourId}`, {
      windowMs: 60_000,
      max: 2000,
    })

    await ctx.db.insert('analytics', {
      ...args,
      timestamp: Date.now(),
    })

    if (args.event === 'tour_view') {
      const tour = await ctx.db.get(args.tourId)
      if (tour) {
        await ctx.db.patch(args.tourId, {
          viewCount: tour.viewCount + 1,
        })
      }
    }
  },
})

export const getByTour = query({
  args: {
    tourId: v.id('tours'),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []
    const owningTour = await ctx.db.get(args.tourId)
    if (!owningTour || owningTour.userId !== user._id) return []

    const query = ctx.db
      .query('analytics')
      .withIndex('by_tourId_timestamp', (q) =>
        q
          .eq('tourId', args.tourId)
          .gte('timestamp', args.startDate ?? -Infinity)
          .lte('timestamp', args.endDate ?? Infinity)
      )
      .order('desc')

    const limit = Math.min(
      Math.max(1, Math.floor(args.limit ?? GET_BY_TOUR_DEFAULT_LIMIT)),
      GET_BY_TOUR_MAX_LIMIT
    )
    const events = await query.take(limit)

    return events
  },
})

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const totalTours = tours.length
    const activeTours = tours.filter((t) => t.status === 'published').length
    const totalViews = tours.reduce((sum, t) => sum + t.viewCount, 0)

    // Count total leads
    let totalLeads = 0
    for (const tour of tours) {
      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      totalLeads += leads.length
    }

    // Find top performing tour
    let topTour = null
    if (tours.length > 0) {
      const sorted = [...tours].sort((a, b) => b.viewCount - a.viewCount)
      topTour = { title: sorted[0].title, viewCount: sorted[0].viewCount, id: sorted[0]._id }
    }

    return {
      totalTours,
      activeTours,
      totalViews,
      totalLeads,
      avgViewsPerTour: totalTours > 0 ? Math.round(totalViews / totalTours) : 0,
      topTour,
    }
  },
})

export const getViewsOverTime = query({
  args: {
    tourId: v.id('tours'),
    startDate: v.number(),
    endDate: v.number(),
    granularity: v.optional(v.union(v.literal('day'), v.literal('week'))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return []

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId_timestamp', (q) =>
        q.eq('tourId', args.tourId).gte('timestamp', args.startDate).lte('timestamp', args.endDate)
      )
      .order('desc')
      .take(AGGREGATE_EVENT_SCAN_CAP)

    const filtered = events.filter(isCountedView)

    // Group by day
    const grouped: Record<string, number> = {}
    for (const event of filtered) {
      const date = new Date(event.timestamp)
      const key =
        args.granularity === 'week'
          ? getWeekKey(date)
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      grouped[key] = (grouped[key] ?? 0) + 1
    }

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, views: count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  },
})

function getWeekKey(date: Date): string {
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay())
  return `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`
}

export const getSceneHeatmap = query({
  args: { tourId: v.id('tours'), startDate: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return []

    const events = await recentTourEvents(ctx, args.tourId, args.startDate)

    const sceneEvents = events.filter((e) => e.event === 'scene_view' && e.sceneId)

    const sceneViews: Record<string, number> = {}
    for (const event of sceneEvents) {
      if (event.sceneId) {
        const id = event.sceneId as string
        sceneViews[id] = (sceneViews[id] ?? 0) + 1
      }
    }

    // Enrich with scene data
    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    return scenes
      .map((scene) => ({
        sceneId: scene._id,
        title: scene.title,
        order: scene.order,
        views: sceneViews[scene._id] ?? 0,
      }))
      .sort((a, b) => a.order - b.order)
  },
})

export const getDeviceBreakdown = query({
  args: { tourId: v.id('tours'), startDate: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return { desktop: 0, mobile: 0, tablet: 0, total: 0 }
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return { desktop: 0, mobile: 0, tablet: 0, total: 0 }
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return { desktop: 0, mobile: 0, tablet: 0, total: 0 }

    const events = await recentTourEvents(ctx, args.tourId, args.startDate)

    const views = events.filter(isCountedView)
    const total = views.length

    if (total === 0) {
      return { desktop: 0, mobile: 0, tablet: 0, total: 0 }
    }

    const counts = { desktop: 0, mobile: 0, tablet: 0 }
    for (const event of views) {
      const device = event.deviceType ?? 'desktop'
      if (device in counts) {
        counts[device as keyof typeof counts]++
      }
    }

    return {
      desktop: Math.round((counts.desktop / total) * 100),
      mobile: Math.round((counts.mobile / total) * 100),
      tablet: Math.round((counts.tablet / total) * 100),
      total,
    }
  },
})

export const getGeography = query({
  args: { tourId: v.id('tours'), startDate: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return { topCountries: [], topCities: [] }
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return { topCountries: [], topCities: [] }
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return { topCountries: [], topCities: [] }

    const events = await recentTourEvents(ctx, args.tourId, args.startDate)

    const views = events.filter(isCountedView)

    const countries: Record<string, number> = {}
    const cities: Record<string, number> = {}

    for (const event of views) {
      if (event.country) {
        countries[event.country] = (countries[event.country] ?? 0) + 1
      }
      if (event.city) {
        cities[event.city] = (cities[event.city] ?? 0) + 1
      }
    }

    return {
      topCountries: Object.entries(countries)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topCities: Object.entries(cities)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    }
  },
})

export const getEngagementMetrics = query({
  args: { tourId: v.id('tours'), startDate: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    const empty = {
      totalSessions: 0,
      totalSceneViews: 0,
      avgScenesViewed: 0,
      avgTimePerScene: 0,
      bounceRate: 0,
    }
    if (!identity) return empty
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return empty
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return empty

    const events = await recentTourEvents(ctx, args.tourId, args.startDate)

    const sceneViews = events.filter((e) => e.event === 'scene_view')

    // Group by session
    const sessions = new Map<string, { scenes: Set<string>; durations: number[] }>()
    for (const event of events) {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, { scenes: new Set(), durations: [] })
      }
      const session = sessions.get(event.sessionId)!
      if (event.sceneId) {
        session.scenes.add(event.sceneId as string)
      }
      if (event.duration) {
        session.durations.push(event.duration)
      }
    }

    const totalSessions = sessions.size
    const allDurations = Array.from(sessions.values()).flatMap((s) => s.durations)
    const avgTimePerScene =
      allDurations.length > 0
        ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
        : 0

    const avgScenesViewed =
      totalSessions > 0
        ? Math.round(
            Array.from(sessions.values()).reduce((sum, s) => sum + s.scenes.size, 0) /
              totalSessions
          )
        : 0

    // Bounce rate: sessions with only 1 event
    const bounceSessions = Array.from(sessions.values()).filter(
      (s) => s.scenes.size <= 1
    ).length
    const bounceRate =
      totalSessions > 0 ? Math.round((bounceSessions / totalSessions) * 100) : 0

    return {
      totalSessions,
      totalSceneViews: sceneViews.length,
      avgScenesViewed,
      avgTimePerScene,
      bounceRate,
    }
  },
})

export const getLeadFunnel = query({
  args: { tourId: v.id('tours'), startDate: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    const empty = {
      views: 0,
      formShown: 0,
      formSubmitted: 0,
      viewToFormRate: 0,
      formConversionRate: 0,
      overallConversionRate: 0,
    }
    if (!identity) return empty
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return empty
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return empty

    const events = await recentTourEvents(ctx, args.tourId, args.startDate)

    const totalViews = events.filter(isCountedView).length
    const formShown = events.filter((e) => e.event === 'lead_form_shown').length
    const formSubmitted = events.filter((e) => e.event === 'lead_form_submitted').length

    return {
      views: totalViews,
      formShown,
      formSubmitted,
      viewToFormRate: totalViews > 0 ? Math.round((formShown / totalViews) * 100) : 0,
      formConversionRate: formShown > 0 ? Math.round((formSubmitted / formShown) * 100) : 0,
      overallConversionRate:
        totalViews > 0 ? Math.round((formSubmitted / totalViews) * 100) : 0,
    }
  },
})

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    let viewsThisWeek = 0
    let leadsThisWeek = 0

    for (const tour of tours) {
      const events = await ctx.db
        .query('analytics')
        .withIndex('by_tourId_timestamp', (q) =>
          q.eq('tourId', tour._id).gte('timestamp', oneWeekAgo)
        )
        .take(DASHBOARD_EVENT_SCAN_CAP)

      viewsThisWeek += events.filter(isCountedView).length

      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()

      leadsThisWeek += leads.filter((l) => l._creationTime >= oneWeekAgo).length
    }

    return {
      viewsThisWeek,
      leadsThisWeek,
      totalTours: tours.length,
      activeTours: tours.filter((t) => t.status === 'published').length,
    }
  },
})

// Rollup runs in two paginated phases so no single transaction reads a whole
// busy day (Convex caps reads per mutation):
//   1. rollupDaily pages yesterday's events by timestamp and schedules one
//      rollupTourDay per tour, deduped by "this page holds the tour's first
//      event of the day" (exactly one page does).
//   2. rollupTourDay pages that tour's day via by_tourId_timestamp, carrying
//      partial counters + distinct sets in args, and writes the row (overwrite,
//      so reruns/retries never double count) on its last page.
const ROLLUP_PAGE_SIZE = 2000

const rollupStateValidator = v.object({
  views: v.number(),
  durationSum: v.number(),
  durationCount: v.number(),
  sceneViews: v.record(v.string(), v.number()),
  deviceBreakdown: v.object({ desktop: v.number(), mobile: v.number(), tablet: v.number() }),
  topCountries: v.record(v.string(), v.number()),
  sessionIds: v.array(v.string()),
  visitorIds: v.array(v.id('visitors')),
})

export const rollupDaily = internalMutation({
  args: {
    // Omitted on the cron call; set on continuation pages.
    dateStr: v.optional(v.string()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    // Get yesterday's date (pinned on page 0 so continuations stay on the same day)
    let dateStr = args.dateStr
    if (!dateStr) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      dateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    }

    const startOfDay = new Date(dateStr + 'T00:00:00Z').getTime()
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000

    // Every tour (any status) that had events yesterday — dashboards read rollups for
    // draft/archived tours too. Found via the timestamp index, not a tours scan.
    const page = await ctx.db
      .query('analytics')
      .withIndex('by_timestamp', (q) =>
        q.gte('timestamp', startOfDay).lt('timestamp', endOfDay)
      )
      .paginate({ cursor: args.cursor ?? null, numItems: ROLLUP_PAGE_SIZE })

    const pageIds = new Set(page.page.map((e) => e._id))
    const pageTourIds = new Set(page.page.map((e) => e.tourId))
    for (const tourId of pageTourIds) {
      const first = await ctx.db
        .query('analytics')
        .withIndex('by_tourId_timestamp', (q) =>
          q.eq('tourId', tourId).gte('timestamp', startOfDay).lt('timestamp', endOfDay)
        )
        .first()
      if (first && pageIds.has(first._id)) {
        await ctx.scheduler.runAfter(0, internal.analytics.rollupTourDay, {
          tourId,
          dateStr,
          cursor: null,
        })
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.analytics.rollupDaily, {
        dateStr,
        cursor: page.continueCursor,
      })
    }
  },
})

export const rollupTourDay = internalMutation({
  args: {
    tourId: v.id('tours'),
    dateStr: v.string(),
    cursor: v.union(v.string(), v.null()),
    state: v.optional(rollupStateValidator),
  },
  handler: async (ctx, args) => {
    const { tourId, dateStr } = args
    const tour = await ctx.db.get(tourId)
    if (!tour) return // deleted

    const startOfDay = new Date(dateStr + 'T00:00:00Z').getTime()
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000

    const page = await ctx.db
      .query('analytics')
      .withIndex('by_tourId_timestamp', (q) =>
        q.eq('tourId', tourId).gte('timestamp', startOfDay).lt('timestamp', endOfDay)
      )
      .paginate({ cursor: args.cursor, numItems: ROLLUP_PAGE_SIZE })
    const dayEvents = page.page

    const state = args.state ?? {
      views: 0,
      durationSum: 0,
      durationCount: 0,
      sceneViews: {},
      deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
      topCountries: {},
      sessionIds: [],
      visitorIds: [],
    }
    const sessionIds = new Set(state.sessionIds)
    const visitorIdSet = new Set(state.visitorIds)

    const views = dayEvents.filter(isCountedView)
    state.views += views.length
    for (const e of views) sessionIds.add(e.sessionId)

    // Duration
    for (const e of dayEvents) {
      if (e.duration) {
        state.durationSum += e.duration
        state.durationCount++
      }
    }

    // Scene views
    for (const e of dayEvents) {
      if (e.event === 'scene_view' && e.sceneId) {
        const id = e.sceneId as string
        state.sceneViews[id] = (state.sceneViews[id] ?? 0) + 1
      }
    }

    // Device breakdown
    for (const v of views) {
      const device = v.deviceType ?? 'desktop'
      if (device in state.deviceBreakdown) {
        state.deviceBreakdown[device as keyof typeof state.deviceBreakdown]++
      }
    }

    // Top countries
    for (const v of views) {
      if (v.country) {
        state.topCountries[v.country] = (state.topCountries[v.country] ?? 0) + 1
      }
    }

    for (const e of dayEvents) {
      if (e.visitorId != null) visitorIdSet.add(e.visitorId)
    }

    state.sessionIds = [...sessionIds]
    state.visitorIds = [...visitorIdSet]

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.analytics.rollupTourDay, {
        tourId,
        dateStr,
        cursor: page.continueCursor,
        state,
      })
      return
    }

    const avgDuration =
      state.durationCount > 0 ? Math.round(state.durationSum / state.durationCount) : 0

    // Leads count — bounded to yesterday's tours only, `leads` has no timestamp
    // index so this stays scoped per-tour rather than a full-table scan.
    const leads = await ctx.db
      .query('leads')
      .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
      .collect()
    const dayLeads = leads.filter(
      (l) => l._creationTime >= startOfDay && l._creationTime < endOfDay
    )

    // Best-effort identity rollups when visitorId is present on events
    const visitorIds = state.visitorIds
    let uniqueVisitorsEstimated = 0
    let uniqueVisitorsVerified = 0
    let uniqueDevices = 0
    let returningVisitors = 0
    if (visitorIds.length > 0) {
      const visitorDocs = await Promise.all(visitorIds.map((id) => ctx.db.get(id)))
      const present = visitorDocs.filter(
        (doc): doc is NonNullable<typeof doc> =>
          doc != null && doc.mergedInto === undefined
      )
      uniqueVisitorsEstimated = present.filter((v) => v.confidence >= 70).length
      uniqueVisitorsVerified = present.filter((v) => v.phoneHash != null).length
      // ponytail: device floor ≈ distinct visitor rows at device+ tier
      uniqueDevices = present.filter(
        (v) =>
          v.identityTier === 'device' ||
          v.identityTier === 'fingerprint' ||
          v.identityTier === 'identified' ||
          v.identityTier === 'verified'
      ).length
      returningVisitors = present.filter((v) => v.totalSessions > 1).length
    }

    // Check if daily analytics already exists for this date
    const existing = await ctx.db
      .query('dailyAnalytics')
      .withIndex('by_tourId_date', (q) => q.eq('tourId', tour._id).eq('date', dateStr))
      .unique()

    const data = {
      tourId: tour._id,
      date: dateStr,
      views: state.views,
      uniqueVisitors: sessionIds.size,
      avgDuration,
      leadsCount: dayLeads.length,
      sceneViews: state.sceneViews,
      deviceBreakdown: state.deviceBreakdown,
      topCountries: state.topCountries,
      uniqueVisitorsEstimated,
      uniqueVisitorsVerified,
      uniqueDevices,
      returningVisitors,
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
    } else {
      await ctx.db.insert('dailyAnalytics', data)
    }
  },
})

export const getDashboardOverview = query({
  args: {
    period: periodArg,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    const { periodStart, prevPeriodStart, isAll } = periodWindow(args.period)

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const totalTours = tours.length
    const publishedTours = tours.filter((t) => t.status === 'published').length

    // ponytail: dashboard reads dailyAnalytics rollups (cron-populated, ~1 row/tour/day)
    // instead of scanning raw `analytics` events live — the live scan was unbounded per
    // tenant and blew memory/time on the self-hosted backend under real traffic. Only
    // "today" (not yet rolled up) needs a live query, and that's capped to one day's events.
    const todayStr = dateStrUTC(Date.now())
    const startOfTodayMs = Date.parse(`${todayStr}T00:00:00.000Z`)
    const periodStartStr = isAll ? '0000-00-00' : dateStrUTC(periodStart)
    const prevPeriodStartStr = isAll ? '0000-00-00' : dateStrUTC(prevPeriodStart)

    let totalLeads = 0
    let currentLeads = 0
    let prevLeads = 0

    let currentViews = 0
    let prevViews = 0
    let currentViewingSeconds = 0
    let prevViewingSeconds = 0
    let periodSessions = 0
    let prevSessions = 0
    let estimatedVisitors = 0
    let knownContacts = 0
    let returningVisitors = 0
    let uniqueDevices = 0
    let hasVisitorIds = false

    // Today's live (not-yet-rolled-up) events, bounded to one day, all tours combined.
    let todayEvents: Array<{
      event: string
      timestamp: number
      duration?: number
      sessionId: string
      visitorId?: Id<'visitors'>
    }> = []

    for (const tour of tours) {
      const dailyRows = await ctx.db
        .query('dailyAnalytics')
        .withIndex('by_tourId_date', (q) =>
          q.eq('tourId', tour._id).gte('date', prevPeriodStartStr).lt('date', todayStr)
        )
        .collect()

      for (const row of dailyRows) {
        const inCurrent = row.date >= periodStartStr
        const rowSeconds = row.avgDuration * row.views
        if (inCurrent) {
          currentViews += row.views
          currentViewingSeconds += rowSeconds
          periodSessions += row.uniqueVisitors
          estimatedVisitors += row.uniqueVisitorsEstimated ?? 0
          knownContacts += row.uniqueVisitorsVerified ?? 0
          returningVisitors += row.returningVisitors ?? 0
          uniqueDevices += row.uniqueDevices ?? 0
          if ((row.uniqueDevices ?? 0) > 0) hasVisitorIds = true
        } else {
          prevViews += row.views
          prevViewingSeconds += rowSeconds
          prevSessions += row.uniqueVisitors
        }
      }

      const events = await ctx.db
        .query('analytics')
        .withIndex('by_tourId_timestamp', (q) =>
          q.eq('tourId', tour._id).gte('timestamp', startOfTodayMs)
        )
        .take(DASHBOARD_EVENT_SCAN_CAP)
      todayEvents = todayEvents.concat(events)

      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      totalLeads += leads.length
      currentLeads += leads.filter((l) => l._creationTime >= periodStart).length
      prevLeads += leads.filter(
        (l) => l._creationTime >= prevPeriodStart && l._creationTime < periodStart
      ).length
    }

    // Merge today's live events into the current-period aggregates (today is always "current").
    const todayViewEvents = todayEvents.filter(isCountedView)
    currentViews += todayViewEvents.length
    const todaySessions = new Set(todayViewEvents.map((e) => e.sessionId))
    periodSessions += todaySessions.size
    const todayDurations = todayEvents
      .filter((e) => e.duration && e.duration > 0)
      .map((e) => e.duration!)
    currentViewingSeconds += todayDurations.reduce((sum, d) => sum + d, 0)

    const todayVisitorIds = [
      ...new Set(
        todayEvents.map((e) => e.visitorId).filter((id): id is Id<'visitors'> => id != null)
      ),
    ]
    const todayVisitorDocs =
      todayVisitorIds.length > 0
        ? await Promise.all(todayVisitorIds.map((id) => ctx.db.get(id)))
        : []
    const todayPeople = summarizeVisitorDocs(todayVisitorDocs, todaySessions.size)
    if (todayPeople.hasVisitorIds) {
      hasVisitorIds = true
      estimatedVisitors += todayPeople.uniqueVisitorsEstimated
      knownContacts += todayPeople.knownContacts
      returningVisitors += todayPeople.returningVisitors
      const todayLiveVisitorIds = todayVisitorDocs
        .filter((d): d is Doc<'visitors'> => d != null && d.mergedInto === undefined)
        .map((d) => d._id)
      uniqueDevices += await countDistinctDeviceIds(ctx, todayLiveVisitorIds)
    }

    // All-time total comes from the denormalized counter, not a table scan.
    const totalViews = tours.reduce((sum, t) => sum + t.viewCount, 0)
    const totalViewingHours = Math.floor(currentViewingSeconds / 3600)
    const totalViewingMinutes = Math.floor((currentViewingSeconds % 3600) / 60)
    const totalUniqueVisitors = periodSessions

    const people = {
      uniqueVisitorsEstimated: estimatedVisitors,
      knownContacts,
      returningVisitors,
      hasVisitorIds,
    }

    const avgSceneTime =
      currentViews > 0 ? Math.round(currentViewingSeconds / currentViews) : 0

    // Tours created in periods
    const currentTours = tours.filter((t) => t._creationTime >= periodStart).length
    const prevTours = tours.filter(
      (t) => t._creationTime >= prevPeriodStart && t._creationTime < periodStart
    ).length

    // AI jobs completed
    const aiJobs = await ctx.db
      .query('aiJobs')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
    const completedAiJobs = aiJobs.filter((j) => j.status === 'completed').length
    const currentAiJobs = aiJobs.filter(
      (j) => j.status === 'completed' && j._creationTime >= periodStart
    ).length
    const prevAiJobs = aiJobs.filter(
      (j) =>
        j.status === 'completed' &&
        j._creationTime >= prevPeriodStart && j._creationTime < periodStart
    ).length

    // Top tour
    let topTour: { id: string; title: string; viewCount: number; slug: string } | null = null
    if (tours.length > 0) {
      const sorted = [...tours].sort((a, b) => b.viewCount - a.viewCount)
      topTour = {
        id: sorted[0]._id,
        title: sorted[0].title,
        viewCount: sorted[0].viewCount,
        slug: sorted[0].slug,
      }
    }

    function calcTrend(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    return {
      totalTours,
      publishedTours,
      totalViews,
      periodViews: currentViews,
      periodSessions,
      periodLeads: currentLeads,
      totalLeads,
      totalUniqueVisitors,
      avgSceneTime,
      totalViewingHours,
      totalViewingMinutes,
      completedAiJobs,
      topTour,
      plan: user.plan,
      aiCreditsUsed: user.aiCreditsUsed ?? 0,
      uniqueDevices,
      uniqueVisitorsEstimated: people.uniqueVisitorsEstimated,
      knownContacts: people.knownContacts,
      returningVisitors: people.returningVisitors,
      hasVisitorIds: people.hasVisitorIds,
      trends: isAll
        ? { tours: 0, views: 0, sessions: 0, leads: 0, viewingTime: 0, aiJobs: 0 }
        : {
            tours: calcTrend(currentTours, prevTours),
            views: calcTrend(currentViews, prevViews),
            sessions: calcTrend(periodSessions, prevSessions),
            leads: calcTrend(currentLeads, prevLeads),
            viewingTime: calcTrend(currentViewingSeconds, prevViewingSeconds),
            aiJobs: calcTrend(currentAiJobs, prevAiJobs),
          },
      conversionRate:
        currentViews > 0
          ? Math.round((currentLeads / currentViews) * 1000) / 10
          : 0,
    }
  },
})

// Internal query for CSV export
export const getEventsByTourInternal = internalQuery({
  args: {
    tourId: v.id('tours'),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('analytics')
      .withIndex('by_tourId_timestamp', (q) =>
        q
          .eq('tourId', args.tourId)
          .gte('timestamp', args.startDate ?? -Infinity)
          .lte('timestamp', args.endDate ?? Infinity)
      )
      .order('desc')
      .take(AGGREGATE_EVENT_SCAN_CAP)
  },
})

export const getAllEventsInternal = internalQuery({
  args: {
    clerkId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    if (!user) return []

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    // Shared budget across tours so one export stays under the read limit.
    const allEvents: Doc<'analytics'>[] = []
    for (const tour of tours) {
      const remaining = AGGREGATE_EVENT_SCAN_CAP - allEvents.length
      if (remaining <= 0) break
      const rows = await ctx.db
        .query('analytics')
        .withIndex('by_tourId_timestamp', (q) =>
          q
            .eq('tourId', tour._id)
            .gte('timestamp', args.startDate ?? -Infinity)
            .lte('timestamp', args.endDate ?? Infinity)
        )
        .order('desc')
        .take(remaining)
      allEvents.push(...rows)
    }

    return allEvents.sort((a, b) => b.timestamp - a.timestamp)
  },
})

export const exportCsv = action({
  args: {
    tourId: v.optional(v.id('tours')),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) throw new Error('Not authenticated')

    const caller = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!caller) throw new Error('User not found')

    let events: Doc<'analytics'>[]
    if (args.tourId) {
      const tour = await ctx.runQuery(internal.tours.getTourForOwner, {
        tourId: args.tourId,
        userId: caller._id,
      })
      if (!tour) throw new Error('Forbidden')

      events = await ctx.runQuery(internal.analytics.getEventsByTourInternal, {
        tourId: args.tourId,
        startDate: args.startDate,
        endDate: args.endDate,
      })
    } else {
      events = await ctx.runQuery(internal.analytics.getAllEventsInternal, {
        clerkId: identity.subject,
        startDate: args.startDate,
        endDate: args.endDate,
      })
    }

    // Build CSV
    const headers = [
      'Tour ID',
      'Event',
      'Session ID',
      'Scene ID',
      'Variant Key',
      'Time of Day',
      'Device Type',
      'Country',
      'City',
      'Duration (s)',
      'Timestamp',
    ]
    const rows = events.map((event) => [
      event.tourId,
      event.event,
      event.sessionId,
      event.sceneId ?? '',
      event.variantKey ?? '',
      event.timeOfDay ?? '',
      event.deviceType ?? '',
      event.country ?? '',
      event.city ?? '',
      event.duration != null ? String(event.duration) : '',
      new Date(event.timestamp).toISOString(),
    ])

    const csv =
      headers.join(',') +
      '\n' +
      rows.map((row: string[]) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

    return csv
  },
})

export const getTourPerformance = query({
  args: {
    period: periodArg,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const { periodStart, isAll } = periodWindow(args.period)

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const results = []

    // ponytail: same rollup-first approach as getDashboardOverview — see comment there.
    const todayStr = dateStrUTC(Date.now())
    const startOfTodayMs = Date.parse(`${todayStr}T00:00:00.000Z`)
    const periodStartStr = isAll ? '0000-00-00' : dateStrUTC(periodStart)

    for (const tour of tours) {
      const dailyRows = await ctx.db
        .query('dailyAnalytics')
        .withIndex('by_tourId_date', (q) =>
          q.eq('tourId', tour._id).gte('date', periodStartStr).lt('date', todayStr)
        )
        .collect()

      const rollupViews = dailyRows.reduce((sum, r) => sum + r.views, 0)
      const rollupSessions = dailyRows.reduce((sum, r) => sum + r.uniqueVisitors, 0)
      const rollupSeconds = dailyRows.reduce((sum, r) => sum + r.avgDuration * r.views, 0)

      const todayEvents = await ctx.db
        .query('analytics')
        .withIndex('by_tourId_timestamp', (q) =>
          q.eq('tourId', tour._id).gte('timestamp', startOfTodayMs)
        )
        .take(DASHBOARD_EVENT_SCAN_CAP)

      const todayViewEvents = todayEvents.filter(isCountedView)
      const todaySessions = new Set(todayViewEvents.map((e) => e.sessionId))
      const todayDurations = todayEvents
        .filter((e) => e.duration && e.duration > 0)
        .map((e) => e.duration!)
      const todaySeconds = todayDurations.reduce((sum, d) => sum + d, 0)

      const views = rollupViews + todayViewEvents.length
      const uniqueSessions = rollupSessions + todaySessions.size
      const totalSeconds = rollupSeconds + todaySeconds
      const avgDuration = views > 0 ? Math.round(totalSeconds / views) : 0

      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      const periodLeads = isAll
        ? leads
        : leads.filter((l) => l._creationTime >= periodStart)

      results.push({
        tourId: tour._id,
        title: tour.title,
        slug: tour.slug,
        status: tour.status,
        views,
        uniqueVisitors: uniqueSessions,
        leads: periodLeads.length,
        avgDuration,
        totalViews: tour.viewCount,
      })
    }

    return results.sort((a, b) => b.views - a.views)
  },
})

export const trackBatch = mutation({
  args: {
    tourId: v.id('tours'),
    sessionId: v.string(),
    deviceType: v.optional(
      v.union(v.literal('desktop'), v.literal('mobile'), v.literal('tablet'))
    ),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    visitorId: v.optional(v.id('visitors')),
    events: v.array(
      v.object({
        event: v.string(),
        sceneId: v.optional(v.id('scenes')),
        duration: v.optional(v.number()),
        metadata: v.optional(v.any()),
        timestamp: v.optional(v.number()),
        variantKey: v.optional(v.string()),
        timeOfDay: v.optional(timeOfDayValidator),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.events.length === 0) return
    if (args.events.length > MAX_BATCH_EVENTS) {
      throw new Error(`Batch too large (max ${MAX_BATCH_EVENTS} events)`)
    }
    await consumeRateLimit(ctx, `analytics:session:${args.sessionId}`, {
      windowMs: 60_000,
      max: 120,
      cost: args.events.length,
    })
    await consumeRateLimit(ctx, `analytics:tour:${args.tourId}`, {
      windowMs: 60_000,
      max: 2000,
      cost: args.events.length,
    })

    const now = Date.now()
    let tourViewEmitted = false
    for (const e of args.events) {
      const metaVid =
        e.metadata &&
        typeof e.metadata === 'object' &&
        typeof (e.metadata as { visitorId?: unknown }).visitorId === 'string'
          ? (ctx.db.normalizeId('visitors', (e.metadata as { visitorId: string }).visitorId) ??
            undefined)
          : undefined
      await ctx.db.insert('analytics', {
        tourId: args.tourId,
        sessionId: args.sessionId,
        event: e.event,
        sceneId: e.sceneId,
        duration: e.duration,
        metadata: e.metadata,
        deviceType: args.deviceType,
        country: args.country,
        city: args.city,
        visitorId: args.visitorId ?? metaVid,
        variantKey: e.variantKey,
        timeOfDay: e.timeOfDay,
        timestamp: Math.min(e.timestamp ?? now, now),
      })
      if (e.event === 'tour_view') {
        const linked =
          e.metadata &&
          typeof e.metadata === 'object' &&
          (e.metadata as { linked?: boolean }).linked === true
        if (!linked) tourViewEmitted = true
      }
    }
    const visitorId = args.visitorId
    const tour = await ctx.db.get(args.tourId)
    if (visitorId) {
      const visitor = await ctx.db.get(visitorId)
      if (visitor && visitor.mergedInto === undefined) {
        const added = args.events.reduce((sum, e) => {
          if (e.event !== 'section_dwell') return sum
          return sum + (typeof e.duration === 'number' && e.duration > 0 ? e.duration : 0)
        }, 0)
        const mm = args.events
          .map((e) => {
            const m = e.metadata as Record<string, unknown> | undefined
            return typeof m?.mm === 'string' ? m.mm : undefined
          })
          .find(Boolean)
        const intentAddr =
          !mm && !visitor.micromarket && tour?.address?.trim()
            ? tour.address.trim()
            : undefined
        await ctx.db.patch(visitorId, {
          lastSeenAt: now,
          lastTourId: args.tourId,
          totalSecondsViewed: visitor.totalSecondsViewed + added,
          ...(args.city && !visitor.city ? { city: args.city } : {}),
          ...(args.country && !visitor.countryCode
            ? { countryCode: args.country }
            : {}),
          ...(mm
            ? { micromarket: mm, micromarketSource: 'qr_campaign' as const }
            : intentAddr
              ? {
                  micromarket: intentAddr,
                  micromarketSource: 'tour_intent' as const,
                }
              : {}),
        })
      }
    }
    if (tourViewEmitted && tour) {
      await ctx.db.patch(args.tourId, { viewCount: tour.viewCount + 1 })
    }
  },
})

export const purgeRateLimitBuckets = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await purgeStaleRateLimits(ctx)
  },
})

export const getBySession = query({
  args: { sessionId: v.string(), tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return []

    const all = await ctx.db
      .query('analytics')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .collect()
    return all
      .filter((e) => e.tourId === args.tourId)
      .sort((a, b) => a.timestamp - b.timestamp)
  },
})

export const getSessionsByTour = query({
  args: {
    tourId: v.id('tours'),
    limit: v.optional(v.number()),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return []

    const events = await recentTourEvents(ctx, args.tourId, args.startDate)

    const bySession = new Map<
      string,
      {
        sessionId: string
        startedAt: number
        endedAt: number
        scenes: Set<string>
        hotspotClicks: number
        deviceType?: string
        country?: string
        city?: string
      }
    >()
    for (const e of events) {
      let s = bySession.get(e.sessionId)
      if (!s) {
        s = {
          sessionId: e.sessionId,
          startedAt: e.timestamp,
          endedAt: e.timestamp,
          scenes: new Set<string>(),
          hotspotClicks: 0,
          deviceType: e.deviceType,
          country: e.country,
          city: e.city,
        }
        bySession.set(e.sessionId, s)
      }
      s.startedAt = Math.min(s.startedAt, e.timestamp)
      s.endedAt = Math.max(s.endedAt, e.timestamp)
      if (e.sceneId) s.scenes.add(e.sceneId as string)
      if (e.event === 'hotspot_click') s.hotspotClicks += 1
      if (!s.deviceType && e.deviceType) s.deviceType = e.deviceType
      if (!s.country && e.country) s.country = e.country
      if (!s.city && e.city) s.city = e.city
    }

    const leads = await ctx.db
      .query('leads')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()
    const leadBySession = new Map<string, string>()
    for (const l of leads) {
      if (l.sessionId) leadBySession.set(l.sessionId, l._id)
    }

    const rows = Array.from(bySession.values())
      .map((s) => ({
        sessionId: s.sessionId,
        startedAt: s.startedAt,
        duration: Math.round((s.endedAt - s.startedAt) / 1000),
        scenesVisited: s.scenes.size,
        hotspotClicks: s.hotspotClicks,
        deviceType: s.deviceType,
        country: s.country,
        city: s.city,
        leadId: leadBySession.get(s.sessionId),
      }))
      .sort((a, b) => b.startedAt - a.startedAt)

    return args.limit ? rows.slice(0, args.limit) : rows
  },
})

export const getYawHeatmap = query({
  args: {
    sceneId: v.id('scenes'),
    visitorId: v.optional(v.id('visitors')),
    sessionId: v.optional(v.string()),
    startTs: v.optional(v.number()),
    endTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null
    const scene = await ctx.db.get(args.sceneId)
    if (!scene) return null
    const tour = await ctx.db.get(scene.tourId)
    if (!tour) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || tour.userId !== user._id) return null

    const startTs = args.startTs ?? 0
    const endTs = args.endTs ?? Number.POSITIVE_INFINITY

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId_timestamp', (q) =>
        q.eq('tourId', scene.tourId).gte('timestamp', startTs).lte('timestamp', endTs)
      )
      .order('desc')
      .take(AGGREGATE_EVENT_SCAN_CAP)

    const YAW_BINS = 36
    const PITCH_BINS = 9
    const grid: number[][] = Array.from({ length: PITCH_BINS }, () =>
      Array.from({ length: YAW_BINS }, () => 0)
    )
    let total = 0
    let peakCount = 0
    let peakYaw = 0
    let peakPitch = 0
    let yawFrom = 360
    let yawTo = 0
    let pitchFrom = 90
    let pitchTo = -90

    for (const e of events) {
      if (e.event !== 'view_direction') continue
      if (e.sceneId !== args.sceneId) continue
      if (args.sessionId) {
        if (e.sessionId !== args.sessionId) continue
      } else if (args.visitorId && e.visitorId !== args.visitorId) {
        continue
      }
      if (e.timestamp < startTs || e.timestamp > endTs) continue
      const m = e.metadata as { yaw?: number; pitch?: number } | undefined
      if (!m || typeof m.yaw !== 'number' || typeof m.pitch !== 'number') continue
      const yawNorm = ((m.yaw % 360) + 360) % 360
      const yawBin = Math.min(YAW_BINS - 1, Math.floor(yawNorm / (360 / YAW_BINS)))
      const pitchNorm = Math.max(-90, Math.min(90, m.pitch))
      const pitchBin = Math.min(
        PITCH_BINS - 1,
        Math.floor(((pitchNorm + 90) / 180) * PITCH_BINS)
      )
      grid[pitchBin][yawBin] += 1
      total += 1
      yawFrom = Math.min(yawFrom, yawNorm)
      yawTo = Math.max(yawTo, yawNorm)
      pitchFrom = Math.min(pitchFrom, pitchNorm)
      pitchTo = Math.max(pitchTo, pitchNorm)
      if (grid[pitchBin][yawBin] > peakCount) {
        peakCount = grid[pitchBin][yawBin]
        peakYaw = yawBin * 10 + 5
        peakPitch = Math.round(-90 + (pitchBin + 0.5) * 20)
      }
    }

    const yawRanges: { from: number; to: number }[] = []
    let yawRun: number | null = null
    for (let y = 0; y <= YAW_BINS; y++) {
      const used =
        y < YAW_BINS && grid.some((row) => (row[y] ?? 0) > 0)
      if (used && yawRun == null) yawRun = y
      if (!used && yawRun != null) {
        yawRanges.push({ from: yawRun * 10, to: y * 10 })
        yawRun = null
      }
    }
    const pitchRanges: { from: number; to: number }[] = []
    let pitchRun: number | null = null
    for (let p = 0; p <= PITCH_BINS; p++) {
      const used = p < PITCH_BINS && (grid[p]?.some((v) => v > 0) ?? false)
      if (used && pitchRun == null) pitchRun = p
      if (!used && pitchRun != null) {
        pitchRanges.push({
          from: -90 + pitchRun * 20,
          to: -90 + p * 20,
        })
        pitchRun = null
      }
    }

    return {
      grid,
      total,
      yawBins: YAW_BINS,
      pitchBins: PITCH_BINS,
      peakYaw: total > 0 ? peakYaw : null,
      peakPitch: total > 0 ? peakPitch : null,
      yawFrom: total > 0 ? Math.round(yawFrom) : null,
      yawTo: total > 0 ? Math.round(yawTo) : null,
      pitchFrom: total > 0 ? Math.round(pitchFrom) : null,
      pitchTo: total > 0 ? Math.round(pitchTo) : null,
      yawRanges,
      pitchRanges,
    }
  },
})

export const getHotspotClickCounts = query({
  args: { tourId: v.id('tours'), startDate: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return {}
    const tour = await ctx.db.get(args.tourId)
    if (!tour) return {}
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || tour.userId !== user._id) return {}

    const events = await recentTourEvents(ctx, args.tourId, args.startDate)
    const counts: Record<string, number> = {}
    for (const e of events) {
      if (e.event !== 'hotspot_click') continue
      const m = e.metadata as { hotspotId?: string } | undefined
      if (!m?.hotspotId) continue
      counts[m.hotspotId] = (counts[m.hotspotId] ?? 0) + 1
    }
    return counts
  },
})

// ── Phase 4–5: visitor identity, variants, QR attribution ─────

/** Estimated (confidence >= 70) vs phone-anchored known contacts. */
export const getUniqueVisitorStats = query({
  args: {
    tourId: v.id('tours'),
    period: periodArg,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return null

    const { periodStart } = periodWindow(args.period)
    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId_timestamp', (q) =>
        q.eq('tourId', args.tourId).gte('timestamp', periodStart)
      )
      .order('desc')
      .take(AGGREGATE_EVENT_SCAN_CAP)

    const views = events.filter((e) => e.event === 'tour_view')
    const sessionUniques = new Set(views.map((e) => e.sessionId)).size

    const visitorIds = [
      ...new Set(
        events
          .map((e) => e.visitorId)
          .filter((id): id is NonNullable<typeof id> => id != null)
      ),
    ]

    const docs =
      visitorIds.length > 0
        ? await Promise.all(visitorIds.map((id) => ctx.db.get(id)))
        : []

    const summary = summarizeVisitorDocs(docs, sessionUniques)
    const liveIds = docs
      .filter((d): d is Doc<'visitors'> => d != null && d.mergedInto === undefined)
      .map((d) => d._id)
    const uniqueDevices = await countDistinctDeviceIds(ctx, liveIds)
    return { ...summary, uniqueDevices }
  },
})

/** Switch rate + dwell by timeOfDay from variant_* events. */
export const getVariantEngagement = query({
  args: { tourId: v.id('tours'), period: periodArg },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return null

    const { periodStart } = periodWindow(args.period)
    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId_timestamp', (q) =>
        q.eq('tourId', args.tourId).gte('timestamp', periodStart)
      )
      .order('desc')
      .take(AGGREGATE_EVENT_SCAN_CAP)

    const viewSessions = new Set(
      events.filter((e) => e.event === 'tour_view').map((e) => e.sessionId)
    )
    const switchSessions = new Set(
      events.filter((e) => e.event === 'variant_switch').map((e) => e.sessionId)
    )
    const switchRate =
      viewSessions.size > 0
        ? Math.round((switchSessions.size / viewSessions.size) * 1000) / 10
        : 0

    const dwellByTod: Record<
      string,
      { events: number; totalDurationSec: number; avgDurationSec: number }
    > = {}
    for (const e of events) {
      if (e.event !== 'variant_dwell' && e.event !== 'variant_view') continue
      const tod =
        e.timeOfDay ??
        (e.metadata as { timeOfDay?: string } | undefined)?.timeOfDay ??
        'unknown'
      if (!dwellByTod[tod]) {
        dwellByTod[tod] = { events: 0, totalDurationSec: 0, avgDurationSec: 0 }
      }
      dwellByTod[tod].events += 1
      if (typeof e.duration === 'number') {
        dwellByTod[tod].totalDurationSec += e.duration
      }
    }
    for (const bucket of Object.values(dwellByTod)) {
      bucket.avgDurationSec =
        bucket.events > 0
          ? Math.round(bucket.totalDurationSec / bucket.events)
          : 0
    }

    const switchCount = events.filter((e) => e.event === 'variant_switch').length
    const viewCount = events.filter((e) => e.event === 'variant_view').length

    if (switchCount === 0 && viewCount === 0 && Object.keys(dwellByTod).length === 0) {
      return null
    }

    return {
      switchRate,
      switchSessions: switchSessions.size,
      viewSessions: viewSessions.size,
      switchCount,
      viewCount,
      dwellByTimeOfDay: dwellByTod,
    }
  },
})

/** QR placement report — group tour_view / leads by metadata.qr / mm / camp. */
export const getQrAttribution = query({
  args: { tourId: v.id('tours'), period: periodArg },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return null

    const { periodStart, isAll } = periodWindow(args.period)
    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId_timestamp', (q) =>
        q.eq('tourId', args.tourId).gte('timestamp', periodStart)
      )
      .order('desc')
      .take(AGGREGATE_EVENT_SCAN_CAP)

    const allLeads = await ctx.db
      .query('leads')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()
    const leads = isAll
      ? allLeads
      : allLeads.filter((l) => l._creationTime >= periodStart)

    type Row = {
      qr: string
      mm: string
      camp: string
      scans: number
      leads: number
      leadsWithPhone: number
      leadRate: number
    }
    const byKey = new Map<string, Row>()

    const keyOf = (qr?: string, mm?: string, camp?: string) =>
      `${qr || '—'}|${mm || '—'}|${camp || '—'}`

    for (const e of events) {
      if (!isCountedView(e)) continue
      const m = (e.metadata ?? {}) as Record<string, unknown>
      const qr = typeof m.qr === 'string' ? m.qr : undefined
      const mm = typeof m.mm === 'string' ? m.mm : undefined
      const camp = typeof m.camp === 'string' ? m.camp : undefined
      if (!qr && !mm && !camp && m.src !== 'qr') continue
      const k = keyOf(qr, mm, camp)
      const row = byKey.get(k) ?? {
        qr: qr || '—',
        mm: mm || '—',
        camp: camp || '—',
        scans: 0,
        leads: 0,
        leadsWithPhone: 0,
        leadRate: 0,
      }
      row.scans += 1
      byKey.set(k, row)
    }

    for (const lead of leads) {
      const mm = lead.micromarket
      if (!mm) continue
      // Attribute each lead once: to the matching placement with the most scans.
      let best: Row | undefined
      for (const row of byKey.values()) {
        if (row.mm === mm && (!best || row.scans > best.scans)) best = row
      }
      if (best) {
        best.leads += 1
        if (lead.phoneNormalized || lead.phone) best.leadsWithPhone += 1
      } else {
        const k = keyOf(undefined, mm, undefined)
        const row = byKey.get(k) ?? {
          qr: '—',
          mm,
          camp: '—',
          scans: 0,
          leads: 0,
          leadsWithPhone: 0,
          leadRate: 0,
        }
        row.leads += 1
        if (lead.phoneNormalized || lead.phone) row.leadsWithPhone += 1
        byKey.set(k, row)
      }
    }

    const placements = [...byKey.values()]
      .map((r) => ({
        ...r,
        leadRate: r.scans > 0 ? Math.round((r.leads / r.scans) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.scans - a.scans)

    return { placements, totalScans: placements.reduce((s, p) => s + p.scans, 0) }
  },
})
