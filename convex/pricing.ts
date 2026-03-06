import { v } from 'convex/values'
import { query } from './_generated/server'

export const getPlans = query({
  args: {
    interval: v.optional(v.union(v.literal('monthly'), v.literal('yearly'))),
  },
  handler: async (ctx, args) => {
    const plans = await ctx.db.query('pricingPlans').collect()
    const filtered = args.interval
      ? plans.filter(p => p.interval === args.interval)
      : plans
    return filtered.sort((a, b) => a.order - b.order)
  },
})
