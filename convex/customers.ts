import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

export const findByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const digits = normalizePhone(args.phone)
    if (digits.length < 7) return null

    const customer = await ctx.db
      .query('customers')
      .withIndex('by_phone', (q) => q.eq('phone', digits))
      .unique()

    if (!customer) return null

    const sessions = await ctx.db
      .query('salesSessions')
      .withIndex('by_customerId', (q) => q.eq('customerId', customer._id))
      .collect()

    const tourIds = [...new Set(sessions.map((s) => s.tourId))]
    const tours: Array<{ id: string; title: string }> = []
    for (const tid of tourIds) {
      const t = await ctx.db.get(tid)
      if (t) tours.push({ id: t._id, title: t.title })
    }

    const lastSession = sessions.length > 0
      ? sessions.sort((a, b) => b.startedAt - a.startedAt)[0]
      : null

    return {
      customer,
      visitCount: sessions.length,
      lastVisitAt: lastSession?.startedAt ?? null,
      toursVisited: tours,
    }
  },
})

export const create = mutation({
  args: {
    phone: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const digits = normalizePhone(args.phone)
    if (digits.length < 7) throw new Error('Invalid phone number')

    const existing = await ctx.db
      .query('customers')
      .withIndex('by_phone', (q) => q.eq('phone', digits))
      .unique()

    if (existing) {
      if (args.name && !existing.name) {
        await ctx.db.patch(existing._id, { name: args.name })
      }
      return existing._id
    }

    return await ctx.db.insert('customers', {
      phone: digits,
      name: args.name,
      email: args.email,
      createdBy: user._id,
    })
  },
})

export const update = mutation({
  args: {
    customerId: v.id('customers'),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const customer = await ctx.db.get(args.customerId)
    if (!customer) throw new Error('Customer not found')

    const patch: Record<string, string> = {}
    if (args.name !== undefined) patch.name = args.name
    if (args.email !== undefined) patch.email = args.email

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.customerId, patch)
    }
  },
})

export const getWithHistory = query({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const customer = await ctx.db.get(args.customerId)
    if (!customer) return null

    const sessions = await ctx.db
      .query('salesSessions')
      .withIndex('by_customerId', (q) => q.eq('customerId', customer._id))
      .collect()

    const enriched = []
    for (const s of sessions) {
      const tour = await ctx.db.get(s.tourId)
      enriched.push({
        ...s,
        tourTitle: tour?.title ?? 'Unknown tour',
        tourSlug: tour?.slug ?? '',
      })
    }

    return {
      customer,
      sessions: enriched.sort((a, b) => b.startedAt - a.startedAt),
      totalVisits: sessions.length,
    }
  },
})
