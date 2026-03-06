import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

const consentTypeValidator = v.union(
  v.literal('tos'),
  v.literal('privacy'),
  v.literal('marketing'),
  v.literal('cookies'),
  v.literal('dpdp')
)

export const grant = mutation({
  args: {
    consentType: consentTypeValidator,
    version: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    // Always insert a new record for audit trail
    await ctx.db.insert('consents', {
      userId: user._id,
      consentType: args.consentType,
      version: args.version,
      granted: true,
      timestamp: Date.now(),
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    })
  },
})

export const revoke = mutation({
  args: {
    consentType: consentTypeValidator,
    version: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.insert('consents', {
      userId: user._id,
      consentType: args.consentType,
      version: args.version,
      granted: false,
      timestamp: Date.now(),
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    })
  },
})

// Get the latest consent status for each type
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const allConsents = await ctx.db
      .query('consents')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    // Group by consentType and get the latest for each
    const latestMap = new Map<
      string,
      { consentType: string; version: string; granted: boolean; timestamp: number }
    >()

    for (const consent of allConsents) {
      const existing = latestMap.get(consent.consentType)
      if (!existing || consent.timestamp > existing.timestamp) {
        latestMap.set(consent.consentType, {
          consentType: consent.consentType,
          version: consent.version,
          granted: consent.granted,
          timestamp: consent.timestamp,
        })
      }
    }

    return Array.from(latestMap.values())
  },
})

// Get full consent history for audit purposes
export const getHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const allConsents = await ctx.db
      .query('consents')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    return allConsents.sort((a, b) => b.timestamp - a.timestamp)
  },
})
