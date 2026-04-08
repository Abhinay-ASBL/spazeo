import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const create = mutation({
  args: {
    name: v.string(),
    tourId: v.optional(v.id('tours')),
    floorCount: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const now = Date.now()
    return await ctx.db.insert('floorPlanProjects', {
      userId: user._id,
      name: args.name,
      tourId: args.tourId,
      floorCount: args.floorCount,
      status: 'uploading',
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const getById = query({
  args: { projectId: v.id('floorPlanProjects') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const project = await ctx.db.get(args.projectId)
    if (!project) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user._id !== project.userId) return null

    return project
  },
})

/**
 * Accepts a string that could be either a floorPlanProjects ID or a
 * floorPlanDetails ID. Returns the resolved project (and, when the input was
 * a detail ID, the resolved projectId so the caller can query details).
 */
export const getByFlexibleId = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    // Try as floorPlanProjects ID first
    const projectId = ctx.db.normalizeId('floorPlanProjects', args.id)
    if (projectId) {
      const project = await ctx.db.get(projectId)
      if (project && project.userId === user._id) {
        return { project, projectId: project._id, resolvedFrom: 'project' as const }
      }
      return null
    }

    // Try as floorPlanDetails ID — look up its parent project
    const detailId = ctx.db.normalizeId('floorPlanDetails', args.id)
    if (detailId) {
      const detail = await ctx.db.get(detailId)
      if (!detail) return null
      if (detail.userId !== user._id) return null

      if (detail.projectId) {
        const project = await ctx.db.get(detail.projectId)
        if (project) {
          return { project, projectId: project._id, resolvedFrom: 'detail' as const }
        }
      }

      // Detail exists but has no parent project — synthesize a minimal project
      return {
        project: {
          _id: detailId as unknown,
          userId: user._id,
          name: detail.label ?? `Floor ${detail.floorNumber}`,
          floorCount: 1,
          status: detail.extractionStatus === 'completed' ? 'editing' as const : 'extracting' as const,
          createdAt: detail.createdAt,
          updatedAt: detail.updatedAt,
        },
        projectId: null,
        resolvedFrom: 'detail_orphan' as const,
      }
    }

    return null
  },
})

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const projects = await ctx.db
      .query('floorPlanProjects')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    return projects.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const update = mutation({
  args: {
    projectId: v.id('floorPlanProjects'),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal('uploading'), v.literal('extracting'), v.literal('editing'), v.literal('completed'))
    ),
    floorCount: v.optional(v.number()),
    tourId: v.optional(v.id('tours')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const project = await ctx.db.get(args.projectId)
    if (!project) throw new Error('Project not found')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user._id !== project.userId) throw new Error('Not authorized')

    const { projectId, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )

    await ctx.db.patch(projectId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { projectId: v.id('floorPlanProjects') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const project = await ctx.db.get(args.projectId)
    if (!project) throw new Error('Project not found')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user._id !== project.userId) throw new Error('Not authorized')

    // Cascade-delete child floorPlanDetails
    const details = await ctx.db
      .query('floorPlanDetails')
      .withIndex('by_projectId', (q) => q.eq('projectId', args.projectId))
      .collect()

    for (const detail of details) {
      // Delete associated versions
      const versions = await ctx.db
        .query('floorPlanVersions')
        .withIndex('by_floorPlanId', (q) => q.eq('floorPlanId', detail._id))
        .collect()
      for (const version of versions) {
        await ctx.db.delete(version._id)
      }

      // Delete associated jobs
      const jobs = await ctx.db
        .query('floorPlanJobs')
        .withIndex('by_floorPlanId', (q) => q.eq('floorPlanId', detail._id))
        .collect()
      for (const job of jobs) {
        await ctx.db.delete(job._id)
      }

      await ctx.db.delete(detail._id)
    }

    await ctx.db.delete(args.projectId)
  },
})
