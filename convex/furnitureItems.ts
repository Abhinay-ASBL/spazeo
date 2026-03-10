import { v } from 'convex/values'
import { query, mutation, action } from './_generated/server'
import { api } from './_generated/api'

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

    // Resolve storage URLs — handle optional glbStorageId
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const glbUrl = item.glbStorageId
          ? await ctx.storage.getUrl(item.glbStorageId)
          : null
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
    const searchQuery = ctx.db
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
        const glbUrl = item.glbStorageId
          ? await ctx.storage.getUrl(item.glbStorageId)
          : null
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

    const glbUrl = item.glbStorageId
      ? await ctx.storage.getUrl(item.glbStorageId)
      : null
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
        glbStorageId: v.optional(v.id('_storage')),
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

/** Seed the catalog with 52 furniture items across 6 categories */
export const seedCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if catalog already has items
    const existing = await ctx.db.query('furnitureItems').first()
    if (existing) {
      throw new Error('Catalog already seeded. Delete existing items first.')
    }

    const items: Array<{
      name: string
      category: 'sofas' | 'beds' | 'tables' | 'chairs' | 'storage' | 'decor'
      style: 'scandinavian' | 'modern' | 'luxury' | 'industrial'
      dimensions: { width: number; depth: number; height: number }
      priceUsd: number
      amazonUrl?: string
      tags: string[]
    }> = [
      // ── Sofas (8) ──
      { name: '3-Seater Sofa', category: 'sofas', style: 'scandinavian', dimensions: { width: 2.2, depth: 0.9, height: 0.85 }, priceUsd: 1299, amazonUrl: 'https://www.amazon.com/s?k=scandinavian+3+seater+sofa&tag=spazeo-20', tags: ['living room', 'seating', 'family'] },
      { name: 'Loveseat', category: 'sofas', style: 'modern', dimensions: { width: 1.5, depth: 0.85, height: 0.82 }, priceUsd: 899, amazonUrl: 'https://www.amazon.com/s?k=modern+loveseat+sofa&tag=spazeo-20', tags: ['living room', 'seating', 'compact'] },
      { name: 'Sectional L-Shape', category: 'sofas', style: 'luxury', dimensions: { width: 3.0, depth: 2.2, height: 0.88 }, priceUsd: 2499, amazonUrl: 'https://www.amazon.com/s?k=luxury+sectional+sofa&tag=spazeo-20', tags: ['living room', 'seating', 'family'] },
      { name: 'Chaise Lounge', category: 'sofas', style: 'luxury', dimensions: { width: 1.7, depth: 0.8, height: 0.75 }, priceUsd: 1199, tags: ['living room', 'relaxation'] },
      { name: 'Futon Sofa Bed', category: 'sofas', style: 'modern', dimensions: { width: 1.8, depth: 0.9, height: 0.78 }, priceUsd: 549, amazonUrl: 'https://www.amazon.com/s?k=modern+futon+sofa+bed&tag=spazeo-20', tags: ['living room', 'multipurpose', 'guest'] },
      { name: 'Recliner', category: 'sofas', style: 'industrial', dimensions: { width: 0.95, depth: 0.9, height: 1.05 }, priceUsd: 799, amazonUrl: 'https://www.amazon.com/s?k=industrial+recliner+chair&tag=spazeo-20', tags: ['living room', 'seating', 'comfort'] },
      { name: 'Settee', category: 'sofas', style: 'scandinavian', dimensions: { width: 1.3, depth: 0.75, height: 0.8 }, priceUsd: 699, tags: ['entryway', 'seating', 'compact'] },
      { name: 'Daybed', category: 'sofas', style: 'industrial', dimensions: { width: 2.0, depth: 1.0, height: 0.7 }, priceUsd: 949, amazonUrl: 'https://www.amazon.com/s?k=industrial+daybed&tag=spazeo-20', tags: ['living room', 'multipurpose', 'relaxation'] },

      // ── Beds (8) ──
      { name: 'King Bed Frame', category: 'beds', style: 'luxury', dimensions: { width: 2.0, depth: 2.15, height: 1.2 }, priceUsd: 1899, amazonUrl: 'https://www.amazon.com/s?k=luxury+king+bed+frame&tag=spazeo-20', tags: ['bedroom', 'sleeping', 'master'] },
      { name: 'Queen Bed Frame', category: 'beds', style: 'scandinavian', dimensions: { width: 1.6, depth: 2.1, height: 1.0 }, priceUsd: 1299, amazonUrl: 'https://www.amazon.com/s?k=scandinavian+queen+bed&tag=spazeo-20', tags: ['bedroom', 'sleeping'] },
      { name: 'Single Bed Frame', category: 'beds', style: 'modern', dimensions: { width: 0.95, depth: 2.0, height: 0.9 }, priceUsd: 449, amazonUrl: 'https://www.amazon.com/s?k=modern+single+bed+frame&tag=spazeo-20', tags: ['bedroom', 'sleeping', 'kids'] },
      { name: 'Bunk Bed', category: 'beds', style: 'industrial', dimensions: { width: 1.0, depth: 2.0, height: 1.7 }, priceUsd: 799, tags: ['bedroom', 'sleeping', 'kids'] },
      { name: 'Platform Bed', category: 'beds', style: 'modern', dimensions: { width: 1.6, depth: 2.15, height: 0.35 }, priceUsd: 999, amazonUrl: 'https://www.amazon.com/s?k=modern+platform+bed&tag=spazeo-20', tags: ['bedroom', 'sleeping', 'minimalist'] },
      { name: 'Canopy Bed', category: 'beds', style: 'luxury', dimensions: { width: 1.8, depth: 2.15, height: 2.2 }, priceUsd: 2799, tags: ['bedroom', 'sleeping', 'statement'] },
      { name: 'Murphy Bed', category: 'beds', style: 'modern', dimensions: { width: 1.5, depth: 0.45, height: 2.2 }, priceUsd: 1599, amazonUrl: 'https://www.amazon.com/s?k=murphy+wall+bed&tag=spazeo-20', tags: ['bedroom', 'space-saving', 'multipurpose'] },
      { name: 'Toddler Bed', category: 'beds', style: 'scandinavian', dimensions: { width: 0.7, depth: 1.4, height: 0.6 }, priceUsd: 249, tags: ['bedroom', 'sleeping', 'kids'] },

      // ── Tables (10) ──
      { name: 'Dining Table 6-Seat', category: 'tables', style: 'scandinavian', dimensions: { width: 1.8, depth: 0.9, height: 0.75 }, priceUsd: 1199, amazonUrl: 'https://www.amazon.com/s?k=scandinavian+dining+table+6+seat&tag=spazeo-20', tags: ['dining room', 'family', 'entertaining'] },
      { name: 'Dining Table 4-Seat', category: 'tables', style: 'modern', dimensions: { width: 1.2, depth: 0.8, height: 0.75 }, priceUsd: 799, amazonUrl: 'https://www.amazon.com/s?k=modern+dining+table+4+seat&tag=spazeo-20', tags: ['dining room', 'compact'] },
      { name: 'Coffee Table', category: 'tables', style: 'industrial', dimensions: { width: 1.2, depth: 0.6, height: 0.45 }, priceUsd: 349, amazonUrl: 'https://www.amazon.com/s?k=industrial+coffee+table&tag=spazeo-20', tags: ['living room', 'accent'] },
      { name: 'Side Table', category: 'tables', style: 'scandinavian', dimensions: { width: 0.45, depth: 0.45, height: 0.55 }, priceUsd: 149, tags: ['living room', 'accent', 'compact'] },
      { name: 'Console Table', category: 'tables', style: 'luxury', dimensions: { width: 1.3, depth: 0.35, height: 0.8 }, priceUsd: 599, amazonUrl: 'https://www.amazon.com/s?k=luxury+console+table&tag=spazeo-20', tags: ['entryway', 'accent'] },
      { name: 'Writing Desk', category: 'tables', style: 'modern', dimensions: { width: 1.2, depth: 0.6, height: 0.75 }, priceUsd: 449, amazonUrl: 'https://www.amazon.com/s?k=modern+writing+desk&tag=spazeo-20', tags: ['office', 'workspace'] },
      { name: 'Bar Table', category: 'tables', style: 'industrial', dimensions: { width: 0.6, depth: 0.6, height: 1.05 }, priceUsd: 299, tags: ['kitchen', 'entertaining'] },
      { name: 'Nightstand', category: 'tables', style: 'luxury', dimensions: { width: 0.5, depth: 0.4, height: 0.6 }, priceUsd: 249, amazonUrl: 'https://www.amazon.com/s?k=luxury+nightstand&tag=spazeo-20', tags: ['bedroom', 'storage'] },
      { name: 'TV Console', category: 'tables', style: 'modern', dimensions: { width: 1.8, depth: 0.4, height: 0.5 }, priceUsd: 549, amazonUrl: 'https://www.amazon.com/s?k=modern+tv+console&tag=spazeo-20', tags: ['living room', 'media'] },
      { name: 'Kitchen Island', category: 'tables', style: 'industrial', dimensions: { width: 1.5, depth: 0.8, height: 0.9 }, priceUsd: 1299, tags: ['kitchen', 'workspace', 'storage'] },

      // ── Chairs (10) ──
      { name: 'Dining Chair', category: 'chairs', style: 'scandinavian', dimensions: { width: 0.5, depth: 0.55, height: 0.85 }, priceUsd: 199, amazonUrl: 'https://www.amazon.com/s?k=scandinavian+dining+chair&tag=spazeo-20', tags: ['dining room', 'seating'] },
      { name: 'Office Chair', category: 'chairs', style: 'modern', dimensions: { width: 0.65, depth: 0.65, height: 1.15 }, priceUsd: 399, amazonUrl: 'https://www.amazon.com/s?k=modern+ergonomic+office+chair&tag=spazeo-20', tags: ['office', 'workspace', 'ergonomic'] },
      { name: 'Accent Chair', category: 'chairs', style: 'luxury', dimensions: { width: 0.75, depth: 0.8, height: 0.9 }, priceUsd: 649, amazonUrl: 'https://www.amazon.com/s?k=luxury+accent+chair&tag=spazeo-20', tags: ['living room', 'accent', 'statement'] },
      { name: 'Bar Stool', category: 'chairs', style: 'industrial', dimensions: { width: 0.4, depth: 0.4, height: 0.75 }, priceUsd: 149, amazonUrl: 'https://www.amazon.com/s?k=industrial+bar+stool&tag=spazeo-20', tags: ['kitchen', 'seating'] },
      { name: 'Rocking Chair', category: 'chairs', style: 'scandinavian', dimensions: { width: 0.65, depth: 0.85, height: 1.05 }, priceUsd: 449, tags: ['living room', 'relaxation'] },
      { name: 'Lounge Chair', category: 'chairs', style: 'luxury', dimensions: { width: 0.85, depth: 0.9, height: 0.8 }, priceUsd: 899, amazonUrl: 'https://www.amazon.com/s?k=luxury+lounge+chair&tag=spazeo-20', tags: ['living room', 'relaxation', 'statement'] },
      { name: 'Folding Chair', category: 'chairs', style: 'industrial', dimensions: { width: 0.45, depth: 0.5, height: 0.8 }, priceUsd: 49, tags: ['multipurpose', 'portable'] },
      { name: 'Bean Bag', category: 'chairs', style: 'modern', dimensions: { width: 0.9, depth: 0.9, height: 0.7 }, priceUsd: 129, amazonUrl: 'https://www.amazon.com/s?k=modern+bean+bag+chair&tag=spazeo-20', tags: ['living room', 'casual', 'kids'] },
      { name: 'Entryway Bench', category: 'chairs', style: 'scandinavian', dimensions: { width: 1.2, depth: 0.4, height: 0.5 }, priceUsd: 299, tags: ['entryway', 'seating', 'storage'] },
      { name: 'Ottoman', category: 'chairs', style: 'modern', dimensions: { width: 0.6, depth: 0.6, height: 0.45 }, priceUsd: 199, amazonUrl: 'https://www.amazon.com/s?k=modern+ottoman&tag=spazeo-20', tags: ['living room', 'seating', 'accent'] },

      // ── Storage (8) ──
      { name: 'Bookshelf', category: 'storage', style: 'scandinavian', dimensions: { width: 0.8, depth: 0.35, height: 1.8 }, priceUsd: 399, amazonUrl: 'https://www.amazon.com/s?k=scandinavian+bookshelf&tag=spazeo-20', tags: ['living room', 'office', 'books'] },
      { name: 'Dresser', category: 'storage', style: 'modern', dimensions: { width: 1.2, depth: 0.5, height: 0.8 }, priceUsd: 699, amazonUrl: 'https://www.amazon.com/s?k=modern+dresser&tag=spazeo-20', tags: ['bedroom', 'clothing'] },
      { name: 'Wardrobe', category: 'storage', style: 'luxury', dimensions: { width: 1.5, depth: 0.6, height: 2.1 }, priceUsd: 1499, tags: ['bedroom', 'clothing', 'storage'] },
      { name: 'TV Unit', category: 'storage', style: 'industrial', dimensions: { width: 1.6, depth: 0.45, height: 0.55 }, priceUsd: 449, amazonUrl: 'https://www.amazon.com/s?k=industrial+tv+unit&tag=spazeo-20', tags: ['living room', 'media'] },
      { name: 'Filing Cabinet', category: 'storage', style: 'industrial', dimensions: { width: 0.4, depth: 0.5, height: 0.7 }, priceUsd: 199, tags: ['office', 'documents'] },
      { name: 'Shoe Rack', category: 'storage', style: 'scandinavian', dimensions: { width: 0.8, depth: 0.3, height: 1.0 }, priceUsd: 129, amazonUrl: 'https://www.amazon.com/s?k=scandinavian+shoe+rack&tag=spazeo-20', tags: ['entryway', 'shoes'] },
      { name: 'Floating Shelf Set', category: 'storage', style: 'modern', dimensions: { width: 0.9, depth: 0.2, height: 0.05 }, priceUsd: 79, amazonUrl: 'https://www.amazon.com/s?k=modern+floating+shelf+set&tag=spazeo-20', tags: ['living room', 'decor', 'wall'] },
      { name: 'Storage Ottoman', category: 'storage', style: 'luxury', dimensions: { width: 0.7, depth: 0.7, height: 0.45 }, priceUsd: 249, tags: ['living room', 'multipurpose'] },

      // ── Decor (8) ──
      { name: 'Floor Lamp', category: 'decor', style: 'scandinavian', dimensions: { width: 0.35, depth: 0.35, height: 1.6 }, priceUsd: 179, amazonUrl: 'https://www.amazon.com/s?k=scandinavian+floor+lamp&tag=spazeo-20', tags: ['living room', 'lighting'] },
      { name: 'Table Lamp', category: 'decor', style: 'luxury', dimensions: { width: 0.25, depth: 0.25, height: 0.55 }, priceUsd: 129, amazonUrl: 'https://www.amazon.com/s?k=luxury+table+lamp&tag=spazeo-20', tags: ['bedroom', 'lighting'] },
      { name: 'Area Rug 5x7', category: 'decor', style: 'modern', dimensions: { width: 2.15, depth: 1.52, height: 0.02 }, priceUsd: 249, amazonUrl: 'https://www.amazon.com/s?k=modern+area+rug+5x7&tag=spazeo-20', tags: ['living room', 'floor', 'texture'] },
      { name: 'Indoor Plant - Fiddle Leaf', category: 'decor', style: 'scandinavian', dimensions: { width: 0.5, depth: 0.5, height: 1.2 }, priceUsd: 89, tags: ['living room', 'greenery', 'natural'] },
      { name: 'Wall Mirror', category: 'decor', style: 'luxury', dimensions: { width: 0.8, depth: 0.05, height: 1.1 }, priceUsd: 349, amazonUrl: 'https://www.amazon.com/s?k=luxury+wall+mirror&tag=spazeo-20', tags: ['bedroom', 'accent', 'wall'] },
      { name: 'Picture Frame Set', category: 'decor', style: 'modern', dimensions: { width: 0.6, depth: 0.03, height: 0.4 }, priceUsd: 59, tags: ['living room', 'wall', 'personal'] },
      { name: 'Decorative Vase', category: 'decor', style: 'industrial', dimensions: { width: 0.2, depth: 0.2, height: 0.4 }, priceUsd: 69, amazonUrl: 'https://www.amazon.com/s?k=industrial+decorative+vase&tag=spazeo-20', tags: ['living room', 'accent', 'table'] },
      { name: 'Throw Pillow Set', category: 'decor', style: 'industrial', dimensions: { width: 0.45, depth: 0.45, height: 0.15 }, priceUsd: 49, amazonUrl: 'https://www.amazon.com/s?k=industrial+throw+pillow+set&tag=spazeo-20', tags: ['living room', 'comfort', 'accent'] },
    ]

    const insertedIds = []
    for (const item of items) {
      const id = await ctx.db.insert('furnitureItems', item)
      insertedIds.push(id)
    }

    return { count: insertedIds.length, ids: insertedIds }
  },
})

/** Set GLB storage ID for a specific furniture item (after file upload) */
export const setGlbStorageId = mutation({
  args: {
    itemId: v.id('furnitureItems'),
    glbStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) throw new Error('Furniture item not found')

    await ctx.db.patch(args.itemId, { glbStorageId: args.glbStorageId })
    return { success: true }
  },
})

/** Upload test GLB files from public/test-glbs/ and assign to first 3 seeded items */
export const uploadTestGlbs = action({
  args: {},
  handler: async (ctx) => {
    const testGlbs = ['cube.glb', 'cylinder.glb', 'sphere.glb']

    // Get all furniture items to find first 3 without GLBs
    const allItems: Array<{
      _id: string
      name: string
      glbStorageId?: string | null
      glbUrl: string | null
      [key: string]: unknown
    }> = await ctx.runQuery(api.furnitureItems.list, {})
    const itemsWithoutGlb = allItems.filter((item) => !item.glbStorageId)

    if (itemsWithoutGlb.length === 0) {
      throw new Error('No items without GLBs found. All items already have models.')
    }

    const assignCount = Math.min(testGlbs.length, itemsWithoutGlb.length)
    const results = []

    for (let i = 0; i < assignCount; i++) {
      const fileName = testGlbs[i]

      // Fetch test GLB from public directory
      // In dev, use localhost:3000. In production, use the deployed URL.
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/test-glbs/${fileName}`)

      if (!response.ok) {
        results.push({ fileName, error: `Failed to fetch: ${response.status}` })
        continue
      }

      const blob = await response.blob()

      // Upload to Convex storage
      const uploadUrl = await ctx.storage.generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'model/gltf-binary' },
        body: blob,
      })

      if (!uploadResponse.ok) {
        results.push({ fileName, error: `Upload failed: ${uploadResponse.status}` })
        continue
      }

      const { storageId } = await uploadResponse.json()

      // Assign to the item
      await ctx.runMutation(api.furnitureItems.setGlbStorageId, {
        itemId: itemsWithoutGlb[i]._id as any,
        glbStorageId: storageId,
      })

      results.push({
        fileName,
        itemName: itemsWithoutGlb[i].name,
        storageId,
        success: true,
      })
    }

    return results
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
