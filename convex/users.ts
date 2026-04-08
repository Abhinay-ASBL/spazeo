import { v } from 'convex/values'
import { query, mutation, action, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'

export const getByClerkIdInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
  },
})

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
  },
})

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
  },
})

export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      plan: 'free',
      role: 'owner',
      onboardingComplete: false,
      aiCreditsUsed: 0,
    })
  },
})

// Idempotent user creation — called on first Convex query after signup
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()

    if (existing) return existing

    const userId = await ctx.db.insert('users', {
      clerkId: identity.subject,
      email: identity.email ?? '',
      name: identity.name ?? 'User',
      avatarUrl: identity.pictureUrl ?? undefined,
      plan: 'free',
      role: 'owner',
      onboardingComplete: false,
      onboardingStep: 0,
      aiCreditsUsed: 0,
      loginCount: 0,
    })

    return await ctx.db.get(userId)
  },
})

export const completeOnboarding = mutation({
  args: {
    userType: v.union(
      v.literal('agent'),
      v.literal('photographer'),
      v.literal('developer'),
      v.literal('manager'),
      v.literal('other')
    ),
    roleOther: v.optional(v.string()),
    propertyFocus: v.optional(v.array(v.string())),
    cameraType: v.optional(v.string()),
    company: v.optional(v.string()),
    website: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, {
      userType: args.userType,
      roleOther: args.roleOther,
      propertyFocus: args.propertyFocus ?? [],
      cameraType: args.cameraType,
      company: args.company,
      website: args.website,
      country: args.country,
      onboardingComplete: true,
      onboardingStep: 3,
      notificationPreferences: {
        newLeads: true,
        weeklyDigest: true,
        productUpdates: true,
      },
    })
  },
})

// Save individual onboarding step data for persistence
export const saveOnboardingStep = mutation({
  args: {
    step: v.number(),
    userType: v.optional(
      v.union(
        v.literal('agent'),
        v.literal('photographer'),
        v.literal('developer'),
        v.literal('manager'),
        v.literal('other')
      )
    ),
    roleOther: v.optional(v.string()),
    propertyFocus: v.optional(v.array(v.string())),
    cameraType: v.optional(v.string()),
    company: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const updates: Record<string, unknown> = { onboardingStep: args.step }
    if (args.userType !== undefined) updates.userType = args.userType
    if (args.roleOther !== undefined) updates.roleOther = args.roleOther
    if (args.propertyFocus !== undefined) updates.propertyFocus = args.propertyFocus
    if (args.cameraType !== undefined) updates.cameraType = args.cameraType
    if (args.company !== undefined) updates.company = args.company
    if (args.website !== undefined) updates.website = args.website

    await ctx.db.patch(user._id, updates)
  },
})

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    company: v.optional(v.string()),
    website: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    cameraType: v.optional(v.string()),
    userType: v.optional(
      v.union(
        v.literal('agent'),
        v.literal('photographer'),
        v.literal('developer'),
        v.literal('manager'),
        v.literal('other')
      )
    ),
    roleOther: v.optional(v.string()),
    propertyFocus: v.optional(v.array(v.string())),
    onboardingComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const updates: Record<string, unknown> = {}
    if (args.name !== undefined) updates.name = args.name
    if (args.phoneNumber !== undefined) updates.phoneNumber = args.phoneNumber
    if (args.company !== undefined) updates.company = args.company
    if (args.website !== undefined) updates.website = args.website
    if (args.country !== undefined) updates.country = args.country
    if (args.city !== undefined) updates.city = args.city
    if (args.cameraType !== undefined) updates.cameraType = args.cameraType
    if (args.userType !== undefined) updates.userType = args.userType
    if (args.roleOther !== undefined) updates.roleOther = args.roleOther
    if (args.propertyFocus !== undefined) updates.propertyFocus = args.propertyFocus
    if (args.onboardingComplete !== undefined) updates.onboardingComplete = args.onboardingComplete

    await ctx.db.patch(user._id, updates)
  },
})

export const updateNotificationPreferences = mutation({
  args: {
    newLeads: v.boolean(),
    weeklyDigest: v.boolean(),
    productUpdates: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, {
      notificationPreferences: {
        newLeads: args.newLeads,
        weeklyDigest: args.weeklyDigest,
        productUpdates: args.productUpdates,
      },
    })
  },
})

export const generateApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    if (user.plan === 'free' || user.plan === 'starter') {
      throw new Error('API access requires a Professional or higher plan')
    }

    // Generate a random API key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let apiKey = 'spz_'
    for (let i = 0; i < 32; i++) {
      apiKey += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    await ctx.db.patch(user._id, { apiKey })
    return apiKey
  },
})

export const revokeApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, { apiKey: undefined })
  },
})

// SPA-14: Request account deletion with 30-day grace period
export const requestDeletion = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, {
      deletionRequestedAt: Date.now(),
    })
  },
})

// SPA-15: Reactivate account (cancel deletion request)
export const reactivateAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, {
      deletionRequestedAt: undefined,
    })
  },
})

// SPA-14: Internal query to collect all user data for export
export const getAllUserDataInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    if (!user) return null

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const allScenes = []
    const allLeads = []
    const allAnalytics = []
    for (const tour of tours) {
      const scenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      allScenes.push(...scenes)

      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      allLeads.push(...leads)

      const analytics = await ctx.db
        .query('analytics')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      allAnalytics.push(...analytics)
    }

    const consents = await ctx.db
      .query('consents')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    return {
      user: {
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        company: user.company,
        website: user.website,
        country: user.country,
        city: user.city,
        userType: user.userType,
        propertyFocus: user.propertyFocus,
        cameraType: user.cameraType,
        onboardingComplete: user.onboardingComplete,
        createdAt: user._creationTime,
      },
      tours: tours.map((t) => ({
        title: t.title,
        slug: t.slug,
        status: t.status,
        viewCount: t.viewCount,
        description: t.description,
        address: t.address,
        tourType: t.tourType,
        createdAt: t._creationTime,
      })),
      scenes: allScenes.map((s) => ({
        tourId: s.tourId,
        title: s.title,
        order: s.order,
        panoramaType: s.panoramaType,
        roomType: s.roomType,
      })),
      leads: allLeads.map((l) => ({
        tourId: l.tourId,
        name: l.name,
        email: l.email,
        phone: l.phone,
        message: l.message,
        status: l.status,
        createdAt: l._creationTime,
      })),
      analytics: allAnalytics.map((a) => ({
        tourId: a.tourId,
        event: a.event,
        sessionId: a.sessionId,
        timestamp: a.timestamp,
        deviceType: a.deviceType,
        country: a.country,
      })),
      consents: consents.map((c) => ({
        consentType: c.consentType,
        version: c.version,
        granted: c.granted,
        timestamp: c.timestamp,
      })),
    }
  },
})

// SPA-14: Export all user data as JSON (action because it returns large data)
export const exportData = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const data: unknown = await ctx.runQuery(internal.users.getAllUserDataInternal, {
      clerkId: identity.subject,
    })

    if (!data) throw new Error('User not found')

    return JSON.stringify(data, null, 2)
  },
})

// SPA-15: Record failed login attempt
export const recordFailedLogin = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    if (!user) return

    const attempts = (user.failedLoginAttempts ?? 0) + 1
    const updates: Record<string, unknown> = { failedLoginAttempts: attempts }

    // Lock account after 5 failed attempts for 30 minutes
    if (attempts >= 5) {
      updates.lockedUntil = Date.now() + 30 * 60 * 1000
    }

    await ctx.db.patch(user._id, updates)
  },
})

// SPA-15: Reset failed login attempts on successful login
export const resetFailedLogins = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    if (!user) return

    if ((user.failedLoginAttempts ?? 0) > 0 || user.lockedUntil) {
      await ctx.db.patch(user._id, {
        failedLoginAttempts: 0,
        lockedUntil: undefined,
      })
    }
  },
})

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    // Cascade delete: tours → scenes → hotspots
    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    for (const tour of tours) {
      const scenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()

      for (const scene of scenes) {
        const hotspots = await ctx.db
          .query('hotspots')
          .withIndex('by_sceneId', (q) => q.eq('sceneId', scene._id))
          .collect()
        for (const hotspot of hotspots) {
          await ctx.db.delete(hotspot._id)
        }
        if (scene.imageStorageId) {
          await ctx.storage.delete(scene.imageStorageId)
        }
        if (scene.thumbnailStorageId) {
          await ctx.storage.delete(scene.thumbnailStorageId)
        }
        if (scene.stagedImageStorageId) {
          await ctx.storage.delete(scene.stagedImageStorageId)
        }
        await ctx.db.delete(scene._id)
      }

      // Delete leads for this tour
      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      for (const lead of leads) {
        await ctx.db.delete(lead._id)
      }

      // Delete analytics for this tour
      const analytics = await ctx.db
        .query('analytics')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      for (const event of analytics) {
        await ctx.db.delete(event._id)
      }

      // Delete daily analytics for this tour
      const dailyAnalytics = await ctx.db
        .query('dailyAnalytics')
        .withIndex('by_tourId_date', (q) => q.eq('tourId', tour._id))
        .collect()
      for (const da of dailyAnalytics) {
        await ctx.db.delete(da._id)
      }

      // Delete floor plans
      const floorPlans = await ctx.db
        .query('floorPlans')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      for (const fp of floorPlans) {
        await ctx.storage.delete(fp.imageStorageId)
        await ctx.db.delete(fp._id)
      }

      await ctx.db.delete(tour._id)
    }

    // Delete AI jobs
    const aiJobs = await ctx.db
      .query('aiJobs')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
    for (const job of aiJobs) {
      await ctx.db.delete(job._id)
    }

    // Delete subscriptions
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .unique()
    if (subscription) {
      await ctx.db.delete(subscription._id)
    }

    // Delete activity log
    const activities = await ctx.db
      .query('activityLog')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
    for (const activity of activities) {
      await ctx.db.delete(activity._id)
    }

    // Delete team memberships
    const memberships = await ctx.db
      .query('teamMembers')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
    for (const membership of memberships) {
      await ctx.db.delete(membership._id)
    }

    // Delete consents
    const consents = await ctx.db
      .query('consents')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
    for (const consent of consents) {
      await ctx.db.delete(consent._id)
    }

    // Finally delete user
    await ctx.db.delete(user._id)
  },
})

// SPA-25: Onboarding checklist progress
export const getOnboardingProgress = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    // Step 1: Complete your profile
    const profileComplete = user.onboardingComplete === true

    // Step 2: Create your first tour
    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
    const hasFirstTour = tours.length >= 1

    // Step 3: Upload panorama scenes
    let hasScenes = false
    let hasAiAnalysis = false
    let hasPublishedTour = false
    for (const tour of tours) {
      const scenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      if (scenes.length > 0) hasScenes = true
      if (scenes.some((s) => s.aiAnalysis !== undefined)) hasAiAnalysis = true
      if (tour.status === 'published') hasPublishedTour = true
    }

    // Step 6: Get your first view
    let hasFirstView = false
    for (const tour of tours) {
      const event = await ctx.db
        .query('analytics')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .first()
      if (event) {
        hasFirstView = true
        break
      }
    }

    return {
      checklistDismissed: user.checklistDismissed ?? false,
      steps: {
        profileComplete,
        hasFirstTour,
        hasScenes,
        hasAiAnalysis,
        hasPublishedTour,
        hasFirstView,
      },
    }
  },
})

// SPA-25: Dismiss the onboarding checklist
export const dismissChecklist = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, { checklistDismissed: true })
  },
})

// Internal mutation for cron: reset monthly AI credits
export const resetMonthlyCredits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    for (const user of users) {
      if ((user.aiCreditsUsed ?? 0) > 0) {
        await ctx.db.patch(user._id, { aiCreditsUsed: 0 })
      }
    }
  },
})

// Internal mutation: record login from Clerk session.created webhook
export const recordLogin = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    if (!user) return

    await ctx.db.patch(user._id, {
      lastLoginAt: Date.now(),
      loginCount: (user.loginCount ?? 0) + 1,
    })
  },
})

// Internal mutation: delete user from Clerk webhook
export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    if (!user) return

    // Simplified cascade — in production, the full deleteAccount logic would be called
    // For webhook handling, we just mark essential cleanup
    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    for (const tour of tours) {
      const scenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      for (const scene of scenes) {
        const hotspots = await ctx.db
          .query('hotspots')
          .withIndex('by_sceneId', (q) => q.eq('sceneId', scene._id))
          .collect()
        for (const hotspot of hotspots) {
          await ctx.db.delete(hotspot._id)
        }
        await ctx.db.delete(scene._id)
      }
      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      for (const lead of leads) {
        await ctx.db.delete(lead._id)
      }
      await ctx.db.delete(tour._id)
    }

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .unique()
    if (subscription) {
      await ctx.db.delete(subscription._id)
    }

    await ctx.db.delete(user._id)
  },
})

// Phase 4: Increment floor plan extraction usage counter
export const incrementFloorPlanExtractions = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) return
    // Track usage for all plans (including unlimited ones) for analytics
    await ctx.db.patch(args.userId, {
      floorPlanExtractionsUsed: (user.floorPlanExtractionsUsed ?? 0) + 1,
    })
  },
})

// Reset floor plan extraction counter (called by monthly cron or admin)
export const resetFloorPlanExtractions = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, { floorPlanExtractionsUsed: 0 })
  },
})

// Internal: reset extraction counter by email (for CLI/cron use)
export const resetFloorPlanExtractionsInternal = internalMutation({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', args.email!))
        .unique()
      if (user) {
        await ctx.db.patch(user._id, { floorPlanExtractionsUsed: 0 })
        return { reset: true, email: args.email }
      }
      return { reset: false, error: 'User not found' }
    }
    // Reset all users
    const users = await ctx.db.query('users').collect()
    for (const user of users) {
      if ((user.floorPlanExtractionsUsed ?? 0) > 0) {
        await ctx.db.patch(user._id, { floorPlanExtractionsUsed: 0 })
      }
    }
    return { reset: true, count: users.length }
  },
})
