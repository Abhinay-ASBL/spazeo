import { v } from 'convex/values'
import {
  query,
  mutation,
  action,
  internalQuery,
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from './_generated/server'
import { internal } from './_generated/api'
import { Id, Doc } from './_generated/dataModel'
import { deleteSceneFileIfUnused, purgeDeletedScene } from './scenes'

// spazeo.io DNS isn't live yet — fall back to the actual deployed URL so links aren't dead.
const SITE_URL = process.env.SITE_URL ?? 'https://spazeo.vercel.app'

const TOUR_LIMITS: Record<string, number> = {
  free: 3,
  starter: 10,
  professional: -1, // unlimited
  business: -1,
  enterprise: -1,
}

async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) throw new Error('Not authenticated')

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user) throw new Error('User not found')
  return user
}

/**
 * Unlock token for password-protected tours: SHA-256 of tourId + bcrypt hash.
 * The hash never leaves the server, so clients can't forge it; changing the
 * password invalidates every issued token.
 */
async function tourUnlockToken(tourId: string, passwordHash: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${tourId}:${passwordHash}`)
  )
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** True when the signed-in caller owns this tour (no throw for anonymous callers). */
async function isTourOwner(ctx: QueryCtx, tour: Doc<'tours'>) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) return false
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
  return !!user && user._id === tour.userId
}

/** Public read gate: published (and unlocked when password-protected), or the owner. */
async function canViewTour(ctx: QueryCtx, tour: Doc<'tours'>, unlockToken?: string) {
  if (tour.status === 'published') {
    if (tour.privacy !== 'password_protected') return true
    if (
      unlockToken &&
      tour.passwordHash &&
      unlockToken === (await tourUnlockToken(tour._id, tour.passwordHash))
    ) {
      return true
    }
  }
  return isTourOwner(ctx, tour)
}

const DELETE_BATCH = 1000
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Deletes a tour and every row/file that hangs off it. Used by remove,
 * bulkDelete and account deletion. Child tables are deleted in bounded batches.
 */
export async function deleteTourCascade(ctx: MutationCtx, tourId: Id<'tours'>): Promise<void> {
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
    // Duplicated tours share scene files, so only delete files nothing else uses.
    if (scene.imageStorageId) {
      await deleteSceneFileIfUnused(ctx, scene.imageStorageId, scene._id)
    }
    if (scene.thumbnailStorageId) {
      await deleteSceneFileIfUnused(ctx, scene.thumbnailStorageId, scene._id)
    }
    if (scene.stagedImageStorageId) {
      await ctx.storage.delete(scene.stagedImageStorageId)
    }
    await ctx.db.delete(scene._id)
  }

  const trashedScenes = await ctx.db
    .query('deletedScenes')
    .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
    .collect()
  for (const trash of trashedScenes) await purgeDeletedScene(ctx, trash)

  const leads = await ctx.db
    .query('leads')
    .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
    .collect()
  for (const lead of leads) {
    await ctx.db.delete(lead._id)
  }

  while (true) {
    const batch = await ctx.db
      .query('notifications')
      .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
      .take(DELETE_BATCH)
    for (const row of batch) await ctx.db.delete(row._id)
    if (batch.length < DELETE_BATCH) break
  }

  while (true) {
    const batch = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
      .take(DELETE_BATCH)
    for (const row of batch) await ctx.db.delete(row._id)
    if (batch.length < DELETE_BATCH) break
  }

  while (true) {
    const batch = await ctx.db
      .query('dailyAnalytics')
      .withIndex('by_tourId_date', (q) => q.eq('tourId', tourId))
      .take(DELETE_BATCH)
    for (const row of batch) await ctx.db.delete(row._id)
    if (batch.length < DELETE_BATCH) break
  }

  while (true) {
    const batch = await ctx.db
      .query('aiJobs')
      .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
      .take(DELETE_BATCH)
    for (const row of batch) await ctx.db.delete(row._id)
    if (batch.length < DELETE_BATCH) break
  }

  while (true) {
    const batch = await ctx.db
      .query('reconstructionJobs')
      .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
      .take(DELETE_BATCH)
    for (const row of batch) await ctx.db.delete(row._id)
    if (batch.length < DELETE_BATCH) break
  }

  while (true) {
    const batch = await ctx.db
      .query('salesSessions')
      .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
      .take(DELETE_BATCH)
    for (const row of batch) await ctx.db.delete(row._id)
    if (batch.length < DELETE_BATCH) break
  }

  while (true) {
    const batch = await ctx.db
      .query('furnishedRooms')
      .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
      .take(DELETE_BATCH)
    for (const room of batch) {
      const placed = await ctx.db
        .query('placedFurniture')
        .withIndex('by_furnishedRoomId', (q) => q.eq('furnishedRoomId', room._id))
        .collect()
      for (const item of placed) await ctx.db.delete(item._id)
      await ctx.db.delete(room._id)
    }
    if (batch.length < DELETE_BATCH) break
  }

  while (true) {
    const batch = await ctx.db
      .query('floorPlans')
      .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
      .take(DELETE_BATCH)
    for (const fp of batch) {
      await ctx.storage.delete(fp.imageStorageId)
      await ctx.db.delete(fp._id)
    }
    if (batch.length < DELETE_BATCH) break
  }

  await ctx.db.delete(tourId)
}

/** Throws when the user is already at their plan's active (non-archived) tour limit. */
async function assertTourLimit(
  ctx: QueryCtx | MutationCtx,
  user: { _id: Id<'users'>; plan: string }
) {
  const limit = TOUR_LIMITS[user.plan] ?? 3
  if (limit === -1) return
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

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('published'),
        v.literal('archived'),
        v.literal('deleted')
      )
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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
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

    if (args.status === 'deleted') {
      tours = tours.filter((t) => t.deletedAt)
    } else {
      tours = tours.filter((t) => !t.deletedAt)
      if (args.status) tours = tours.filter((t) => t.status === args.status)
    }

    if (args.search) {
      const term = args.search.toLowerCase()
      tours = tours.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term)) ||
          (t.address && t.address.toLowerCase().includes(term))
      )
    }

    if (args.tags && args.tags.length > 0) {
      tours = tours.filter(
        (t) => t.tags && args.tags!.some((tag) => t.tags!.includes(tag))
      )
    }

    switch (args.sortBy) {
      case 'views':
        tours.sort((a, b) => b.viewCount - a.viewCount)
        break
      case 'alpha':
        tours.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'modified':
        tours.sort(
          (a, b) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime)
        )
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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const tour = await ctx.db.get(args.tourId)
    if (!tour) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || tour.userId !== user._id) return null

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
    const tourDoc = await ctx.db
      .query('tours')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!tourDoc || tourDoc.status !== 'published') return null
    // Never ship the bcrypt hash to public callers.
    const { passwordHash: _passwordHash, ...tour } = tourDoc

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
        const rawHotspots = await ctx.db
          .query('hotspots')
          .withIndex('by_sceneId', (q) => q.eq('sceneId', scene._id))
          .collect()
        const hotspots = await Promise.all(
          rawHotspots.map(async (h) => ({
            ...h,
            imageUrl: h.imageStorageId ? await ctx.storage.getUrl(h.imageStorageId) : undefined,
          }))
        )

        const imageUrl = scene.imageStorageId
          ? await ctx.storage.getUrl(scene.imageStorageId)
          : null

        return { ...scene, hotspots, imageUrl }
      })
    )

    const resolvedLogoUrl = tour.brandingConfig?.logoUrl
      ?? (tour.brandingConfig?.logoStorageId
        ? await ctx.storage.getUrl(tour.brandingConfig.logoStorageId)
        : null)

    const masterPlanUrl = tour.masterPlanStorageId
      ? await ctx.storage.getUrl(tour.masterPlanStorageId)
      : null

    return {
      ...tour,
      brandingConfig: tour.brandingConfig
        ? { ...tour.brandingConfig, logoUrl: resolvedLogoUrl }
        : undefined,
      masterPlanUrl,
      masterPlanMapping: tour.masterPlanMapping ?? null,
      scenes: scenesWithHotspots.sort((a, b) => a.order - b.order),
      requiresPassword: false,
    }
  },
})

// Public query returning full scene data. Password-protected tours require the
// unlockToken returned by verifyPassword, or the signed-in tour owner.
export const getBySlugWithScenes = query({
  args: { slug: v.string(), unlockToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tourDoc = await ctx.db
      .query('tours')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!tourDoc || tourDoc.status !== 'published') return null
    // Never ship the bcrypt hash to public callers.
    const { passwordHash: _passwordHash, ...tour } = tourDoc

    if (tour.privacy === 'password_protected') {
      const tokenOk =
        !!args.unlockToken &&
        !!tourDoc.passwordHash &&
        args.unlockToken === (await tourUnlockToken(tourDoc._id, tourDoc.passwordHash))
      let isOwner = false
      if (!tokenOk) {
        const identity = await ctx.auth.getUserIdentity()
        if (identity) {
          const user = await ctx.db
            .query('users')
            .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
            .unique()
          isOwner = !!user && user._id === tour.userId
        }
      }
      if (!tokenOk && !isOwner) return { ...tour, scenes: [], requiresPassword: true }
    }

    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
      .collect()

    const scenesWithHotspots = await Promise.all(
      scenes.map(async (scene) => {
        const rawHotspots = await ctx.db
          .query('hotspots')
          .withIndex('by_sceneId', (q) => q.eq('sceneId', scene._id))
          .collect()
        const hotspots = await Promise.all(
          rawHotspots.map(async (h) => ({
            ...h,
            imageUrl: h.imageStorageId ? await ctx.storage.getUrl(h.imageStorageId) : undefined,
          }))
        )
        const imageUrl = scene.imageStorageId
          ? await ctx.storage.getUrl(scene.imageStorageId)
          : null
        return { ...scene, hotspots, imageUrl }
      })
    )

    const resolvedLogoUrl = tour.brandingConfig?.logoUrl
      ?? (tour.brandingConfig?.logoStorageId
        ? await ctx.storage.getUrl(tour.brandingConfig.logoStorageId)
        : null)

    const masterPlanUrl = tour.masterPlanStorageId
      ? await ctx.storage.getUrl(tour.masterPlanStorageId)
      : null

    return {
      ...tour,
      brandingConfig: tour.brandingConfig
        ? { ...tour.brandingConfig, logoUrl: resolvedLogoUrl }
        : undefined,
      masterPlanUrl,
      masterPlanMapping: tour.masterPlanMapping ?? null,
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
          v.literal('after_scenes'),
          v.literal('optional_sidebar')
        ),
        delaySeconds: v.optional(v.number()),
        afterScenes: v.optional(v.number()),
      })
    ),
    brandingConfig: v.optional(
      v.object({
        logoStorageId: v.optional(v.id('_storage')),
        logoUrl: v.optional(v.string()),
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
    if (tour.userId !== user._id) throw new Error('Not authorized')
    if (tour.deletedAt) throw new Error('Tour is deleted. Restore it first.')

    const { tourId, password: _ignoredPassword, ...updates } = args
    // NOTE: `password` is accepted in args for backward compat but is intentionally
    // excluded from DB writes. Use api.tours.setTourPassword to hash and store a password.
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )

    // Un-archiving re-occupies a plan slot.
    if (tour.status === 'archived' && updates.status && updates.status !== 'archived') {
      await assertTourLimit(ctx, user)
    }

    if (updates.status === 'published' && tour.status !== 'published') {
      const firstScene = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
        .first()
      if (!firstScene) throw new Error('Cannot publish a tour without scenes')
      Object.assign(cleanUpdates, { publishedAt: Date.now() })
    }

    await ctx.db.patch(tourId, { ...cleanUpdates, updatedAt: Date.now() })

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
    if (tour.deletedAt) throw new Error('Tour is deleted. Restore it first.')

    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()
    if (scenes.length === 0) {
      throw new Error('Cannot publish a tour without scenes')
    }
    if (tour.status === 'archived') await assertTourLimit(ctx, user)

    const tourUrl = `${SITE_URL}/tour/${tour.slug}`
    const embedCode = `<iframe src="${tourUrl}?embed=true" width="100%" height="600" frameborder="0" allowfullscreen allow="xr-spatial-tracking; gyroscope; accelerometer"></iframe>`

    await ctx.db.patch(args.tourId, {
      status: 'published',
      publishedAt: Date.now(),
      updatedAt: Date.now(),
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
    if (tour.deletedAt) throw new Error('Tour is deleted. Restore it first.')
    if (tour.status === 'archived') await assertTourLimit(ctx, user)

    await ctx.db.patch(args.tourId, { status: 'draft', updatedAt: Date.now() })
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
      if (!tour || tour.userId !== user._id || tour.deletedAt) continue
      if (tour.status === 'published') continue

      const scenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
        .collect()
      if (scenes.length === 0) continue
      if (tour.status === 'archived') await assertTourLimit(ctx, user)

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
      if (!tour || tour.userId !== user._id || tour.deletedAt) continue
      await ctx.db.patch(tourId, { deletedAt: Date.now(), status: 'archived' })
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
      // Same owner, so carrying the hash over keeps the copy openable.
      passwordHash: tour.passwordHash,
      tags: tour.tags,
      autoplay: tour.autoplay,
      autoplaySpeed: tour.autoplaySpeed,
      leadCaptureConfig: tour.leadCaptureConfig,
      brandingConfig: tour.brandingConfig,
      seoConfig: tour.seoConfig,
    })

    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const sceneIdMap = new Map<Id<'scenes'>, Id<'scenes'>>()

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

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, _creationTime, sceneId, targetSceneId, ...rest } = hotspot
        await ctx.db.insert('hotspots', {
          ...rest,
          sceneId: newSceneId,
          targetSceneId: newTargetSceneId,
        })
      }
    }

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
    if (!/^[a-z0-9-]+$/.test(args.slug)) {
      throw new Error('Slug may only contain lowercase letters, numbers and hyphens')
    }

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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    const allTours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
    const tours = allTours.filter((t) => !t.deletedAt)

    return {
      deleted: allTours.length - tours.length,
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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
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
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
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

    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'tour_deleted',
      message: `Deleted tour "${tour.title}"`,
    })

    // Soft delete: hidden from the dashboard and offline (archived); purged after 30 days.
    await ctx.db.patch(args.tourId, { deletedAt: Date.now(), status: 'archived' })
  },
})

/** Undo remove. The tour comes back archived; the owner republishes it. */
export const restore = mutation({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    await ctx.db.patch(args.tourId, { deletedAt: undefined, updatedAt: Date.now() })
  },
})

/** Cron: permanently delete tours and scenes that have been in the trash for 30 days. */
export const purgeExpiredTrash = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - TRASH_RETENTION_MS
    // ponytail: a few tours per run keeps the cascade inside mutation limits; more wait for tomorrow.
    const tours = await ctx.db
      .query('tours')
      .withIndex('by_deletedAt', (q) => q.gt('deletedAt', 0).lt('deletedAt', cutoff))
      .take(5)
    for (const tour of tours) await deleteTourCascade(ctx, tour._id)

    const scenes = await ctx.db
      .query('deletedScenes')
      .withIndex('by_deletedAt', (q) => q.lt('deletedAt', cutoff))
      .take(100)
    for (const trash of scenes) await purgeDeletedScene(ctx, trash)
  },
})

export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity().catch(() => null)
  if (!identity) throw new Error('Not authenticated')
  return await ctx.storage.generateUploadUrl()
})


/** Attach or clear a site master plan image for a tour. */
export const setMasterPlan = mutation({
  args: {
    tourId: v.id('tours'),
    storageId: v.union(v.id('_storage'), v.null()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)
    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    if (args.storageId === null) {
      await ctx.db.patch(args.tourId, {
        masterPlanStorageId: undefined,
        masterPlanMapping: undefined,
      })
    } else {
      await ctx.db.patch(args.tourId, {
        masterPlanStorageId: args.storageId,
      })
    }

    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'tour_updated',
      tourId: args.tourId,
      message: args.storageId
        ? `Added master plan to "${tour.title}"`
        : `Removed master plan from "${tour.title}"`,
    })

    return args.tourId
  },
})

/** Save where the master plan sits on the 360 panorama. */
export const setMasterPlanMapping = mutation({
  args: {
    tourId: v.id('tours'),
    mapping: v.union(
      v.null(),
      v.object({
        sceneId: v.optional(v.id('scenes')),
        corners: v.optional(
          v.array(
            v.object({
              yaw: v.number(),
              pitch: v.number(),
            })
          )
        ),
        yaw: v.optional(v.number()),
        pitch: v.optional(v.number()),
        widthDeg: v.optional(v.number()),
        heightDeg: v.optional(v.number()),
        rotation: v.optional(v.number()),
        opacity: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)
    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')
    if (!tour.masterPlanStorageId && args.mapping !== null) {
      throw new Error('Upload a master plan image first')
    }

    await ctx.db.patch(args.tourId, {
      masterPlanMapping: args.mapping === null ? undefined : args.mapping,
    })

    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'tour_updated',
      tourId: args.tourId,
      message:
        args.mapping === null
          ? `Cleared master plan mapping on "${tour.title}"`
          : `Updated master plan mapping on "${tour.title}"`,
    })

    return args.tourId
  },
})

/** Resolve master plan URL + mapping for dashboard / editor. */
export const getMasterPlan = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()

    const tour = await ctx.db.get(args.tourId)
    if (!tour || !user || tour.userId !== user._id || !tour.masterPlanStorageId) return null

    const url = await ctx.storage.getUrl(tour.masterPlanStorageId)
    return {
      url,
      mapping: tour.masterPlanMapping ?? null,
      storageId: tour.masterPlanStorageId,
    }
  },
})

/** Resolve master plan URL for dashboard preview. */
export const getMasterPlanUrl = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()

    const tour = await ctx.db.get(args.tourId)
    if (!tour || !user || tour.userId !== user._id || !tour.masterPlanStorageId) return null

    return await ctx.storage.getUrl(tour.masterPlanStorageId)
  },
})

// --- 3D Reconstruction: link splat to tour ---

/**
 * Link a completed Gaussian Splat (.spz) to a tour.
 * Internal mutation called by reconstructionJobs.acceptResult.
 */
export const linkSplat = internalMutation({
  args: {
    tourId: v.id('tours'),
    splatStorageId: v.id('_storage'),
    splatMetadata: v.object({
      fileSizeBytes: v.number(),
      gaussianCount: v.number(),
      processingTimeMs: v.number(),
      inputType: v.union(v.literal('video'), v.literal('photos')),
    }),
  },
  handler: async (ctx, args) => {
    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')

    await ctx.db.patch(args.tourId, {
      splatStorageId: args.splatStorageId,
      splatMetadata: args.splatMetadata,
    })
  },
})

/**
 * Public query: resolve the splat storage URL for a tour.
 * Returns null if the tour has no linked splat.
 */
export const getTourSplatUrl = query({
  args: { tourId: v.id('tours'), unlockToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tour = await ctx.db.get(args.tourId)
    if (!tour || !tour.splatStorageId) return null
    if (!(await canViewTour(ctx, tour, args.unlockToken))) return null
    const url = await ctx.storage.getUrl(tour.splatStorageId)
    return url
  },
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
    return { passwordHash: tour.passwordHash, tourId: tour._id }
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

// --- Phase 5: Floor Plan Derived Tour ---

/**
 * Create a Tour + one Scene + doorway hotspots from an extracted floor plan.
 * All three writes happen in one mutation transaction.
 */
export const createFromFloorPlan = mutation({
  args: {
    floorPlanId: v.id('floorPlanDetails'),
    title: v.string(),
    floorPlan3DConfig: v.optional(
      v.object({
        globalCeilingHeight: v.number(),
        doorWidth: v.optional(v.number()),
        doorHeight: v.optional(v.number()),
        roomOverrides: v.optional(
          v.array(
            v.object({
              roomId: v.string(),
              ceilingHeight: v.optional(v.number()),
              wallColor: v.optional(v.string()),
              floorType: v.optional(v.string()),
            })
          )
        ),
      })
    ),
    doorPositions: v.array(
      v.object({
        position: v.object({ x: v.number(), y: v.number() }),
        width: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const floorPlan = await ctx.db.get(args.floorPlanId)
    if (!floorPlan || floorPlan.userId !== user._id) throw new Error('Not authorized')
    await assertTourLimit(ctx, user)

    const base = args.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    let slug = `${base}-${Math.random().toString(36).slice(2, 7)}`
    // A duplicate slug makes every by_slug .unique() lookup throw.
    while (
      await ctx.db
        .query('tours')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .first()
    ) {
      slug = `${base}-${Math.random().toString(36).slice(2, 7)}`
    }

    const tourId = await ctx.db.insert('tours', {
      userId: user._id,
      title: args.title,
      slug,
      status: 'draft',
      viewCount: 0,
      sourceType: 'floor_plan',
      floorPlanId: args.floorPlanId,
      floorPlan3DConfig: args.floorPlan3DConfig,
    })

    const sceneId = await ctx.db.insert('scenes', {
      tourId,
      title: args.title,
      order: 0,
      panoramaType: 'floor_plan',
    })

    for (const door of args.doorPositions) {
      await ctx.db.insert('hotspots', {
        sceneId,
        type: 'navigation',
        position: { x: door.position.x, y: 0, z: door.position.y },
        tooltip: 'Room entrance',
        visible: true,
      })
    }

    await ctx.db.patch(args.floorPlanId, { tourId })

    return { tourId, slug }
  },
})

/**
 * Public query: load floor plan geometry and overrides for the public tour viewer.
 * No auth required — accessible from public /tour/[slug] page.
 */
export const getFloorPlanGeometry = query({
  args: { tourId: v.id('tours'), unlockToken: v.optional(v.string()) },
  handler: async (ctx, { tourId, unlockToken }) => {
    const tour = await ctx.db.get(tourId)
    if (!tour || tour.sourceType !== 'floor_plan' || !tour.floorPlanId) return null
    if (!(await canViewTour(ctx, tour, unlockToken))) return null

    const floorPlan = await ctx.db.get(tour.floorPlanId)
    if (!floorPlan || !floorPlan.geometry) return null

    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', tourId))
      .collect()
    const scene = scenes.find((s) => s.panoramaType === 'floor_plan')

    const rawHotspots = scene
      ? await ctx.db
          .query('hotspots')
          .withIndex('by_sceneId', (q) => q.eq('sceneId', scene._id))
          .collect()
      : []

    const doorwayHotspots = rawHotspots
      .filter((h) => h.type === 'navigation')
      .map((h) => ({
        id: h._id,
        position: h.position,
        tooltip: h.tooltip,
      }))

    const config = tour.floorPlan3DConfig
    const overrides = {
      globalCeilingHeight: config?.globalCeilingHeight ?? 2.7,
      doorWidth: config?.doorWidth ?? 0.9,
      doorHeight: config?.doorHeight ?? 2.1,
      roomOverrides: Object.fromEntries(
        (config?.roomOverrides ?? []).map((r) => [
          r.roomId,
          { wallColor: r.wallColor, floorType: r.floorType, ceilingHeight: r.ceilingHeight },
        ])
      ),
    }

    return {
      geometry: floorPlan.geometry as Record<string, unknown>,
      overrides,
      doorwayHotspots,
    }
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
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
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
      await ctx.runMutation(internal.tours.patchTourPassword, {
        tourId, passwordHash: undefined,
      })
    }
  },
})

// Public action: verifies a visitor-supplied password against the stored
// bcrypt hash for a password-protected tour. The actual bcrypt compare runs
// in the internalAction (passwordUtils.verifyTourPassword) so the hash is
// never exposed to the client.
export const verifyPassword = action({
  args: {
    slug: v.string(),
    password: v.string(),
  },
  // Returns an unlock token for getBySlugWithScenes, or null on a wrong password.
  handler: async (ctx, { slug, password }): Promise<string | null> => {
    const ok: boolean = await ctx.runAction(internal.passwordUtils.verifyTourPassword, {
      slug,
      password,
    })
    if (!ok) return null
    const tour = await ctx.runQuery(internal.tours.getPasswordHash, { slug })
    if (!tour?.passwordHash) return null
    return tourUnlockToken(tour.tourId, tour.passwordHash)
  },
})

export const setLogoUrlBySlug = internalMutation({
  args: { slug: v.string(), logoUrl: v.string() },
  handler: async (ctx, args) => {
    const tour = await ctx.db
      .query('tours')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!tour) throw new Error(`Tour not found: ${args.slug}`)
    await ctx.db.patch(tour._id, {
      brandingConfig: { ...(tour.brandingConfig ?? {}), logoUrl: args.logoUrl },
    })
    return tour._id
  },
})
