import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const create = mutation({
  args: {
    tourId: v.id('tours'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    // Find user by clerkId
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    // Generate slug from title + random suffix
    const baseSlug = args.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const suffix = Math.random().toString(36).substring(2, 8)
    const slug = `${baseSlug}-${suffix}`

    const now = Date.now()
    const roomId = await ctx.db.insert('furnishedRooms', {
      tourId: args.tourId,
      userId: user._id,
      title: args.title,
      slug,
      createdAt: now,
      updatedAt: now,
    })

    return roomId
  },
})

export const getBySlug = query({
  args: {
    furnishedRoomSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query('furnishedRooms')
      .withIndex('by_slug', (q) => q.eq('slug', args.furnishedRoomSlug))
      .unique()

    if (!room) return null

    // Get the parent tour for context (title, slug, splatStorageId)
    const tour = await ctx.db.get(room.tourId)
    if (!tour) return null

    // Resolve splat URL if available
    const splatUrl = tour.splatStorageId
      ? await ctx.storage.getUrl(tour.splatStorageId)
      : null

    // Get all placed furniture for this room
    const placements = await ctx.db
      .query('placedFurniture')
      .withIndex('by_furnishedRoomId', (q) =>
        q.eq('furnishedRoomId', room._id)
      )
      .collect()

    // Resolve furniture item metadata and URLs for each placement
    const placementsWithItems = await Promise.all(
      placements.map(async (placement) => {
        const item = await ctx.db.get(placement.furnitureItemId)
        if (!item) return null

        const glbUrl = item.glbStorageId
          ? await ctx.storage.getUrl(item.glbStorageId)
          : null
        const thumbnailUrl = item.thumbnailStorageId
          ? await ctx.storage.getUrl(item.thumbnailStorageId)
          : null

        return {
          ...placement,
          furnitureItem: {
            ...item,
            glbUrl,
            thumbnailUrl,
          },
        }
      })
    )

    return {
      room: {
        _id: room._id,
        title: room.title,
        slug: room.slug,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
      tour: {
        _id: tour._id,
        title: tour.title,
        slug: tour.slug,
        splatUrl,
      },
      placements: placementsWithItems.filter(Boolean),
    }
  },
})

export const getByTourId = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const rooms = await ctx.db
      .query('furnishedRooms')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    return rooms
  },
})

export const savePlacements = mutation({
  args: {
    furnishedRoomId: v.id('furnishedRooms'),
    placements: v.array(
      v.object({
        furnitureItemId: v.id('furnitureItems'),
        instanceId: v.string(),
        position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
        rotation: v.object({ x: v.number(), y: v.number(), z: v.number() }),
        scale: v.object({ x: v.number(), y: v.number(), z: v.number() }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    // Verify room exists
    const room = await ctx.db.get(args.furnishedRoomId)
    if (!room) throw new Error('Furnished room not found')

    // Delete existing placements
    const existing = await ctx.db
      .query('placedFurniture')
      .withIndex('by_furnishedRoomId', (q) =>
        q.eq('furnishedRoomId', args.furnishedRoomId)
      )
      .collect()

    for (const placement of existing) {
      await ctx.db.delete(placement._id)
    }

    // Insert new placements
    for (const placement of args.placements) {
      await ctx.db.insert('placedFurniture', {
        furnishedRoomId: args.furnishedRoomId,
        ...placement,
      })
    }

    // Update room timestamp
    await ctx.db.patch(args.furnishedRoomId, { updatedAt: Date.now() })
  },
})

export const deleteRoom = mutation({
  args: { furnishedRoomId: v.id('furnishedRooms') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    // Delete all placements for this room
    const placements = await ctx.db
      .query('placedFurniture')
      .withIndex('by_furnishedRoomId', (q) =>
        q.eq('furnishedRoomId', args.furnishedRoomId)
      )
      .collect()

    for (const placement of placements) {
      await ctx.db.delete(placement._id)
    }

    // Delete the room
    await ctx.db.delete(args.furnishedRoomId)
  },
})
