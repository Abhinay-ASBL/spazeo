import { v } from 'convex/values'
import { query, mutation, internalMutation, action, internalQuery } from './_generated/server'
import { internal } from './_generated/api'

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
  },
  handler: async (ctx, args) => {
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
    let events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .order('desc')
      .collect()

    if (args.startDate) {
      events = events.filter((e) => e.timestamp >= args.startDate!)
    }
    if (args.endDate) {
      events = events.filter((e) => e.timestamp <= args.endDate!)
    }
    if (args.limit) {
      events = events.slice(0, args.limit)
    }

    return events
  },
})

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
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
    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const filtered = events.filter(
      (e) =>
        e.event === 'tour_view' &&
        e.timestamp >= args.startDate &&
        e.timestamp <= args.endDate
    )

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
    const identity = await ctx.auth.getUserIdentity()
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
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()

      viewsThisWeek += events.filter(
        (e) => e.event === 'tour_view' && e.timestamp >= oneWeekAgo
      ).length

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
      const events = await ctx.db
        .query('analytics')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()

      const dayEvents = events.filter(
        (e) => e.timestamp >= startOfDay && e.timestamp < endOfDay
      )

      if (dayEvents.length === 0) continue

      const views = dayEvents.filter((e) => e.event === 'tour_view')
      const uniqueSessions = new Set(views.map((e) => e.sessionId))

      // Duration
      const durations = dayEvents.filter((e) => e.duration).map((e) => e.duration!)
      const avgDuration =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0

      // Leads count
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
    const identity = await ctx.auth.getUserIdentity()
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

    // Collect all analytics events for user's tours
    let allEvents: Array<{ event: string; timestamp: number; duration?: number; sessionId: string }> = []
    let totalLeads = 0
    let currentLeads = 0
    let prevLeads = 0

    for (const tour of tours) {
      const events = await ctx.db
        .query('analytics')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
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
    const totalViews = viewEvents.length

    // Viewing hours (from duration field, in seconds)
    const allDurations = allEvents
      .filter((e) => e.duration && e.duration > 0)
      .map((e) => e.duration!)
    const totalViewingSeconds = allDurations.reduce((sum, d) => sum + d, 0)
    const totalViewingHours = Math.floor(totalViewingSeconds / 3600)
    const totalViewingMinutes = Math.floor((totalViewingSeconds % 3600) / 60)

    // Unique visitors — distinct sessionIds across all view events
    const totalUniqueVisitors = new Set(viewEvents.map((e) => e.sessionId)).size

    // Avg scene time — average duration in seconds across all events with a duration
    const durationEvents = allEvents
      .filter((e) => e.duration && e.duration > 0)
      .map((e) => e.duration!)
    const avgSceneTime =
      durationEvents.length > 0
        ? Math.round(durationEvents.reduce((sum, d) => sum + d, 0) / durationEvents.length)
        : 0

    const currentDurations = allEvents
      .filter((e) => e.duration && e.duration > 0 && e.timestamp >= periodStart)
      .map((e) => e.duration!)
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
      totalLeads,
      totalUniqueVisitors,
      avgSceneTime,
      totalViewingHours,
      totalViewingMinutes,
      completedAiJobs,
      topTour,
      plan: user.plan,
      aiCreditsUsed: user.aiCreditsUsed ?? 0,
      trends: {
        tours: calcTrend(currentTours, prevTours),
        views: calcTrend(currentViews, prevViews),
        leads: calcTrend(currentLeads, prevLeads),
        viewingTime: calcTrend(currentViewingSeconds, prevViewingSeconds),
        aiJobs: calcTrend(currentAiJobs, prevAiJobs),
      },
      conversionRate: totalViews > 0 ? Math.round((totalLeads / totalViews) * 100) : 0,
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
    let events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    let events: any[]
    if (args.tourId) {
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
    const identity = await ctx.auth.getUserIdentity()
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
      const events = await ctx.db
        .query('analytics')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()

      const periodEvents = periodStart
        ? events.filter((e) => e.timestamp >= periodStart)
        : events

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
