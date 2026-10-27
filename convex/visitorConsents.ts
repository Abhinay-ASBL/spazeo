import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { consumeRateLimit } from './rateLimit'

const purposeValidator = v.union(
  v.literal('essential'),
  v.literal('analytics'),
  v.literal('fingerprinting'),
  v.literal('geolocation'),
  v.literal('marketing')
)

const grantItem = v.object({
  purpose: purposeValidator,
  granted: v.boolean(),
})

export const grant = mutation({
  args: {
    sessionId: v.string(),
    policyVersion: v.string(),
    /** Single-purpose write (legacy). Prefer `grants` from the banner. */
    purpose: v.optional(purposeValidator),
    granted: v.optional(v.boolean()),
    grants: v.optional(v.array(grantItem)),
    visitorId: v.optional(v.id('visitors')),
    deviceId: v.optional(v.string()),
    ipHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `consent:session:${args.sessionId}`, {
      windowMs: 60 * 60 * 1000,
      max: 30,
    })

    const items =
      args.grants && args.grants.length > 0
        ? args.grants
        : args.purpose
          ? [{ purpose: args.purpose, granted: args.granted ?? true }]
          : []

    if (items.length === 0) {
      throw new Error('purpose or grants is required')
    }

    const now = Date.now()
    const ids = []
    for (const item of items) {
      ids.push(
        await ctx.db.insert('visitorConsents', {
          visitorId: args.visitorId,
          sessionId: args.sessionId,
          deviceId: args.deviceId,
          purpose: item.purpose,
          granted: item.granted,
          policyVersion: args.policyVersion,
          grantedAt: now,
          ipHash: args.ipHash,
          userAgent: args.userAgent,
        })
      )
    }
    return ids.length === 1 ? ids[0] : ids
  },
})

export const withdraw = mutation({
  args: {
    sessionId: v.string(),
    purpose: purposeValidator,
    visitorId: v.optional(v.id('visitors')),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `consent:session:${args.sessionId}`, {
      windowMs: 60 * 60 * 1000,
      max: 30,
    })

    const now = Date.now()

    // Prefer visitor-scoped active grant; also check session grants
    const sessionRows = await ctx.db
      .query('visitorConsents')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .collect()

    const rows = sessionRows.filter((r) => r.purpose === args.purpose)

    if (args.visitorId !== undefined) {
      const visitorId = args.visitorId
      const visitorRows = await ctx.db
        .query('visitorConsents')
        .withIndex('by_visitorId_purpose', (q) =>
          q.eq('visitorId', visitorId).eq('purpose', args.purpose)
        )
        .collect()
      for (const r of visitorRows) {
        if (!rows.some((x) => x._id === r._id)) rows.push(r)
      }
    }

    const active = rows
      .filter((r) => r.granted && r.withdrawnAt === undefined)
      .sort((a, b) => b.grantedAt - a.grantedAt)

    if (active.length === 0) {
      return null
    }

    await ctx.db.patch(active[0]._id, { withdrawnAt: now, granted: false })
    return active[0]._id
  },
})
