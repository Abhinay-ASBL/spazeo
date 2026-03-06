import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let posts: any[]

    if (args.category) {
      posts = await ctx.db
        .query('blogPosts')
        .withIndex('by_category', (q) => q.eq('category', args.category as any))
        .filter((q) => q.eq(q.field('status'), 'published'))
        .collect()
    } else {
      posts = await ctx.db
        .query('blogPosts')
        .filter((q) => q.eq(q.field('status'), 'published'))
        .collect()
    }

    return posts.slice(0, args.limit ?? 20)
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('blogPosts')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.string(),
    author: v.string(),
    category: v.union(
      v.literal('product_updates'),
      v.literal('tutorials'),
      v.literal('industry'),
      v.literal('case_studies'),
      v.literal('ai_technology'),
      v.literal('company_news')
    ),
    tags: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    featuredImageStorageId: v.optional(v.id('_storage')),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    status: v.optional(v.union(v.literal('draft'), v.literal('published'), v.literal('archived'))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('blogPosts', {
      ...args,
      tags: args.tags ?? [],
      status: args.status ?? 'draft',
      publishedAt: args.status === 'published' ? Date.now() : undefined,
    })
  },
})
