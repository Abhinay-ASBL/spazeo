import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const limit = args.limit ?? 20

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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return 0

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return 0

    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    return unread.filter((n) => !n.read).length
  },
})

export const markRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const notification = await ctx.db.get(args.notificationId)
    if (!notification) throw new Error('Notification not found')

    await ctx.db.patch(args.notificationId, { read: true })
  },
})

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

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
