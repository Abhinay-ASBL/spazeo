import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx, MutationCtx } from './_generated/server'

function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) return null
  return await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
}

/** Sales sessions for this customer that were run on a tour the given user owns. */
async function ownedSessionsForCustomer(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  customerId: Id<'customers'>
): Promise<Doc<'salesSessions'>[]> {
  const sessions = await ctx.db
    .query('salesSessions')
    .withIndex('by_customerId', (q) => q.eq('customerId', customerId))
    .collect()

  const owned: Doc<'salesSessions'>[] = []
  for (const s of sessions) {
    const tour = await ctx.db.get(s.tourId)
    if (tour && tour.userId === userId) owned.push(s)
  }
  return owned
}

export const findByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)
    if (!user) return null

    const digits = normalizePhone(args.phone)
    if (digits.length < 7) return null

    const customer = await ctx.db
      .query('customers')
      .withIndex('by_phone', (q) => q.eq('phone', digits))
      .unique()

    if (!customer) return null

    // Only surface visit history from sessions run on tours this user owns —
    // the customer record itself is a shared-by-phone directory entry, but
    // another tenant's visit history/notes must not leak here.
    const sessions = await ownedSessionsForCustomer(ctx, user._id, customer._id)

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
    const user = await getAuthUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const customer = await ctx.db.get(args.customerId)
    if (!customer) throw new Error('Customer not found')

    if (customer.createdBy !== user._id) {
      const owned = await ownedSessionsForCustomer(ctx, user._id, args.customerId)
      if (owned.length === 0) throw new Error('Not authorized')
    }

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
    const user = await getAuthUser(ctx)
    if (!user) return null

    const customer = await ctx.db.get(args.customerId)
    if (!customer) return null

    // Only this user's own sessions with the customer — other tenants'
    // interactions with the same shared-by-phone customer stay private.
    const sessions = await ownedSessionsForCustomer(ctx, user._id, args.customerId)
    if (customer.createdBy !== user._id && sessions.length === 0) return null

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
