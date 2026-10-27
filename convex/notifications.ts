import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    // Client-supplied; clamp so a huge value can't force an unbounded read.
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100)

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit)

    return notifications
  },
})

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return 0

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return 0

    // Capped: unbounded .collect() over a per-user table caused the OOM
    // crash-loop incident (2026-08-26). 1000 most-recent notifications is
    // more than enough for an unread badge count.
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(1000)

    return unread.filter((n) => !n.read).length
  },
})

export const markRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) throw new Error('Not authenticated')

    const notification = await ctx.db.get(args.notificationId)
    if (!notification) throw new Error('Notification not found')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || notification.userId !== user._id) throw new Error('Not authorized')

    await ctx.db.patch(args.notificationId, { read: true })
  },
})

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    // Capped: unbounded .collect() + per-row patch caused the OOM crash-loop
    // incident (2026-08-26). Bound to 1000 most-recent notifications per call.
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(1000)

    for (const notification of unread) {
      if (!notification.read) {
        await ctx.db.patch(notification._id, { read: true })
      }
    }
  },
})

export const create = internalMutation({
  args: {
    userId: v.id('users'),
    type: v.union(
      v.literal('lead_captured'),
      v.literal('tour_milestone'),
      v.literal('ai_completed'),
      v.literal('tour_error'),
      v.literal('weekly_summary')
    ),
    title: v.string(),
    message: v.string(),
    tourId: v.optional(v.id('tours')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('notifications', {
      ...args,
      read: false,
      createdAt: Date.now(),
    })
  },
})
