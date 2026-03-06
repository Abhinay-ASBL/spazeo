import { v } from 'convex/values'
import { query, mutation, action, internalQuery, internalAction } from './_generated/server'
import { internal } from './_generated/api'

export const listByTour = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('leads')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .order('desc')
      .collect()
  },
})

export const listAll = query({
  args: {
    tourId: v.optional(v.id('tours')),
    status: v.optional(
      v.union(
        v.literal('new'),
        v.literal('contacted'),
        v.literal('qualified'),
        v.literal('archived')
      )
    ),
    search: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    // If filtering by specific tour
    if (args.tourId) {
      const tour = await ctx.db.get(args.tourId)
      if (!tour || tour.userId !== user._id) return []

      let leads = await ctx.db
        .query('leads')
        .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId!))
        .collect()

      leads = applyFilters(leads, args)
      return leads.sort((a, b) => b._creationTime - a._creationTime)
    }

    // All leads across user's tours
    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const allLeads = await Promise.all(
      tours.map((tour) =>
        ctx.db
          .query('leads')
          .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
          .collect()
      )
    )

    let flatLeads = allLeads.flat()
    flatLeads = applyFilters(flatLeads, args)
    return flatLeads.sort((a, b) => b._creationTime - a._creationTime)
  },
})

function applyFilters(
  leads: any[],
  args: {
    status?: string
    search?: string
    startDate?: number
    endDate?: number
  }
) {
  if (args.status) {
    leads = leads.filter((l) => (l.status ?? 'new') === args.status)
  }
  if (args.search) {
    const term = args.search.toLowerCase()
    leads = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.email.toLowerCase().includes(term) ||
        (l.phone && l.phone.toLowerCase().includes(term))
    )
  }
  if (args.startDate) {
    leads = leads.filter((l) => l._creationTime >= args.startDate!)
  }
  if (args.endDate) {
    leads = leads.filter((l) => l._creationTime <= args.endDate!)
  }
  return leads
}

export const getDetail = query({
  args: { leadId: v.id('leads') },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId)
    if (!lead) return null

    const tour = await ctx.db.get(lead.tourId)

    return {
      ...lead,
      tourTitle: tour?.title ?? 'Unknown Tour',
      tourSlug: tour?.slug,
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

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const allLeads = await Promise.all(
      tours.map((tour) =>
        ctx.db
          .query('leads')
          .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
          .collect()
      )
    )

    const leads = allLeads.flat()
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    return {
      total: leads.length,
      new: leads.filter((l) => (l.status ?? 'new') === 'new').length,
      contacted: leads.filter((l) => l.status === 'contacted').length,
      qualified: leads.filter((l) => l.status === 'qualified').length,
      archived: leads.filter((l) => l.status === 'archived').length,
      newThisWeek: leads.filter((l) => l._creationTime >= oneWeekAgo).length,
    }
  },
})

export const capture = mutation({
  args: {
    tourId: v.id('tours'),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    viewedScenes: v.optional(v.array(v.id('scenes'))),
    timeSpent: v.optional(v.number()),
    deviceInfo: v.optional(
      v.object({
        type: v.optional(v.string()),
        browser: v.optional(v.string()),
        os: v.optional(v.string()),
      })
    ),
    locationInfo: v.optional(
      v.object({
        country: v.optional(v.string()),
        city: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert('leads', {
      ...args,
      status: 'new',
    })

    // Log activity for the tour owner and send email notification
    const tour = await ctx.db.get(args.tourId)
    if (tour) {
      await ctx.runMutation(internal.activity.log, {
        userId: tour.userId,
        type: 'lead_captured',
        tourId: args.tourId,
        message: `New lead from ${args.name} (${args.email})`,
      })

      // Create in-app notification for tour owner
      await ctx.runMutation(internal.notifications.create, {
        userId: tour.userId,
        type: 'lead_captured',
        title: 'New lead captured',
        message: `${args.name} (${args.email}) expressed interest in "${tour.title}"`,
        tourId: args.tourId,
      })

      // Schedule branded email notification to tour owner
      const owner = await ctx.db.get(tour.userId)
      if (owner) {
        const shouldNotify = owner.notificationPreferences?.newLeads !== false
        if (shouldNotify) {
          await ctx.scheduler.runAfter(0, internal.emails.sendLeadNotification, {
            ownerEmail: owner.email,
            ownerName: owner.name,
            leadName: args.name,
            leadEmail: args.email,
            tourTitle: tour.title,
            leadPhone: args.phone,
            leadMessage: args.message,
          })
        }
      }
    }

    return leadId
  },
})

export const updateStatus = mutation({
  args: {
    leadId: v.id('leads'),
    status: v.union(
      v.literal('new'),
      v.literal('contacted'),
      v.literal('qualified'),
      v.literal('archived')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    await ctx.db.patch(args.leadId, { status: args.status })
  },
})

export const addNote = mutation({
  args: {
    leadId: v.id('leads'),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const lead = await ctx.db.get(args.leadId)
    if (!lead) throw new Error('Lead not found')

    const notes = lead.notes ?? []
    notes.push({ text: args.text, createdAt: Date.now() })

    await ctx.db.patch(args.leadId, { notes })
  },
})

export const remove = mutation({
  args: { leadId: v.id('leads') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await ctx.db.delete(args.leadId)
  },
})

export const exportCsv = action({
  args: {
    tourId: v.optional(v.id('tours')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    // Fetch leads through the public query
    let leads: any[]
    if (args.tourId) {
      leads = await ctx.runQuery(internal.leads.listByTourInternal, {
        tourId: args.tourId,
      })
    } else {
      leads = await ctx.runQuery(internal.leads.listAllInternal, {
        clerkId: identity.subject,
      })
    }

    // Build CSV
    const headers = ['Name', 'Email', 'Phone', 'Message', 'Status', 'Source', 'Date']
    const rows = leads.map((lead: any) => [
      lead.name,
      lead.email,
      lead.phone ?? '',
      (lead.message ?? '').replace(/"/g, '""'),
      lead.status ?? 'new',
      lead.source ?? '',
      new Date(lead._creationTime).toISOString(),
    ])

    const csv =
      headers.join(',') +
      '\n' +
      rows.map((row: string[]) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

    return csv
  },
})

// Internal queries for export action
export const listByTourInternal = internalQuery({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('leads')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .order('desc')
      .collect()
  },
})

export const listAllInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    if (!user) return []

    const tours = await ctx.db
      .query('tours')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    const allLeads = await Promise.all(
      tours.map((tour) =>
        ctx.db
          .query('leads')
          .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
          .collect()
      )
    )

    return allLeads.flat().sort((a, b) => b._creationTime - a._creationTime)
  },
})

// Send email notification to tour owner when a new lead is captured
export const sendLeadNotification = internalAction({
  args: {
    ownerEmail: v.string(),
    ownerName: v.string(),
    leadName: v.string(),
    leadEmail: v.string(),
    leadPhone: v.optional(v.string()),
    leadMessage: v.optional(v.string()),
    tourTitle: v.string(),
    tourSlug: v.string(),
  },
  handler: async (_ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured, skipping lead notification email')
      return
    }

    const contactDetails = [
      `Name: ${args.leadName}`,
      `Email: ${args.leadEmail}`,
      args.leadPhone ? `Phone: ${args.leadPhone}` : null,
      args.leadMessage ? `Message: ${args.leadMessage}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'Spazeo <notifications@spazeo.io>',
          to: [args.ownerEmail],
          subject: `New lead on "${args.tourTitle}"`,
          html: `
            <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #D4A017;">New Lead Captured</h2>
              <p>Hi ${args.ownerName},</p>
              <p>Someone expressed interest in your tour <strong>"${args.tourTitle}"</strong>.</p>
              <div style="background: #1B1916; border-radius: 8px; padding: 16px; margin: 16px 0; color: #F5F3EF;">
                <p style="margin: 4px 0;"><strong>Name:</strong> ${args.leadName}</p>
                <p style="margin: 4px 0;"><strong>Email:</strong> ${args.leadEmail}</p>
                ${args.leadPhone ? `<p style="margin: 4px 0;"><strong>Phone:</strong> ${args.leadPhone}</p>` : ''}
                ${args.leadMessage ? `<p style="margin: 4px 0;"><strong>Message:</strong> ${args.leadMessage}</p>` : ''}
              </div>
              <p>
                <a href="https://spazeo.io/dashboard/leads" style="display: inline-block; background: #D4A017; color: #0A0908; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  View in Dashboard
                </a>
              </p>
              <p style="color: #6B6560; font-size: 12px; margin-top: 24px;">
                You're receiving this because you have lead notifications enabled for your Spazeo account.
              </p>
            </div>
          `,
          text: `New lead on "${args.tourTitle}"\n\n${contactDetails}\n\nView in dashboard: https://spazeo.io/dashboard/leads`,
        }),
      })
    } catch (error) {
      console.error('Failed to send lead notification email:', error)
    }
  },
})
