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

    const events = args.limit ? await query.take(args.limit) : await query.collect()

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
      .collect()

    const filtered = events.filter((e) => e.event === 'tour_view')

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
  args: { tourId: v.id('tours') },
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
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

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
  args: { tourId: v.id('tours') },
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

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const views = events.filter((e) => e.event === 'tour_view')
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
  args: { tourId: v.id('tours') },
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

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const views = events.filter((e) => e.event === 'tour_view')

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
  args: { tourId: v.id('tours') },
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

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const tourViews = events.filter((e) => e.event === 'tour_view')
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
  args: { tourId: v.id('tours') },
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

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const totalViews = events.filter((e) => e.event === 'tour_view').length
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
        .collect()

      viewsThisWeek += events.filter((e) => e.event === 'tour_view').length

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

export const rollupDaily = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    const startOfDay = new Date(dateStr + 'T00:00:00Z').getTime()
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000

    // Get all published tours
    const tours = await ctx.db
      .query('tours')
      .withIndex('by_status', (q) => q.eq('status', 'published'))
      .collect()

    for (const tour of tours) {
      const dayEvents = await ctx.db
        .query('analytics')
        .withIndex('by_tourId_timestamp', (q) =>
          q.eq('tourId', tour._id).gte('timestamp', startOfDay).lt('timestamp', endOfDay)
        )
        .collect()

      if (dayEvents.length === 0) continue

      const views = dayEvents.filter((e) => e.event === 'tour_view')
      const uniqueSessions = new Set(views.map((e) => e.sessionId))

      // Duration
      const durations = dayEvents.filter((e) => e.duration).map((e) => e.duration!)
      const avgDuration =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0

      // Leads count — bounded to yesterday's tours only, `leads` has no timestamp
      // index so this stays scoped per-tour rather than a full-table scan.
      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      const dayLeads = leads.filter(
        (l) => l._creationTime >= startOfDay && l._creationTime < endOfDay
      )

      // Scene views
      const sceneEvents = dayEvents.filter((e) => e.event === 'scene_view' && e.sceneId)
      const sceneViews: Record<string, number> = {}
      for (const e of sceneEvents) {
        if (e.sceneId) {
          const id = e.sceneId as string
          sceneViews[id] = (sceneViews[id] ?? 0) + 1
        }
      }

      // Device breakdown
      const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 }
      for (const v of views) {
        const device = v.deviceType ?? 'desktop'
        if (device in deviceBreakdown) {
          deviceBreakdown[device as keyof typeof deviceBreakdown]++
        }
      }

      // Top countries
      const countryMap: Record<string, number> = {}
      for (const v of views) {
        if (v.country) {
          countryMap[v.country] = (countryMap[v.country] ?? 0) + 1
        }
      }

      // Best-effort identity rollups when visitorId is present on events
      const visitorIds = [
        ...new Set(
          dayEvents
            .map((e) => e.visitorId)
            .filter((id): id is NonNullable<typeof id> => id != null)
        ),
      ]
      let uniqueVisitorsVerified = 0
      let uniqueDevices = 0
      let returningVisitors = 0
      if (visitorIds.length > 0) {
        const visitorDocs = await Promise.all(visitorIds.map((id) => ctx.db.get(id)))
        const present = visitorDocs.filter(
          (doc): doc is NonNullable<typeof doc> =>
            doc != null && doc.mergedInto === undefined
        )
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
        views: views.length,
        uniqueVisitors: uniqueSessions.size,
        avgDuration,
        leadsCount: dayLeads.length,
        sceneViews,
        deviceBreakdown,
        topCountries: countryMap,
        uniqueVisitorsVerified,
        uniqueDevices,
        returningVisitors,
      }

      if (existing) {
        await ctx.db.patch(existing._id, data)
      } else {
        await ctx.db.insert('dailyAnalytics', data)
      }
    }
  },
})

export const getDashboardOverview = query({
  args: {
    period: v.optional(v.union(v.literal('7d'), v.literal('30d'), v.literal('90d'))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    const periodDays = args.period === '7d' ? 7 : args.period === '90d' ? 90 : 30
    const now = Date.now()
    const periodStart = now - periodDays * 24 * 60 * 60 * 1000
    const prevPeriodStart = periodStart - periodDays * 24 * 60 * 60 * 1000

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const totalTours = tours.length
    const publishedTours = tours.filter((t) => t.status === 'published').length

    // Bounded scan: only events since prevPeriodStart (indexed range), not full history.
    // totalViews comes from the denormalized tour.viewCount instead of a full scan.
    let allEvents: Array<{
      event: string
      timestamp: number
      duration?: number
      sessionId: string
      visitorId?: Id<'visitors'>
    }> = []
    let totalLeads = 0
    let currentLeads = 0
    let prevLeads = 0

    for (const tour of tours) {
      const events = await ctx.db
        .query('analytics')
        .withIndex('by_tourId_timestamp', (q) =>
          q.eq('tourId', tour._id).gte('timestamp', prevPeriodStart)
        )
        .collect()
      allEvents = allEvents.concat(events)

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

    // Views
    const viewEvents = allEvents.filter((e) => e.event === 'tour_view')
    const currentViews = viewEvents.filter((e) => e.timestamp >= periodStart).length
    const prevViews = viewEvents.filter(
      (e) => e.timestamp >= prevPeriodStart && e.timestamp < periodStart
    ).length
    // All-time total comes from the denormalized counter, not the (now window-bounded) events.
    const totalViews = tours.reduce((sum, t) => sum + t.viewCount, 0)

    // Viewing hours (from duration field, in seconds) — bounded to the 2x-period window
    const allDurations = allEvents
      .filter((e) => e.duration && e.duration > 0)
      .map((e) => e.duration!)
    const totalViewingSeconds = allDurations.reduce((sum, d) => sum + d, 0)
    const totalViewingHours = Math.floor(totalViewingSeconds / 3600)
    const totalViewingMinutes = Math.floor((totalViewingSeconds % 3600) / 60)

    // Sessions in the selected period (not people — see identity rollup below)
    const periodViewEvents = viewEvents.filter((e) => e.timestamp >= periodStart)
    const periodSessions = new Set(periodViewEvents.map((e) => e.sessionId)).size
    const totalUniqueVisitors = periodSessions

    const periodEvents = allEvents.filter((e) => e.timestamp >= periodStart)
    const visitorIds = [
      ...new Set(
        periodEvents
          .map((e) => e.visitorId)
          .filter((id): id is Id<'visitors'> => id != null)
      ),
    ]
    const visitorDocs =
      visitorIds.length > 0
        ? await Promise.all(visitorIds.map((id) => ctx.db.get(id)))
        : []
    const people = summarizeVisitorDocs(visitorDocs, periodSessions)
    const liveVisitorIds = visitorDocs
      .filter((d): d is Doc<'visitors'> => d != null && d.mergedInto === undefined)
      .map((d) => d._id)
    const uniqueDevices = await countDistinctDeviceIds(ctx, liveVisitorIds)

    // Avg scene time in the selected period
    const currentDurations = allEvents
      .filter((e) => e.duration && e.duration > 0 && e.timestamp >= periodStart)
      .map((e) => e.duration!)
    const avgSceneTime =
      currentDurations.length > 0
        ? Math.round(
            currentDurations.reduce((sum, d) => sum + d, 0) / currentDurations.length
          )
        : 0
    const currentViewingSeconds = currentDurations.reduce((sum, d) => sum + d, 0)
    const prevDurations = allEvents
      .filter(
        (e) =>
          e.duration && e.duration > 0 &&
          e.timestamp >= prevPeriodStart && e.timestamp < periodStart
      )
      .map((e) => e.duration!)
    const prevViewingSeconds = prevDurations.reduce((sum, d) => sum + d, 0)

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
      knownContacts: people.uniqueVisitorsIdentified,
      returningVisitors: people.returningVisitors,
      hasVisitorIds: people.hasVisitorIds,
      trends: {
        tours: calcTrend(currentTours, prevTours),
        views: calcTrend(currentViews, prevViews),
        leads: calcTrend(currentLeads, prevLeads),
        viewingTime: calcTrend(currentViewingSeconds, prevViewingSeconds),
        aiJobs: calcTrend(currentAiJobs, prevAiJobs),
      },
      conversionRate:
        currentViews > 0 ? Math.round((currentLeads / currentViews) * 100) : 0,
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
      .collect()
  },
})

export const getAllEventsInternal = internalQuery({
  args: { clerkId: v.string() },
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

    const allEvents = await Promise.all(
      tours.map((tour) =>
        ctx.db
          .query('analytics')
          .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
          .collect()
      )
    )

    return allEvents.flat().sort((a, b) => b.timestamp - a.timestamp)
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

    let events: any[]
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
      })
      // Apply date filters client-side for the all-events case
      if (args.startDate) {
        events = events.filter((e: any) => e.timestamp >= args.startDate!)
      }
      if (args.endDate) {
        events = events.filter((e: any) => e.timestamp <= args.endDate!)
      }
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
    const rows = events.map((event: any) => [
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
    period: v.optional(v.union(v.literal('7d'), v.literal('30d'), v.literal('90d'), v.literal('all'))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const periodDays =
      args.period === '7d' ? 7 : args.period === '90d' ? 90 : args.period === 'all' ? null : 30
    const periodStart = periodDays ? Date.now() - periodDays * 24 * 60 * 60 * 1000 : 0

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const results = []

    for (const tour of tours) {
      const periodEvents = await ctx.db
        .query('analytics')
        .withIndex('by_tourId_timestamp', (q) =>
          q.eq('tourId', tour._id).gte('timestamp', periodStart || -Infinity)
        )
        .collect()

      const views = periodEvents.filter((e) => e.event === 'tour_view').length
      const uniqueSessions = new Set(
        periodEvents.filter((e) => e.event === 'tour_view').map((e) => e.sessionId)
      ).size

      const durations = periodEvents.filter((e) => e.duration && e.duration > 0).map((e) => e.duration!)
      const avgDuration =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0

      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      const periodLeads = periodStart
        ? leads.filter((l) => l._creationTime >= periodStart)
        : leads

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
        visitorId: args.visitorId,
        variantKey: e.variantKey,
        timeOfDay: e.timeOfDay,
        timestamp: e.timestamp ?? now,
      })
      if (e.event === 'tour_view') tourViewEmitted = true
    }
    if (tourViewEmitted) {
      const tour = await ctx.db.get(args.tourId)
      if (tour) {
        await ctx.db.patch(args.tourId, { viewCount: tour.viewCount + 1 })
      }
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
  args: { tourId: v.id('tours'), limit: v.optional(v.number()) },
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
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

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
  args: { sceneId: v.id('scenes') },
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

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', scene.tourId))
      .collect()

    const YAW_BINS = 36 // 10° each over 360°
    const PITCH_BINS = 9 // 20° each over ±90° => 180°
    const grid: number[][] = Array.from({ length: PITCH_BINS }, () =>
      Array.from({ length: YAW_BINS }, () => 0)
    )
    let total = 0
    for (const e of events) {
      if (e.event !== 'view_direction') continue
      if (e.sceneId !== args.sceneId) continue
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
    }
    return { grid, total, yawBins: YAW_BINS, pitchBins: PITCH_BINS }
  },
})

export const getHotspotClickCounts = query({
  args: { tourId: v.id('tours') },
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

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()
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
  args: { tourId: v.id('tours') },
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

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

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
  args: { tourId: v.id('tours') },
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

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

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
  args: { tourId: v.id('tours') },
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

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const leads = await ctx.db
      .query('leads')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    type Row = {
      qr: string
      mm: string
      camp: string
      scans: number
      leads: number
      verifiedLeads: number
      leadRate: number
    }
    const byKey = new Map<string, Row>()

    const keyOf = (qr?: string, mm?: string, camp?: string) =>
      `${qr || '—'}|${mm || '—'}|${camp || '—'}`

    for (const e of events) {
      if (e.event !== 'tour_view') continue
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
        verifiedLeads: 0,
        leadRate: 0,
      }
      row.scans += 1
      byKey.set(k, row)
    }

    for (const lead of leads) {
      const mm = lead.micromarket
      if (!mm) continue
      let matched = false
      for (const row of byKey.values()) {
        if (row.mm === mm) {
          row.leads += 1
          if (lead.phoneVerified) row.verifiedLeads += 1
          matched = true
        }
      }
      if (!matched) {
        const k = keyOf(undefined, mm, undefined)
        const row = byKey.get(k) ?? {
          qr: '—',
          mm,
          camp: '—',
          scans: 0,
          leads: 0,
          verifiedLeads: 0,
          leadRate: 0,
        }
        row.leads += 1
        if (lead.phoneVerified) row.verifiedLeads += 1
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
