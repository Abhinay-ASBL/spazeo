import { v } from 'convex/values'
import { query, action, internalMutation, internalQuery } from './_generated/server'
import { internal as _internal } from './_generated/api'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any
import Stripe from 'stripe'

// Plan limits (matching PRD 5-tier structure)
const PLAN_LIMITS: Record<string, { tours: number; scenesPerTour: number; aiCredits: number }> = {
  free: { tours: 3, scenesPerTour: 10, aiCredits: 3 },
  starter: { tours: 10, scenesPerTour: 25, aiCredits: 5 },
  professional: { tours: -1, scenesPerTour: 50, aiCredits: -1 },
  business: { tours: -1, scenesPerTour: 100, aiCredits: -1 },
  enterprise: { tours: -1, scenesPerTour: -1, aiCredits: -1 },
}

const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? '',
    annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? '',
  },
  professional: {
    monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID ?? '',
    annual: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID ?? '',
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? '',
    annual: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID ?? '',
  },
}

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    return await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .unique()
  },
})

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const activeTours = tours.filter((t) => t.status !== 'archived')

    // Count total scenes
    let totalScenes = 0
    for (const tour of tours) {
      const scenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      totalScenes += scenes.length
    }

    const limits = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free

    return {
      toursCreated: activeTours.length,
      tourLimit: limits.tours,
      totalScenes,
      aiCreditsUsed: user.aiCreditsUsed ?? 0,
      aiCreditLimit: limits.aiCredits,
      plan: user.plan,
    }
  },
})

export const checkLimit = internalQuery({
  args: {
    userId: v.id('users'),
    resource: v.union(v.literal('tour'), v.literal('ai')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) return { allowed: false, reason: 'User not found' }

    const limits = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free

    if (args.resource === 'tour') {
      if (limits.tours === -1) return { allowed: true }

      const tours = await ctx.db
        .query('tours')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .collect()
      const activeTours = tours.filter((t) => t.status !== 'archived')

      if (activeTours.length >= limits.tours) {
        return {
          allowed: false,
          reason: `Tour limit reached (${activeTours.length}/${limits.tours})`,
        }
      }
      return { allowed: true }
    }

    if (args.resource === 'ai') {
      if (limits.aiCredits === -1) return { allowed: true }

      const used = user.aiCreditsUsed ?? 0
      if (used >= limits.aiCredits) {
        return {
          allowed: false,
          reason: `AI credit limit reached (${used}/${limits.aiCredits})`,
        }
      }
      return { allowed: true }
    }

    return { allowed: true }
  },
})

export const syncPlanToUser = internalMutation({
  args: {
    userId: v.id('users'),
    plan: v.union(v.literal('free'), v.literal('starter'), v.literal('professional'), v.literal('business'), v.literal('enterprise')),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { plan: args.plan })
  },
})

export const upsertFromStripe = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    plan: v.union(v.literal('free'), v.literal('starter'), v.literal('professional'), v.literal('business'), v.literal('enterprise')),
    status: v.union(
      v.literal('active'),
      v.literal('canceled'),
      v.literal('past_due'),
      v.literal('trialing'),
      v.literal('incomplete')
    ),
    currentPeriodEnd: v.optional(v.number()),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique()

    const data = {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      plan: args.plan,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return existing._id
    }

    return await ctx.db.insert('subscriptions', data)
  },
})

export const getUserByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_stripeCustomerId', (q) =>
        q.eq('stripeCustomerId', args.stripeCustomerId)
      )
      .unique()
    if (!subscription) return null
    return await ctx.db.get(subscription.userId)
  },
})

export const createCheckoutSession = action({
  args: {
    plan: v.union(v.literal('starter'), v.literal('professional'), v.literal('business')),
    interval: v.union(v.literal('monthly'), v.literal('annual')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })

    // Get or create Stripe customer
    let customerId: string
    const existingSub = await ctx.runQuery(internal.subscriptions.getByUserId, {
      userId: user._id,
    })

    if (existingSub?.stripeCustomerId) {
      customerId = existingSub.stripeCustomerId
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          clerkId: user.clerkId,
          convexUserId: user._id,
        },
      })
      customerId = customer.id
    }

    const priceId = PRICE_IDS[args.plan]?.[args.interval]
    if (!priceId) throw new Error('Invalid plan or interval')

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing?canceled=true`,
      metadata: {
        clerkId: user.clerkId,
        convexUserId: user._id,
        plan: args.plan,
      },
    })

    return { url: session.url }
  },
})

export const createCustomerPortalSession = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const subscription = await ctx.runQuery(internal.subscriptions.getByUserId, {
      userId: user._id,
    })
    if (!subscription?.stripeCustomerId) {
      throw new Error('No billing account found')
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing`,
    })

    return { url: session.url }
  },
})

export const cancel = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const subscription = await ctx.runQuery(internal.subscriptions.getByUserId, {
      userId: user._id,
    })
    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found')
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })

    // Cancel at period end (user keeps access until end of billing period)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
      userId: user._id,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      plan: subscription.plan,
      status: 'canceled',
      currentPeriodEnd: subscription.currentPeriodEnd,
    })

    return { success: true }
  },
})

export const getInvoices = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const subscription = await ctx.runQuery(internal.subscriptions.getByUserId, {
      userId: user._id,
    })
    if (!subscription?.stripeCustomerId) {
      return []
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })

    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 12,
    })

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      date: invoice.created,
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url,
    }))
  },
})

// Internal query used by actions
export const getByUserId = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique()
  },
})
