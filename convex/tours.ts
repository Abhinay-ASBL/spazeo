import { v } from 'convex/values'
import { query, mutation, action, internalQuery, internalMutation } from './_generated/server'
import { internal } from './_generated/api'

const TOUR_LIMITS: Record<string, number> = {
  free: 3,
  starter: 10,
  professional: -1, // unlimited
  business: -1,
  enterprise: -1,
}

// Helper to get the authenticated user
async function getAuthUser(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: any }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user) throw new Error('User not found')
  return user
}

export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal('draft'), v.literal('published'), v.literal('archived'))
    ),
    search: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal('created'),
        v.literal('modified'),
        v.literal('views'),
        v.literal('alpha')
      )
    ),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    let tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    // Filter by status
    if (args.status) {
      tours = tours.filter((t) => t.status === args.status)
    }

    // Filter by search term
    if (args.search) {
      const term = args.search.toLowerCase()
      tours = tours.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term)) ||
          (t.address && t.address.toLowerCase().includes(term))
      )
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      tours = tours.filter(
        (t) => t.tags && args.tags!.some((tag) => t.tags!.includes(tag))
      )
    }

    // Sort
    switch (args.sortBy) {
      case 'views':
        tours.sort((a, b) => b.viewCount - a.viewCount)
        break
      case 'alpha':
        tours.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'modified':
        tours.sort((a, b) => b._creationTime - a._creationTime)
        break
      case 'created':
      default:
        tours.sort((a, b) => b._creationTime - a._creationTime)
        break
    }

    return tours
  },
})

export const getById = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const tour = await ctx.db.get(args.tourId)
    if (!tour) return null

    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const scenesWithHotspots = await Promise.all(
      scenes.map(async (scene) => {
        const hotspots = await ctx.db
          .query('hotspots')
          .withIndex('by_sceneId', (q) => q.eq('sceneId', scene._id))
          .collect()
        return { ...scene, hotspots }
      })
    )

    return {
      ...tour,
      scenes: scenesWithHotspots.sort((a, b) => a.order - b.order),
    }
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const tour = await ctx.db
      .query('tours')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!tour || tour.status !== 'published') return null

    // Check password protection
    if (tour.privacy === 'password_protected') {
      // Return tour without scenes — frontend must verify password first
      return { ...tour, scenes: [], requiresPassword: true }
    }

    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
      .collect()

    const scenesWithHotspots = await Promise.all(
      scenes.map(async (scene) => {
        const hotspots = await ctx.db
          .query('hotspots')
          .withIndex('by_sceneId', (q) => q.eq('sceneId', scene._id))
          .collect()

        const imageUrl = scene.imageStorageId
          ? await ctx.storage.getUrl(scene.imageStorageId)
          : null

        return { ...scene, hotspots, imageUrl }
      })
    )

    return {
      ...tour,
      scenes: scenesWithHotspots.sort((a, b) => a.order - b.order),
      requiresPassword: false,
    }
  },
})

// NOTE: Password verification is now handled by passwordUtils.verifyTourPassword (bcrypt action).
// This query is kept for backward compatibility but returns only a boolean — it does NOT
// compare passwords or return scenes. The public viewer (Plan 02) will call the action instead.
export const verifyTourPassword = query({
  args: {
    slug: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const tour = await ctx.db
      .query('tours')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!tour) return false
    // Plaintext comparison is intentionally removed. Callers should use
    // api.passwordUtils.verifyTourPassword (internalAction) for real verification.
    // Return false to avoid accidentally revealing hashed passwords.
    return false
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    tourType: v.optional(
      v.union(
        v.literal('residential'),
        v.literal('commercial'),
        v.literal('vacation_rental'),
        v.literal('restaurant'),
        v.literal('other')
      )
    ),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    // Enforce plan tour limits
    const limit = TOUR_LIMITS[user.plan] ?? 3
    if (limit !== -1) {
      const existingTours = await ctx.db
        .query('tours')
        .withIndex('by_userId', (q) => q.eq('userId', user._id))
        .collect()
      const activeTours = existingTours.filter((t) => t.status !== 'archived')
      if (activeTours.length >= limit) {
        throw new Error(
          `Tour limit reached. Your ${user.plan} plan allows ${limit} active tours. Upgrade to create more.`
        )
      }
    }

    const slug =
      args.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Date.now().toString(36)

    const tourId = await ctx.db.insert('tours', {
      userId: user._id,
      title: args.title,
      description: args.description,
      slug,
      status: 'draft',
      viewCount: 0,
      tourType: args.tourType,
      address: args.address,
      privacy: 'public',
    })

    // Log activity
    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'tour_created',
      tourId,
      message: `Created tour "${args.title}"`,
    })

    return tourId
  },
})

export const update = mutation({
  args: {
    tourId: v.id('tours'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal('draft'), v.literal('published'), v.literal('archived'))),
    settings: v.optional(
      v.object({
        autoRotate: v.optional(v.boolean()),
        showMiniMap: v.optional(v.boolean()),
        allowFullscreen: v.optional(v.boolean()),
        brandingEnabled: v.optional(v.boolean()),
      })
    ),
    address: v.optional(v.string()),
    tourType: v.optional(
      v.union(
        v.literal('residential'),
        v.literal('commercial'),
        v.literal('vacation_rental'),
        v.literal('restaurant'),
        v.literal('other')
      )
    ),
    privacy: v.optional(
      v.union(v.literal('public'), v.literal('unlisted'), v.literal('password_protected'))
    ),
    password: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    autoplay: v.optional(v.boolean()),
    autoplaySpeed: v.optional(v.number()),
    leadCaptureConfig: v.optional(
      v.object({
        enabled: v.boolean(),
        fields: v.array(v.string()),
        gateBehavior: v.union(
          v.literal('before_tour'),
          v.literal('after_delay'),
          v.literal('optional_sidebar')
        ),
        delaySeconds: v.optional(v.number()),
      })
    ),
    brandingConfig: v.optional(
      v.object({
        logoStorageId: v.optional(v.id('_storage')),
        brandColor: v.optional(v.string()),
        showPoweredBy: v.optional(v.boolean()),
      })
    ),
    seoConfig: v.optional(
      v.object({
        metaTitle: v.optional(v.string()),
        metaDescription: v.optional(v.string()),
        socialImageStorageId: v.optional(v.id('_storage')),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')

    const { tourId, password: _ignoredPassword, ...updates } = args
    // NOTE: `password` is accepted in args for backward compat but is intentionally
    // excluded from DB writes. Use api.tours.setTourPassword to hash and store a password.
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )

    if (updates.status === 'published' && tour.status !== 'published') {
      Object.assign(cleanUpdates, { publishedAt: Date.now() })
    }

    await ctx.db.patch(tourId, cleanUpdates)

    // Log activity
    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'tour_updated',
      tourId: args.tourId,
      message: `Updated tour "${tour.title}"`,
    })
  },
})

export const publish = mutation({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    // Validate tour has scenes
    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()
    if (scenes.length === 0) {
      throw new Error('Cannot publish a tour without scenes')
    }

    // Generate embed code
    const tourUrl = `https://spazeo.io/tour/${tour.slug}`
    const embedCode = `<iframe src="${tourUrl}?embed=true" width="100%" height="600" frameborder="0" allowfullscreen allow="xr-spatial-tracking; gyroscope; accelerometer"></iframe>`

    await ctx.db.patch(args.tourId, {
      status: 'published',
      publishedAt: Date.now(),
      embedCode,
    })

    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'tour_published',
      tourId: args.tourId,
      message: `Published tour "${tour.title}"`,
    })
  },
})

export const unpublish = mutation({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    await ctx.db.patch(args.tourId, { status: 'draft' })
  },
})

export const archive = mutation({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    await ctx.db.patch(args.tourId, { status: 'archived' })

    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'tour_archived',
      tourId: args.tourId,
      message: `Archived tour "${tour.title}"`,
    })
  },
})

export const bulkArchive = mutation({
  args: { tourIds: v.array(v.id('tours')) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    for (const tourId of args.tourIds) {
      const tour = await ctx.db.get(tourId)
      if (tour && tour.userId === user._id) {
        await ctx.db.patch(tourId, { status: 'archived' })
      }
    }
  },
})

export const bulkPublish = mutation({
  args: { tourIds: v.array(v.id('tours')) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    for (const tourId of args.tourIds) {
      const tour = await ctx.db.get(tourId)
      if (!tour || tour.userId !== user._id) continue
      if (tour.status === 'published') continue

      const scenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q: any) => q.eq('tourId', tourId))
        .collect()
      if (scenes.length === 0) continue

      await ctx.db.patch(tourId, { status: 'published', publishedAt: Date.now() })
    }
  },
})

export const bulkDelete = mutation({
  args: { tourIds: v.array(v.id('tours')) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    for (const tourId of args.tourIds) {
      const tour = await ctx.db.get(tourId)
      if (!tour || tour.userId !== user._id) continue

      // Cascade delete scenes and hotspots
      const scenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
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

      // Delete leads
      const leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
        .collect()
      for (const lead of leads) {
        await ctx.db.delete(lead._id)
      }

      // Delete analytics
      const analytics = await ctx.db
        .query('analytics')
        .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
        .collect()
      for (const event of analytics) {
        await ctx.db.delete(event._id)
      }

      await ctx.db.delete(tourId)
    }
  },
})

export const duplicate = mutation({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    // Enforce plan limits
    const limit = TOUR_LIMITS[user.plan] ?? 3
    if (limit !== -1) {
      const existingTours = await ctx.db
        .query('tours')
        .withIndex('by_userId', (q) => q.eq('userId', user._id))
        .collect()
      const activeTours = existingTours.filter((t) => t.status !== 'archived')
      if (activeTours.length >= limit) {
        throw new Error(`Tour limit reached. Upgrade to duplicate more tours.`)
      }
    }

    const newSlug =
      tour.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-copy-' +
      Date.now().toString(36)

    const newTourId = await ctx.db.insert('tours', {
      userId: user._id,
      title: `${tour.title} (Copy)`,
      description: tour.description,
      slug: newSlug,
      status: 'draft',
      viewCount: 0,
      settings: tour.settings,
      tourType: tour.tourType,
      address: tour.address,
      privacy: tour.privacy,
      tags: tour.tags,
      autoplay: tour.autoplay,
      autoplaySpeed: tour.autoplaySpeed,
      leadCaptureConfig: tour.leadCaptureConfig,
      brandingConfig: tour.brandingConfig,
      seoConfig: tour.seoConfig,
    })

    // Clone scenes and hotspots
    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const sceneIdMap = new Map<string, string>()

    for (const scene of scenes) {
      const newSceneId = await ctx.db.insert('scenes', {
        tourId: newTourId,
        title: scene.title,
        imageStorageId: scene.imageStorageId,
        thumbnailStorageId: scene.thumbnailStorageId,
        order: scene.order,
        panoramaType: scene.panoramaType,
        roomType: scene.roomType,
        aiAnalysis: scene.aiAnalysis,
      })
      sceneIdMap.set(scene._id, newSceneId)
    }

    // Clone hotspots with updated scene references
    for (const scene of scenes) {
      const hotspots = await ctx.db
        .query('hotspots')
        .withIndex('by_sceneId', (q) => q.eq('sceneId', scene._id))
        .collect()

      const newSceneId = sceneIdMap.get(scene._id)
      if (!newSceneId) continue

      for (const hotspot of hotspots) {
        const newTargetSceneId = hotspot.targetSceneId
          ? sceneIdMap.get(hotspot.targetSceneId)
          : undefined

        await ctx.db.insert('hotspots', {
          sceneId: newSceneId as any,
          targetSceneId: newTargetSceneId as any,
          type: hotspot.type,
          position: hotspot.position,
          tooltip: hotspot.tooltip,
          icon: hotspot.icon,
          content: hotspot.content,
        })
      }
    }

    // Log activity
    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'tour_duplicated',
      tourId: newTourId,
      message: `Duplicated tour "${tour.title}"`,
    })

    return newTourId
  },
})

export const updateSlug = mutation({
  args: {
    tourId: v.id('tours'),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    // Validate uniqueness
    const existing = await ctx.db
      .query('tours')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (existing && existing._id !== args.tourId) {
      throw new Error('This URL slug is already taken')
    }

    await ctx.db.patch(args.tourId, { slug: args.slug })
  },
})

export const getStats = query({
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

    return {
      total: tours.length,
      draft: tours.filter((t) => t.status === 'draft').length,
      published: tours.filter((t) => t.status === 'published').length,
      archived: tours.filter((t) => t.status === 'archived').length,
    }
  },
})

export const getRecent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(6)

    return tours
  },
})

export const remove = mutation({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
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

    // Delete leads
    const leads = await ctx.db
      .query('leads')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()
    for (const lead of leads) {
      await ctx.db.delete(lead._id)
    }

    // Log activity before deleting the tour
    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'tour_deleted',
      message: `Deleted tour "${tour.title}"`,
    })

    await ctx.db.delete(args.tourId)
  },
})

export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')
  return await ctx.storage.generateUploadUrl()
})

// --- Password hashing support ---

// Returns only the passwordHash field — never exposed to the client.
export const getPasswordHash = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const tour = await ctx.db
      .query('tours')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!tour) return null
    return { passwordHash: tour.passwordHash }
  },
})

// Verifies the tour belongs to the given user — used by setTourPassword action.
export const getTourForOwner = internalQuery({
  args: { tourId: v.id('tours'), userId: v.id('users') },
  handler: async (ctx, args) => {
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== args.userId) return null
    return tour
  },
})

// Writes the hashed password (or clears it) — called only from setTourPassword action.
export const patchTourPassword = internalMutation({
  args: { tourId: v.id('tours'), passwordHash: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tourId, { passwordHash: args.passwordHash })
  },
})

// Public action: hashes the password server-side before storing it.
// This is the canonical write path for tour password protection.
export const setTourPassword = action({
  args: {
    tourId: v.id('tours'),
    password: v.optional(v.string()),
  },
  handler: async (ctx, { tourId, password }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const tour = await ctx.runQuery(internal.tours.getTourForOwner, {
      tourId, userId: user._id,
    })
    if (!tour) throw new Error('Tour not found or not authorized')

    if (password && password.trim().length > 0) {
      const hash = await ctx.runAction(internal.passwordUtils.hashTourPassword, {
        password: password.trim(),
      })
      await ctx.runMutation(internal.tours.patchTourPassword, {
        tourId, passwordHash: hash,
      })
    } else {
      // Clear password protection
      await ctx.runMutation(internal.tours.patchTourPassword, {
        tourId, passwordHash: undefined,
      })
    }
  },
})
