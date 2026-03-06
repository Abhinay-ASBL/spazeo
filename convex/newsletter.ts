import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const subscribe = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already subscribed
    const existing = await ctx.db
      .query('newsletterSubscriptions')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()

    if (existing) {
      if (existing.unsubscribedAt) {
        // Re-subscribe
        await ctx.db.patch(existing._id, {
          subscribedAt: Date.now(),
          unsubscribedAt: undefined,
          confirmed: false,
        })
        return { status: 'resubscribed' }
      }
      return { status: 'already_subscribed' }
    }

    await ctx.db.insert('newsletterSubscriptions', {
      email: args.email,
      subscribedAt: Date.now(),
      confirmed: false,
      source: args.source,
    })

    return { status: 'subscribed' }
  },
})

export const unsubscribe = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query('newsletterSubscriptions')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()

    if (sub) {
      await ctx.db.patch(sub._id, { unsubscribedAt: Date.now() })
    }
    return { status: 'unsubscribed' }
  },
})
