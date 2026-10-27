import { v } from 'convex/values'
import { mutation, internalMutation } from './_generated/server'
import { consumeRateLimit } from './rateLimit'

const DAY_MS = 24 * 60 * 60 * 1000

export const subscribe = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `newsletter:email:${args.email.trim().toLowerCase()}`, {
      windowMs: DAY_MS,
      max: 5,
    })
    await consumeRateLimit(ctx, 'newsletter:global', { windowMs: 60 * 60 * 1000, max: 300 })

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

// Internal only: a public unsubscribe-by-email let anyone unsubscribe anyone.
// Expose again only behind a signed per-subscriber token.
export const unsubscribe = internalMutation({
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
