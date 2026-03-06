import { v } from 'convex/values'
import { query } from './_generated/server'

export const searchTours = query({
  args: {
    query: v.string(),
    status: v.optional(
      v.union(v.literal('draft'), v.literal('published'), v.literal('archived'))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    let searchQuery = ctx.db
      .query('tours')
      .withSearchIndex('search_tours', (q) => {
        let search = q.search('title', args.query).eq('userId', user._id)
        if (args.status) {
          search = search.eq('status', args.status)
        }
        return search
      })

    const results = await searchQuery.take(20)
    return results
  },
})
