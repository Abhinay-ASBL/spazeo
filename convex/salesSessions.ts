import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const create = mutation({
  args: {
    tourId: v.id('tours'),
    customerId: v.id('customers'),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    return await ctx.db.insert('salesSessions', {
      tourId: args.tourId,
      customerId: args.customerId,
      salespersonId: user._id,
      sessionId: args.sessionId,
      startedAt: Date.now(),
    })
  },
})

export const end = mutation({
  args: {
    salesSessionId: v.id('salesSessions'),
    interestLevel: v.optional(
      v.union(v.literal('hot'), v.literal('warm'), v.literal('cold'))
    ),
    postTourNote: v.optional(v.string()),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.salesSessionId)
    if (!session) throw new Error('Session not found')

    await ctx.db.patch(args.salesSessionId, {
      endedAt: Date.now(),
      interestLevel: args.interestLevel,
      postTourNote: args.postTourNote,
    })

    if (args.customerName) {
      const customer = await ctx.db.get(session.customerId)
      if (customer && !customer.name) {
        await ctx.db.patch(session.customerId, { name: args.customerName })
      }
    }
  },
})

export const getByTour = query({
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

    const sessions = await ctx.db
      .query('salesSessions')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const enriched = []
    for (const s of sessions) {
      const customer = await ctx.db.get(s.customerId)
      enriched.push({
        ...s,
        customerName: customer?.name ?? 'Unknown',
        customerPhone: customer?.phone ?? '',
      })
    }

    return enriched.sort((a, b) => b.startedAt - a.startedAt)
  },
})

export const getByCustomer = query({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const sessions = await ctx.db
      .query('salesSessions')
      .withIndex('by_customerId', (q) => q.eq('customerId', args.customerId))
      .collect()

    const enriched = []
    for (const s of sessions) {
      const tour = await ctx.db.get(s.tourId)
      enriched.push({
        ...s,
        tourTitle: tour?.title ?? 'Unknown',
        tourSlug: tour?.slug ?? '',
      })
    }

    return enriched.sort((a, b) => b.startedAt - a.startedAt)
  },
})

export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    return await ctx.db
      .query('salesSessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .unique()
  },
})
