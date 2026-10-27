import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { consumeRateLimit } from './rateLimit'

export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    teamSize: v.optional(v.string()),
    message: v.string(),
    page: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `contact:email:${args.email.trim().toLowerCase()}`, {
      windowMs: 24 * 60 * 60 * 1000,
      max: 5,
    })
    await consumeRateLimit(ctx, 'contact:global', { windowMs: 60 * 60 * 1000, max: 200 })

    await ctx.db.insert('contactSubmissions', {
      ...args,
      createdAt: Date.now(),
    })
    return { status: 'submitted' }
  },
})
