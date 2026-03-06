import { v } from 'convex/values'
import { mutation } from './_generated/server'

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
    await ctx.db.insert('contactSubmissions', {
      ...args,
      createdAt: Date.now(),
    })
    return { status: 'submitted' }
  },
})
