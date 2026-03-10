import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {
    category: v.optional(
      v.union(
        v.literal('sofas'),
        v.literal('beds'),
        v.literal('tables'),
        v.literal('chairs'),
        v.literal('storage'),
        v.literal('decor')
      )
    ),
    style: v.optional(
      v.union(
        v.literal('scandinavian'),
        v.literal('modern'),
        v.literal('luxury'),
        v.literal('industrial')
      )
    ),
  },
  handler: async (ctx, args) => {
    let items

    if (args.category) {
      items = await ctx.db
        .query('furnitureItems')
        .withIndex('by_category', (q) => q.eq('category', args.category!))
        .collect()
    } else if (args.style) {
      items = await ctx.db
        .query('furnitureItems')
        .withIndex('by_style', (q) => q.eq('style', args.style!))
        .collect()
    } else {
      items = await ctx.db.query('furnitureItems').collect()
    }

    // Apply secondary filter if both category and style provided
    if (args.category && args.style) {
      items = items.filter((item) => item.style === args.style)
    }

    // Resolve storage URLs
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const glbUrl = await ctx.storage.getUrl(item.glbStorageId)
        const thumbnailUrl = item.thumbnailStorageId
          ? await ctx.storage.getUrl(item.thumbnailStorageId)
          : null
        return { ...item, glbUrl, thumbnailUrl }
      })
    )

    return itemsWithUrls
  },
})

export const search = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(
      v.union(
        v.literal('sofas'),
        v.literal('beds'),
        v.literal('tables'),
        v.literal('chairs'),
        v.literal('storage'),
        v.literal('decor')
      )
    ),
    style: v.optional(
      v.union(
        v.literal('scandinavian'),
        v.literal('modern'),
        v.literal('luxury'),
        v.literal('industrial')
      )
    ),
  },
  handler: async (ctx, args) => {
    let searchQuery = ctx.db
      .query('furnitureItems')
      .withSearchIndex('search_name', (q) => {
        let search = q.search('name', args.searchTerm)
        if (args.category) {
          search = search.eq('category', args.category)
        }
        if (args.style) {
          search = search.eq('style', args.style)
        }
        return search
      })

    const items = await searchQuery.collect()

    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const glbUrl = await ctx.storage.getUrl(item.glbStorageId)
        const thumbnailUrl = item.thumbnailStorageId
          ? await ctx.storage.getUrl(item.thumbnailStorageId)
          : null
        return { ...item, glbUrl, thumbnailUrl }
      })
    )

    return itemsWithUrls
  },
})

export const getById = query({
  args: { id: v.id('furnitureItems') },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id)
    if (!item) return null

    const glbUrl = await ctx.storage.getUrl(item.glbStorageId)
    const thumbnailUrl = item.thumbnailStorageId
      ? await ctx.storage.getUrl(item.thumbnailStorageId)
      : null

    return { ...item, glbUrl, thumbnailUrl }
  },
})

export const seed = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        category: v.union(
          v.literal('sofas'),
          v.literal('beds'),
          v.literal('tables'),
          v.literal('chairs'),
          v.literal('storage'),
          v.literal('decor')
        ),
        style: v.union(
          v.literal('scandinavian'),
          v.literal('modern'),
          v.literal('luxury'),
          v.literal('industrial')
        ),
        glbStorageId: v.id('_storage'),
        thumbnailStorageId: v.optional(v.id('_storage')),
        dimensions: v.object({
          width: v.number(),
          depth: v.number(),
          height: v.number(),
        }),
        priceUsd: v.number(),
        amazonUrl: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const insertedIds = []
    for (const item of args.items) {
      const id = await ctx.db.insert('furnitureItems', item)
      insertedIds.push(id)
    }

    return insertedIds
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    return await ctx.storage.generateUploadUrl()
  },
})
