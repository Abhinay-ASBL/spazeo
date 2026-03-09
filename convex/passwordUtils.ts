"use node"
import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import bcrypt from 'bcryptjs'
import { internal } from './_generated/api'

export const hashTourPassword = internalAction({
  args: { password: v.string() },
  handler: async (_ctx, { password }): Promise<string> => {
    return bcrypt.hash(password, 10)
  },
})

export const verifyTourPassword = internalAction({
  args: { slug: v.string(), password: v.string() },
  handler: async (ctx, { slug, password }): Promise<boolean> => {
    const tour = await ctx.runQuery(internal.tours.getPasswordHash, { slug })
    if (!tour?.passwordHash) return false
    return bcrypt.compare(password, tour.passwordHash)
  },
})
