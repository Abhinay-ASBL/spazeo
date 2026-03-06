import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { internal } from './_generated/api'

// Helper to get the authenticated user
async function getAuthUser(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
  db: any
}) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user) throw new Error('User not found')
  return user
}

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Math.random().toString(16).slice(2, 8)
  )
}

// ─── Queries ───────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(v.union(v.literal('draft'), v.literal('published'))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    let buildings = await ctx.db
      .query('buildings')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    if (args.status) {
      buildings = buildings.filter((b) => b.status === args.status)
    }

    if (args.search) {
      const term = args.search.toLowerCase()
      buildings = buildings.filter((b) =>
        b.name.toLowerCase().includes(term)
      )
    }

    buildings.sort((a, b) => b._creationTime - a._creationTime)

    return buildings
  },
})

export const getById = query({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const building = await ctx.db.get(args.buildingId)
    if (!building) return null

    let modelUrl: string | null = null
    let optimizedModelUrl: string | null = null

    if (building.modelStorageId) {
      modelUrl = await ctx.storage.getUrl(building.modelStorageId)
    }
    if (building.optimizedModelStorageId) {
      optimizedModelUrl = await ctx.storage.getUrl(
        building.optimizedModelStorageId
      )
    }

    let thumbnailUrl: string | null = null
    if (building.thumbnailStorageId) {
      thumbnailUrl = await ctx.storage.getUrl(building.thumbnailStorageId)
    }

    return {
      ...building,
      modelUrl,
      optimizedModelUrl,
      thumbnailUrl,
    }
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const building = await ctx.db
      .query('buildings')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!building || building.status !== 'published') return null

    let modelUrl: string | null = null
    let optimizedModelUrl: string | null = null

    if (building.modelStorageId) {
      modelUrl = await ctx.storage.getUrl(building.modelStorageId)
    }
    if (building.optimizedModelStorageId) {
      optimizedModelUrl = await ctx.storage.getUrl(
        building.optimizedModelStorageId
      )
    }

    let thumbnailUrl: string | null = null
    if (building.thumbnailStorageId) {
      thumbnailUrl = await ctx.storage.getUrl(building.thumbnailStorageId)
    }

    // Fetch associated blocks
    const blocks = await ctx.db
      .query('buildingBlocks')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', building._id))
      .collect()

    // Fetch associated units
    const units = await ctx.db
      .query('buildingUnits')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', building._id))
      .collect()

    // Fetch view positions
    const viewPositions = await ctx.db
      .query('viewPositions')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', building._id))
      .collect()

    return {
      ...building,
      modelUrl,
      optimizedModelUrl,
      thumbnailUrl,
      blocks,
      units,
      viewPositions,
    }
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

    const buildings = await ctx.db
      .query('buildings')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    return {
      total: buildings.length,
      draft: buildings.filter((b) => b.status === 'draft').length,
      published: buildings.filter((b) => b.status === 'published').length,
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

    const buildings = await ctx.db
      .query('buildings')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(6)

    return buildings
  },
})

// ─── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    location: v.object({
      lat: v.number(),
      lng: v.number(),
      elevation: v.optional(v.number()),
    }),
    totalFloors: v.number(),
    totalBlocks: v.number(),
    environmentType: v.optional(
      v.union(v.literal('google3d'), v.literal('hdri'), v.literal('procedural'))
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    // Only enterprise plan can create buildings
    if (user.plan !== 'enterprise') {
      throw new Error(
        'Building creation requires an Enterprise plan. Please upgrade to continue.'
      )
    }

    const slug = generateSlug(args.name)

    const buildingId = await ctx.db.insert('buildings', {
      userId: user._id,
      name: args.name,
      slug,
      location: args.location,
      totalFloors: args.totalFloors,
      totalBlocks: args.totalBlocks,
      status: 'draft',
      viewCount: 0,
      environmentType: args.environmentType,
    })

    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'building_created',
      message: `Created building "${args.name}"`,
    })

    return buildingId
  },
})

export const update = mutation({
  args: {
    buildingId: v.id('buildings'),
    name: v.optional(v.string()),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
        elevation: v.optional(v.number()),
      })
    ),
    totalFloors: v.optional(v.number()),
    totalBlocks: v.optional(v.number()),
    environmentType: v.optional(
      v.union(v.literal('google3d'), v.literal('hdri'), v.literal('procedural'))
    ),
    settings: v.optional(
      v.object({
        autoRotate: v.optional(v.boolean()),
        showFloorSelector: v.optional(v.boolean()),
        showPositionSelector: v.optional(v.boolean()),
        allowComparison: v.optional(v.boolean()),
        defaultFloor: v.optional(v.number()),
        cameraDistance: v.optional(v.number()),
        cameraAngle: v.optional(v.number()),
      })
    ),
    thumbnailStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx)

    const building = await ctx.db.get(args.buildingId)
    if (!building) throw new Error('Building not found')

    const { buildingId, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )

    await ctx.db.patch(buildingId, cleanUpdates)
  },
})

export const remove = mutation({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const building = await ctx.db.get(args.buildingId)
    if (!building) throw new Error('Building not found')
    if (building.userId !== user._id) throw new Error('Not authorized')

    // CASCADE: delete all related records

    // 1. Delete building blocks
    const blocks = await ctx.db
      .query('buildingBlocks')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()
    for (const block of blocks) {
      await ctx.db.delete(block._id)
    }

    // 2. Delete view positions
    const viewPositions = await ctx.db
      .query('viewPositions')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()
    for (const vp of viewPositions) {
      await ctx.db.delete(vp._id)
    }

    // 3. Delete exterior panoramas and their storage files
    const panoramas = await ctx.db
      .query('exteriorPanoramas')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()
    for (const pano of panoramas) {
      await ctx.storage.delete(pano.imageStorageId)
      if (pano.thumbnailStorageId) {
        await ctx.storage.delete(pano.thumbnailStorageId)
      }
      await ctx.db.delete(pano._id)
    }

    // 4. Delete building units
    const units = await ctx.db
      .query('buildingUnits')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()
    for (const unit of units) {
      await ctx.db.delete(unit._id)
    }

    // 5. Delete conversion jobs
    const jobs = await ctx.db
      .query('conversionJobs')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()
    for (const job of jobs) {
      if (job.outputStorageId) {
        await ctx.storage.delete(job.outputStorageId)
      }
      await ctx.db.delete(job._id)
    }

    // 6. Delete building analytics
    const analyticsRecords = await ctx.db
      .query('buildingAnalytics')
      .withIndex('by_buildingId', (q) => q.eq('buildingId', args.buildingId))
      .collect()
    for (const record of analyticsRecords) {
      await ctx.db.delete(record._id)
    }

    // 7. Delete model storage files
    if (building.modelStorageId) {
      await ctx.storage.delete(building.modelStorageId)
    }
    if (building.optimizedModelStorageId) {
      await ctx.storage.delete(building.optimizedModelStorageId)
    }
    if (building.thumbnailStorageId) {
      await ctx.storage.delete(building.thumbnailStorageId)
    }

    // 8. Delete the building itself
    await ctx.db.delete(args.buildingId)
  },
})

export const publish = mutation({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const building = await ctx.db.get(args.buildingId)
    if (!building) throw new Error('Building not found')
    if (building.userId !== user._id) throw new Error('Not authorized')

    // Validate building has a 3D model
    if (!building.optimizedModelStorageId && !building.modelStorageId) {
      throw new Error(
        'Cannot publish a building without a 3D model. Upload a model first.'
      )
    }

    const embedCode = `<iframe src="https://spazeo.io/building/${building.slug}?embed=true" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`

    await ctx.db.patch(args.buildingId, {
      status: 'published',
      publishedAt: Date.now(),
      embedCode,
    })

    await ctx.runMutation(internal.activity.log, {
      userId: user._id,
      type: 'building_published',
      message: `Published building "${building.name}"`,
    })
  },
})

export const unpublish = mutation({
  args: { buildingId: v.id('buildings') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const building = await ctx.db.get(args.buildingId)
    if (!building) throw new Error('Building not found')
    if (building.userId !== user._id) throw new Error('Not authorized')

    await ctx.db.patch(args.buildingId, {
      status: 'draft',
      publishedAt: undefined,
    })
  },
})

export const updateSlug = mutation({
  args: {
    buildingId: v.id('buildings'),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)

    const building = await ctx.db.get(args.buildingId)
    if (!building) throw new Error('Building not found')
    if (building.userId !== user._id) throw new Error('Not authorized')

    // Validate uniqueness
    const existing = await ctx.db
      .query('buildings')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (existing && existing._id !== args.buildingId) {
      throw new Error('This URL slug is already taken')
    }

    await ctx.db.patch(args.buildingId, { slug: args.slug })
  },
})

export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')
  return await ctx.storage.generateUploadUrl()
})

export const setModelStorageId = mutation({
  args: {
    buildingId: v.id('buildings'),
    modelStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx)

    const building = await ctx.db.get(args.buildingId)
    if (!building) throw new Error('Building not found')

    await ctx.db.patch(args.buildingId, {
      modelStorageId: args.modelStorageId,
    })
  },
})
