import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { consumeRateLimit } from './rateLimit'
import { requireAdmin } from './authHelpers'

const MAX_MERGE_HOPS = 10

type DbCtx = MutationCtx | QueryCtx

/** Follow mergedInto until the live visitor (cap 10 hops). Never rewrite pointers. */
export async function resolveChain(
  ctx: DbCtx,
  visitorId: Id<'visitors'>
): Promise<Doc<'visitors'> | null> {
  let current = await ctx.db.get(visitorId)
  for (let hop = 0; hop < MAX_MERGE_HOPS && current?.mergedInto; hop++) {
    current = await ctx.db.get(current.mergedInto)
  }
  if (current?.mergedInto) return null // chain too long / cycle
  return current
}

async function lookupByIdentity(
  ctx: MutationCtx,
  kind: 'device' | 'fingerprint' | 'network' | 'phone',
  value: string
): Promise<Doc<'visitors'> | null> {
  const row = await ctx.db
    .query('visitorIdentities')
    .withIndex('by_kind_value', (q) => q.eq('kind', kind).eq('value', value))
    .first()
  if (!row) return null
  return resolveChain(ctx, row.visitorId)
}

async function upsertIdentity(
  ctx: MutationCtx,
  visitorId: Id<'visitors'>,
  kind: 'device' | 'fingerprint' | 'network' | 'phone',
  value: string,
  sourceConfidence?: number
): Promise<void> {
  const now = Date.now()
  const existing = await ctx.db
    .query('visitorIdentities')
    .withIndex('by_kind_value', (q) => q.eq('kind', kind).eq('value', value))
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      visitorId,
      lastSeenAt: now,
      seenCount: existing.seenCount + 1,
      ...(sourceConfidence !== undefined ? { sourceConfidence } : {}),
    })
    return
  }

  await ctx.db.insert('visitorIdentities', {
    visitorId,
    kind,
    value,
    firstSeenAt: now,
    lastSeenAt: now,
    seenCount: 1,
    sourceConfidence,
  })
}

async function upsertHousehold(
  ctx: MutationCtx,
  networkKey: string,
  city?: string
): Promise<Doc<'households'>> {
  const now = Date.now()
  const existing = await ctx.db
    .query('households')
    .withIndex('by_networkKey', (q) => q.eq('networkKey', networkKey))
    .unique()

  if (!existing) {
    const id = await ctx.db.insert('households', {
      networkKey,
      type: 'residential',
      visitorCount: 0,
      firstSeenAt: now,
      lastSeenAt: now,
      city,
    })
    const created = await ctx.db.get(id)
    if (!created) throw new Error('Failed to create household')
    return created
  }

  await ctx.db.patch(existing._id, {
    lastSeenAt: now,
    ...(city ? { city } : {}),
  })
  const updated = await ctx.db.get(existing._id)
  if (!updated) throw new Error('Household missing after patch')
  return updated
}

/**
 * activityLog.type has no signal_conflict / dual_phone_conflict literals and
 * requires userId — cannot audit anonymous visitor conflicts there. Skip.
 */
function flagForReview(
  _a: Id<'visitors'>,
  _b: Id<'visitors'>,
  _reason: string
): void {
  // ponytail: no activityLog sink for anonymous visitor review flags
}

export const resolve = mutation({
  args: {
    deviceId: v.optional(v.string()),
    fingerprintHash: v.optional(v.string()),
    fpConfidence: v.optional(v.number()),
    networkKey: v.optional(v.string()),
    sessionId: v.string(),
    city: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    micromarket: v.optional(v.string()),
    micromarketSource: v.optional(
      v.union(
        v.literal('declared'),
        v.literal('qr_campaign'),
        v.literal('tour_intent'),
        v.literal('geolocation'),
        v.literal('ip')
      )
    ),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `visitors:resolve:${args.sessionId}`, {
      windowMs: 60 * 60 * 1000,
      max: 60,
    })

    const now = Date.now()
    type Candidate = {
      visitor: Doc<'visitors'>
      weight: number
      reason: 'device' | 'fingerprint'
    }
    const candidates: Candidate[] = []

    if (args.deviceId) {
      const vDoc = await lookupByIdentity(ctx, 'device', args.deviceId)
      if (vDoc) {
        candidates.push({ visitor: vDoc, weight: 60, reason: 'device' })
      }
    }

    if (args.fingerprintHash) {
      const vDoc = await lookupByIdentity(ctx, 'fingerprint', args.fingerprintHash)
      if (vDoc) {
        candidates.push({ visitor: vDoc, weight: 70, reason: 'fingerprint' })
      }
    }

    let visitor: Doc<'visitors'>
    let confidence: number

    if (candidates.length === 0) {
      const id = await ctx.db.insert('visitors', {
        firstSeenAt: now,
        lastSeenAt: now,
        totalSessions: 1,
        totalToursViewed: 0,
        totalSecondsViewed: 0,
        confidence: 55,
        identityTier: 'device',
        city: args.city,
        countryCode: args.countryCode,
        micromarket: args.micromarket,
        micromarketSource: args.micromarketSource,
      })
      const created = await ctx.db.get(id)
      if (!created) throw new Error('Failed to create visitor')
      visitor = created
      confidence = 55
    } else {
      const ids = new Set(candidates.map((c) => c.visitor._id))
      if (ids.size === 1) {
        visitor = candidates[0].visitor
        const hasDevice = candidates.some((c) => c.reason === 'device')
        const hasFp = candidates.some((c) => c.reason === 'fingerprint')
        confidence = hasDevice && hasFp ? 85 : Math.max(...candidates.map((c) => c.weight))
      } else {
        const fpCand = candidates.find((c) => c.reason === 'fingerprint')
        const deviceCand = candidates.find((c) => c.reason === 'device')
        // Prefer fingerprint; do not merge device candidate into it
        visitor = fpCand?.visitor ?? candidates[0].visitor
        confidence = 65
        if (fpCand && deviceCand) {
          flagForReview(deviceCand.visitor._id, fpCand.visitor._id, 'signal_conflict')
        }
      }

      // Never downgrade a phone-anchored visitor
      if (
        visitor.identityTier === 'identified' ||
        visitor.identityTier === 'verified'
      ) {
        confidence = Math.max(confidence, visitor.confidence)
      }

      await ctx.db.patch(visitor._id, {
        lastSeenAt: now,
        totalSessions: visitor.totalSessions + 1,
        confidence,
        ...(args.city ? { city: args.city } : {}),
        ...(args.countryCode ? { countryCode: args.countryCode } : {}),
        ...(args.micromarket ? { micromarket: args.micromarket } : {}),
        ...(args.micromarketSource
          ? { micromarketSource: args.micromarketSource }
          : {}),
      })
      const refreshed = await ctx.db.get(visitor._id)
      if (!refreshed) throw new Error('Visitor missing after patch')
      visitor = refreshed
    }

    // Tier from strongest present signal (skip if already phone-anchored)
    if (
      visitor.identityTier !== 'identified' &&
      visitor.identityTier !== 'verified'
    ) {
      let tier: Doc<'visitors'>['identityTier'] = 'session'
      if (args.fingerprintHash) tier = 'fingerprint'
      else if (args.deviceId) tier = 'device'
      if (tier !== visitor.identityTier) {
        await ctx.db.patch(visitor._id, { identityTier: tier })
        visitor = { ...visitor, identityTier: tier }
      }
    }

    if (args.deviceId) {
      await upsertIdentity(ctx, visitor._id, 'device', args.deviceId)
    }
    if (args.fingerprintHash) {
      await upsertIdentity(
        ctx,
        visitor._id,
        'fingerprint',
        args.fingerprintHash,
        args.fpConfidence
      )
    }
    if (args.networkKey) {
      await upsertIdentity(ctx, visitor._id, 'network', args.networkKey)
    }

    if (args.networkKey) {
      let hh = await upsertHousehold(ctx, args.networkKey, args.city)
      const alreadyIn =
        visitor.householdId !== undefined && visitor.householdId === hh._id
      if (!alreadyIn) {
        const nextCount = hh.visitorCount + 1
        const nextType = nextCount > 8 ? 'carrier_gateway' : hh.type
        await ctx.db.patch(hh._id, {
          visitorCount: nextCount,
          type: nextType,
          lastSeenAt: now,
        })
        const updatedHh = await ctx.db.get(hh._id)
        if (updatedHh) hh = updatedHh
      }
      if (hh.type !== 'carrier_gateway') {
        if (visitor.householdId !== hh._id) {
          await ctx.db.patch(visitor._id, { householdId: hh._id })
          visitor = { ...visitor, householdId: hh._id }
        }
      }
    }

    const live = await resolveChain(ctx, visitor._id)
    if (!live) throw new Error('Visitor resolve chain broken')
    return live
  },
})

/** Public (no auth): only what the tour page's welcome-back needs. Never phoneHash/geo. */
export const get = query({
  args: { id: v.id('visitors') },
  handler: async (ctx, args) => {
    const live = await resolveChain(ctx, args.id)
    if (!live) return null
    return {
      _id: live._id,
      identified: live.phoneHash != null,
      lastSceneId: live.lastSceneId,
    }
  },
})

const TOUCH_SCENE_SAME_SCENE_MS = 30_000
const TOUCH_SCENE_MAX_PER_MIN = 30

/** Persist last scene for Welcome-back resume (open tour, no login). */
export const touchScene = mutation({
  args: {
    visitorId: v.id('visitors'),
    sceneId: v.id('scenes'),
    tourId: v.optional(v.id('tours')),
  },
  handler: async (ctx, args) => {
    const live = await resolveChain(ctx, args.visitorId)
    if (!live) return null
    // Throttle (public, unauthenticated): skip same-scene re-touches, and cap
    // scene changes per visitor. Over-limit calls are dropped, not thrown.
    if (
      live.lastSceneId === args.sceneId &&
      Date.now() - live.lastSeenAt < TOUCH_SCENE_SAME_SCENE_MS
    ) {
      return live._id
    }
    try {
      await consumeRateLimit(ctx, `visitors:touchScene:${live._id}`, {
        windowMs: 60_000,
        max: TOUCH_SCENE_MAX_PER_MIN,
      })
    } catch {
      return live._id
    }
    await ctx.db.patch(live._id, {
      lastSceneId: args.sceneId,
      ...(args.tourId ? { lastTourId: args.tourId } : {}),
      lastSeenAt: Date.now(),
    })
    return live._id
  },
})

async function shareIdentity(
  ctx: MutationCtx,
  a: Id<'visitors'>,
  b: Id<'visitors'>,
  kind: 'device' | 'fingerprint'
): Promise<boolean> {
  const rowsA = await ctx.db
    .query('visitorIdentities')
    .withIndex('by_visitorId', (q) => q.eq('visitorId', a))
    .collect()
  const values = new Set(
    rowsA.filter((r) => r.kind === kind).map((r) => r.value)
  )
  if (values.size === 0) return false
  const rowsB = await ctx.db
    .query('visitorIdentities')
    .withIndex('by_visitorId', (q) => q.eq('visitorId', b))
    .collect()
  return rowsB.some((r) => r.kind === kind && values.has(r.value))
}

async function countVisitorsForPhoneHash(
  ctx: MutationCtx,
  phoneHash: string
): Promise<number> {
  const rows = await ctx.db
    .query('visitorIdentities')
    .withIndex('by_kind_value', (q) => q.eq('kind', 'phone').eq('value', phoneHash))
    .collect()
  const ids = new Set<string>()
  for (const r of rows) {
    const live = await resolveChain(ctx, r.visitorId)
    if (live) ids.add(live._id)
  }
  return ids.size
}

async function mergeVisitors(
  ctx: MutationCtx,
  loserId: Id<'visitors'>,
  winnerId: Id<'visitors'>,
  corroboratedBy: 'device' | 'fingerprint'
): Promise<Doc<'visitors'>> {
  const now = Date.now()
  const loser = await ctx.db.get(loserId)
  const winner = await ctx.db.get(winnerId)
  if (!loser || !winner) throw new Error('Merge targets missing')
  if (loser.phoneHash && winner.phoneHash && loser.phoneHash !== winner.phoneHash) {
    flagForReview(loserId, winnerId, 'dual_phone_conflict')
    return winner
  }

  const identities = await ctx.db
    .query('visitorIdentities')
    .withIndex('by_visitorId', (q) => q.eq('visitorId', loserId))
    .collect()
  for (const row of identities) {
    await ctx.db.patch(row._id, { visitorId: winnerId })
  }

  const analytics = await ctx.db
    .query('analytics')
    .withIndex('by_visitorId', (q) => q.eq('visitorId', loserId))
    .collect()
  for (const row of analytics) {
    await ctx.db.patch(row._id, { visitorId: winnerId })
  }

  const leads = await ctx.db
    .query('leads')
    .withIndex('by_visitorId', (q) => q.eq('visitorId', loserId))
    .collect()
  for (const row of leads) {
    await ctx.db.patch(row._id, { visitorId: winnerId })
  }

  await ctx.db.patch(winnerId, {
    totalSessions: winner.totalSessions + loser.totalSessions,
    totalSecondsViewed: winner.totalSecondsViewed + loser.totalSecondsViewed,
    totalToursViewed: winner.totalToursViewed + loser.totalToursViewed,
    firstSeenAt: Math.min(winner.firstSeenAt, loser.firstSeenAt),
    confidence: 95,
    identityTier: 'identified',
    phoneHash: winner.phoneHash ?? loser.phoneHash,
    phoneFirstSeenAt:
      winner.phoneFirstSeenAt ?? loser.phoneFirstSeenAt ?? now,
    phoneSubmitCount:
      (winner.phoneSubmitCount ?? 0) + (loser.phoneSubmitCount ?? 0),
    phoneCountryCode: winner.phoneCountryCode ?? loser.phoneCountryCode,
    lastSeenAt: now,
  })

  await ctx.db.patch(loserId, {
    mergedInto: winnerId,
    mergedAt: now,
  })

  await ctx.db.insert('visitorMerges', {
    winnerId,
    loserId,
    reason: 'phone_match_corroborated',
    corroboratedBy,
    movedIdentities: identities.length,
    movedAnalytics: analytics.length,
    movedLeads: leads.length,
    mergedAt: now,
  })

  const live = await ctx.db.get(winnerId)
  if (!live) throw new Error('Winner missing after merge')
  return live
}

/**
 * Attach an unverified phone from the lead form.
 * Merge only when phone matches AND device/fingerprint corroborates.
 */
export async function attachPhoneCore(
  ctx: MutationCtx,
  args: {
    phone: string
    sessionId: string
    currentVisitorId: Id<'visitors'>
  }
): Promise<Doc<'visitors'> | null> {
  const { toE164, hashPhone, phoneCountryCode } = await import('./phoneHash')
  const e164 = toE164(args.phone)
  if (!e164) throw new Error('Invalid phone number')

  const phoneHash = await hashPhone(e164)
  const now = Date.now()
  const current = await resolveChain(ctx, args.currentVisitorId)
  if (!current) throw new Error('Visitor not found')

  if ((await countVisitorsForPhoneHash(ctx, phoneHash)) > 5) {
    flagForReview(current._id, current._id, 'phone_hash_fanout')
    await upsertIdentity(ctx, current._id, 'phone', phoneHash)
    await ctx.db.patch(current._id, {
      phoneHash,
      phoneFirstSeenAt: current.phoneFirstSeenAt ?? now,
      phoneSubmitCount: (current.phoneSubmitCount ?? 0) + 1,
      phoneCountryCode: phoneCountryCode(e164),
      identityTier: 'identified',
      confidence: Math.max(current.confidence, 90),
    })
    return resolveChain(ctx, current._id)
  }

  const byPhone = await ctx.db
    .query('visitors')
    .withIndex('by_phoneHash', (q) => q.eq('phoneHash', phoneHash))
    .first()
  const existing = byPhone ? await resolveChain(ctx, byPhone._id) : null

  if (!existing) {
    await ctx.db.patch(current._id, {
      phoneHash,
      phoneFirstSeenAt: now,
      phoneSubmitCount: 1,
      phoneCountryCode: phoneCountryCode(e164),
      identityTier: 'identified',
      confidence: 90,
      lastSeenAt: now,
    })
    await upsertIdentity(ctx, current._id, 'phone', phoneHash)
    return resolveChain(ctx, current._id)
  }

  if (existing._id === current._id) {
    await ctx.db.patch(existing._id, {
      phoneSubmitCount: (existing.phoneSubmitCount ?? 0) + 1,
      lastSeenAt: now,
      confidence: Math.max(existing.confidence, 90),
      identityTier: 'identified',
    })
    return resolveChain(ctx, existing._id)
  }

  let corroboration: 'fingerprint' | 'device' | null = null
  if (await shareIdentity(ctx, current._id, existing._id, 'fingerprint')) {
    corroboration = 'fingerprint'
  } else if (await shareIdentity(ctx, current._id, existing._id, 'device')) {
    corroboration = 'device'
  }

  if (!corroboration) {
    await upsertIdentity(ctx, current._id, 'phone', phoneHash)
    await ctx.db.patch(current._id, {
      phoneHash,
      phoneFirstSeenAt: current.phoneFirstSeenAt ?? now,
      phoneSubmitCount: (current.phoneSubmitCount ?? 0) + 1,
      phoneCountryCode: phoneCountryCode(e164),
      identityTier: 'identified',
      confidence: 90,
      lastSeenAt: now,
    })
    flagForReview(current._id, existing._id, 'phone_match_uncorroborated')
    return resolveChain(ctx, current._id)
  }

  return mergeVisitors(ctx, current._id, existing._id, corroboration)
}

export const attachPhone = mutation({
  args: {
    phone: v.string(),
    sessionId: v.string(),
    currentVisitorId: v.id('visitors'),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `visitors:attachPhone:${args.sessionId}`, {
      windowMs: 60 * 60 * 1000,
      max: 10,
    })
    return attachPhoneCore(ctx, args)
  },
})

/** Reverse a corroborated phone merge recorded in visitorMerges. */
export const unmerge = mutation({
  args: { mergeId: v.id('visitorMerges') },
  handler: async (ctx, args) => {
    // Visitors/merges are global, cross-tenant records (not owned by a single
    // tour/user), so this is gated to admins rather than a per-resource owner check.
    await requireAdmin(ctx)

    const merge = await ctx.db.get(args.mergeId)
    if (!merge) throw new Error('Merge not found')
    if (merge.revertedAt) throw new Error('Merge already reverted')

    const loser = await ctx.db.get(merge.loserId)
    const winner = await ctx.db.get(merge.winnerId)
    if (!loser || !winner) throw new Error('Merge endpoints missing')

    // Re-point identities that currently sit on winner and originally belonged
    // to loser — best-effort: identities whose firstSeenAt <= merge time and
    // that match loser history are ambiguous; we only clear mergedInto on loser
    // and subtract denormalised counters that were added at merge time.
    await ctx.db.patch(merge.loserId, {
      mergedInto: undefined,
      mergedAt: undefined,
    })
    await ctx.db.patch(merge.winnerId, {
      totalSessions: Math.max(0, winner.totalSessions - (loser.totalSessions || 0)),
      totalSecondsViewed: Math.max(
        0,
        winner.totalSecondsViewed - (loser.totalSecondsViewed || 0)
      ),
      totalToursViewed: Math.max(
        0,
        winner.totalToursViewed - (loser.totalToursViewed || 0)
      ),
    })
    await ctx.db.patch(args.mergeId, { revertedAt: Date.now() })

    // ponytail: identity/analytics/leads rows stay on winner; full surgical
    // restore needs moved-id lists — upgrade path if mis-merges become common.
    return { ok: true as const }
  },
})

const periodArg = v.optional(
  v.union(v.literal('7d'), v.literal('30d'), v.literal('90d'), v.literal('all'))
)

const VISITOR_LIST_EVENT_SCAN_CAP = 800

function periodStartOf(period: '7d' | '30d' | '90d' | 'all' | undefined): number {
  if (period === 'all') return 0
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  return Date.now() - days * 24 * 60 * 60 * 1000
}

const LIST_CAP = 200

type SectionKey =
  | 'homepage'
  | 'plans'
  | 'location'
  | 'price'
  | 'media'
  | 'specifications'

const EMPTY_SECTIONS = (): Record<SectionKey, number> => ({
  homepage: 0,
  plans: 0,
  location: 0,
  price: 0,
  media: 0,
  specifications: 0,
})

function metaStr(metadata: unknown, key: string): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined
  const value = (metadata as Record<string, unknown>)[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function campaignFromMeta(metadata: unknown) {
  return {
    utmSource: metaStr(metadata, 'utm_source'),
    utmMedium: metaStr(metadata, 'utm_medium'),
    utmCampaign: metaStr(metadata, 'utm_campaign'),
    src: metaStr(metadata, 'src'),
    mlid: metaStr(metadata, 'mlid'),
    cid: metaStr(metadata, 'cid'),
    mm: metaStr(metadata, 'mm'),
  }
}

function metaCity(metadata: unknown): string | undefined {
  return metaStr(metadata, 'city')
}

function mergeCampaign(
  into: ReturnType<typeof campaignFromMeta>,
  from: ReturnType<typeof campaignFromMeta>
) {
  if (!into.utmSource && from.utmSource) into.utmSource = from.utmSource
  if (!into.utmMedium && from.utmMedium) into.utmMedium = from.utmMedium
  if (!into.utmCampaign && from.utmCampaign) into.utmCampaign = from.utmCampaign
  if (!into.src && from.src) into.src = from.src
  if (!into.mlid && from.mlid) into.mlid = from.mlid
  if (!into.cid && from.cid) into.cid = from.cid
  if (!into.mm && from.mm) into.mm = from.mm
}

function bucketScene(title: string, panoramaType?: string): SectionKey {
  if (panoramaType === 'floor_plan') return 'plans'
  const t = title.toLowerCase()
  if (/\b(plan|layout|typical|master plan|floor plan|site plan)\b/.test(t)) {
    return 'plans'
  }
  if (/\b(price|pricing|cost|payment|lakh|crore|starting)\b/.test(t)) {
    return 'price'
  }
  if (/\b(location|map|connectivity|nearby|neighbourhood|neighborhood|google map)\b/.test(t)) {
    return 'location'
  }
  if (/\b(spec|amenit|bhk|sqft|sq ft|area|unit type)\b/.test(t)) {
    return 'specifications'
  }
  if (/\b(home|lobby|entrance|arrival|reception|drop[- ]?off)\b/.test(t)) {
    return 'homepage'
  }
  return 'media'
}

function sectionFromMeta(metadata: unknown): SectionKey | undefined {
  const s = metaStr(metadata, 'section')
  if (
    s === 'homepage' ||
    s === 'plans' ||
    s === 'location' ||
    s === 'price' ||
    s === 'media' ||
    s === 'specifications'
  ) {
    return s
  }
  return undefined
}

const SECTION_KEYS: SectionKey[] = [
  'homepage',
  'plans',
  'location',
  'price',
  'media',
  'specifications',
]

const VIEW_EVENTS = new Set([
  'tour_view',
  'building_view',
  'model_view',
  'scene_view',
  'floor_select',
  'unit_select',
  'unit_click',
  'map_view',
  'geo_map',
  'master_plan',
  'hotspot_media_view',
  'variant_view',
  'hotspot_click',
])

function metaFlag(metadata: unknown, key: string): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  return (metadata as Record<string, unknown>)[key] === true
}

function blobFromMeta(metadata: unknown): string {
  return [
    metaStr(metadata, 'hotspotType'),
    metaStr(metadata, 'iconName'),
    metaStr(metadata, 'icon'),
    metaStr(metadata, 'title'),
    metaStr(metadata, 'tooltip'),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function bucketHotspot(metadata: unknown): SectionKey | null {
  const type = metaStr(metadata, 'hotspotType')
  const icon = (
    metaStr(metadata, 'iconName') ??
    metaStr(metadata, 'icon') ??
    ''
  ).toLowerCase()
  const blob = blobFromMeta(metadata)
  if (icon === 'price' || /\b(price|pricing|cost|payment|lakh|crore)\b/.test(blob)) {
    return 'price'
  }
  if (icon === 'area' || /\b(spec|amenit|bhk|sqft|sq ft|unit type)\b/.test(blob)) {
    return 'specifications'
  }
  if (/\b(location|map|nearby|connect)/.test(blob)) return 'location'
  if (icon === 'home' || /\b(lobby|entrance|arrival)\b/.test(blob)) return 'homepage'
  if (type === 'media' || icon === 'camera' || icon === 'play') return 'media'
  if (type === 'navigation') return null
  return null
}

function bucketEvent(
  event: string,
  metadata: unknown,
  sceneBucket?: SectionKey
): SectionKey | null {
  if (
    event === 'scene_view' ||
    event === 'scene_exit' ||
    event === 'variant_view' ||
    event === 'variant_switch'
  ) {
    return sceneBucket ?? sectionFromMeta(metadata) ?? 'media'
  }
  if (event === 'hotspot_click' || event === 'hotspot_media_view') {
    return bucketHotspot(metadata) ?? (event === 'hotspot_media_view' ? 'media' : sectionFromMeta(metadata) ?? null)
  }
  const fromMeta = sectionFromMeta(metadata)
  if (fromMeta) return fromMeta
  if (event === 'tour_view' || event === 'building_view' || event === 'model_view') {
    return 'homepage'
  }
  if (event === 'floor_select' || event === 'master_plan') return 'plans'
  if (event === 'map_view' || event === 'geo_map') return 'location'
  if (event === 'unit_select' || event === 'unit_click') return 'specifications'
  if (sceneBucket) return sceneBucket
  return null
}

type VisitAcc = {
  views: number
  firstSeen: number
  lastSeen: number
  lastTourId?: Id<'tours'>
  sessionIds: Set<string>
  projects: Set<string>
  deviceType?: string
  platform?: string
  cid?: string
  mlid?: string
  micromarket?: string
  locationKind?: 'Actual' | 'Intent' | 'IP Based' | '—'
  geoCity?: string
  geoCountry?: string
  sections: Record<SectionKey, number>
  sceneSections: Record<SectionKey, number>
  sectionViews: Record<SectionKey, number>
  sceneStats: Map<string, { views: number; seconds: number; yawSamples: number }>
}

function emptyAcc(timestamp: number): VisitAcc {
  return {
    views: 0,
    firstSeen: timestamp,
    lastSeen: timestamp,
    sessionIds: new Set<string>(),
    projects: new Set<string>(),
    sections: EMPTY_SECTIONS(),
    sceneSections: EMPTY_SECTIONS(),
    sectionViews: EMPTY_SECTIONS(),
    sceneStats: new Map(),
  }
}

function bumpScene(
  acc: VisitAcc,
  sceneId: string | undefined,
  delta: { views?: number; seconds?: number; yawSamples?: number }
) {
  if (!sceneId) return
  const cur = acc.sceneStats.get(sceneId) ?? {
    views: 0,
    seconds: 0,
    yawSamples: 0,
  }
  cur.views += delta.views ?? 0
  cur.seconds += delta.seconds ?? 0
  cur.yawSamples += delta.yawSamples ?? 0
  acc.sceneStats.set(sceneId, cur)
}

function absorbMeta(acc: VisitAcc, metadata: unknown, deviceType?: string) {
  if (deviceType && !acc.deviceType) acc.deviceType = deviceType
  const src = metaStr(metadata, 'src')
  const qr = metaStr(metadata, 'qr')
  const platform =
    src === 'qr' || qr
      ? 'QR'
      : (metaStr(metadata, 'utm_source') ?? src ?? acc.platform)
  if (platform) acc.platform = platform
  const cid =
    metaStr(metadata, 'cid') ??
    metaStr(metadata, 'camp') ??
    metaStr(metadata, 'utm_campaign') ??
    acc.cid
  if (cid) acc.cid = cid
  const mlid = metaStr(metadata, 'mlid') ?? acc.mlid
  if (mlid) acc.mlid = mlid
  const mm = metaStr(metadata, 'mm') ?? acc.micromarket
  if (mm) {
    acc.micromarket = mm
    acc.locationKind = 'Actual'
  }
  const city = metaStr(metadata, 'city') ?? acc.geoCity
  if (city) acc.geoCity = city
  const country = metaStr(metadata, 'country') ?? acc.geoCountry
  if (country) acc.geoCountry = country
}

function mergeAcc(into: VisitAcc, from: VisitAcc) {
  into.views += from.views
  into.firstSeen = Math.min(into.firstSeen, from.firstSeen)
  if (from.lastSeen >= into.lastSeen) {
    into.lastSeen = from.lastSeen
    into.lastTourId = from.lastTourId
    if (from.deviceType) into.deviceType = from.deviceType
  }
  for (const id of from.sessionIds) into.sessionIds.add(id)
  for (const name of from.projects) into.projects.add(name)
  if (!into.platform && from.platform) into.platform = from.platform
  if (!into.cid && from.cid) into.cid = from.cid
  if (!into.mlid && from.mlid) into.mlid = from.mlid
  if (!into.micromarket && from.micromarket) into.micromarket = from.micromarket
  if (into.locationKind !== 'Actual' && from.locationKind) {
    into.locationKind = from.locationKind
  }
  if (!into.geoCity && from.geoCity) into.geoCity = from.geoCity
  if (!into.geoCountry && from.geoCountry) into.geoCountry = from.geoCountry
  for (const key of Object.keys(into.sections) as SectionKey[]) {
    into.sections[key] += from.sections[key]
    into.sceneSections[key] += from.sceneSections[key]
    into.sectionViews[key] += from.sectionViews[key]
  }
  for (const [id, st] of from.sceneStats) {
    const cur = into.sceneStats.get(id) ?? {
      views: 0,
      seconds: 0,
      yawSamples: 0,
    }
    cur.views += st.views
    cur.seconds += st.seconds
    cur.yawSamples += st.yawSamples
    into.sceneStats.set(id, cur)
  }
}

function locationKind(
  source: Doc<'visitors'>['micromarketSource'] | undefined,
  city?: string
): 'Actual' | 'Intent' | 'IP Based' | '—' {
  if (source === 'declared' || source === 'geolocation' || source === 'qr_campaign') {
    return 'Actual'
  }
  if (source === 'tour_intent') return 'Intent'
  if (source === 'ip' || city) return 'IP Based'
  return '—'
}

/** Owner-only visitor sheet. Never returns phoneHash, identity values, or network keys. */
export const listForOwner = query({
  args: { period: periodArg },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
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
    const tourTitle = new Map(tours.map((t) => [t._id as string, t.title]))
    const tourAddress = new Map(
      tours.map((t) => [t._id as string, t.address?.trim() || undefined])
    )
    const tourIds = new Set(tours.map((t) => t._id))
    const periodStart = periodStartOf(args.period)

    const sceneBucket = new Map<string, SectionKey>()
    const sceneTitle = new Map<string, string>()
    for (const tour of tours) {
      const scenes = await ctx.db
        .query('scenes')
        .withIndex('by_tourId', (q) => q.eq('tourId', tour._id))
        .collect()
      for (const scene of scenes) {
        sceneBucket.set(scene._id, bucketScene(scene.title, scene.panoramaType))
        sceneTitle.set(scene._id, scene.title)
      }
    }

    const raw = new Map<string, VisitAcc>()

    const touch = (
      key: string,
      tourId: Id<'tours'> | undefined,
      projectLabel: string | undefined,
      sessionId: string,
      timestamp: number,
      duration: number | undefined,
      event: string,
      metadata: unknown,
      deviceType: string | undefined,
      sceneId: string | undefined
    ) => {
      const cur = raw.get(key) ?? emptyAcc(timestamp)
      cur.views += 1
      cur.firstSeen = Math.min(cur.firstSeen, timestamp)
      if (timestamp >= cur.lastSeen) {
        cur.lastSeen = timestamp
        if (tourId) cur.lastTourId = tourId
      }
      cur.sessionIds.add(sessionId)
      if (tourId) {
        const title = tourTitle.get(tourId)
        if (title) cur.projects.add(title)
      }
      if (projectLabel) cur.projects.add(projectLabel)
      absorbMeta(cur, metadata, deviceType)
      if (event === 'view_direction') {
        if (sceneId && !metaFlag(metadata, 'linked')) {
          bumpScene(cur, sceneId, { yawSamples: 1 })
        }
        raw.set(key, cur)
        return
      }
      if (event === 'session_end') {
        raw.set(key, cur)
        return
      }
      const linked = metaFlag(metadata, 'linked')
      if (sceneId && !linked) {
        if (event === 'scene_view' || event === 'variant_view') {
          bumpScene(cur, sceneId, { views: 1 })
        }
        if (
          event === 'scene_exit' &&
          typeof duration === 'number' &&
          duration > 0
        ) {
          bumpScene(cur, sceneId, { seconds: duration })
        }
      }
      const bucket = bucketEvent(
        event,
        metadata,
        sceneId ? sceneBucket.get(sceneId) : undefined
      )
      if (bucket) {
        if (VIEW_EVENTS.has(event) && !linked) {
          if (event !== 'hotspot_click' || bucketHotspot(metadata)) {
            cur.sectionViews[bucket] += 1
          }
        }
        if (duration && duration > 0) {
          if (event === 'section_dwell') cur.sections[bucket] += duration
          else if (event === 'scene_exit') cur.sceneSections[bucket] += duration
        }
      }
      raw.set(key, cur)
    }

    type FlatEvent = {
      visitorId?: Id<'visitors'>
      sessionId: string
      tourId?: Id<'tours'>
      projectLabel?: string
      timestamp: number
      duration?: number
      event: string
      metadata: unknown
      deviceType?: string
      sceneId?: string
    }
    const flat: FlatEvent[] = []

    for (const tour of tours) {
      const events = await ctx.db
        .query('analytics')
        .withIndex('by_tourId_timestamp', (q) =>
          q.eq('tourId', tour._id).gte('timestamp', periodStart)
        )
        .order('desc')
        // ponytail: hard cap — this was a fully unbounded per-tour scan and was
        // OOM-crashing the self-hosted backend under real traffic. See analytics.ts
        // DASHBOARD_EVENT_SCAN_CAP comment for the same failure mode.
        .take(VISITOR_LIST_EVENT_SCAN_CAP)
      for (const e of events) {
        flat.push({
          visitorId: e.visitorId,
          sessionId: e.sessionId,
          tourId: tour._id,
          timestamp: e.timestamp,
          duration: e.duration,
          event: e.event,
          metadata: e.metadata,
          deviceType: e.deviceType,
          sceneId: e.sceneId,
        })
      }
    }

    const buildings = await ctx.db
      .query('buildings')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
    for (const building of buildings) {
      const events = await ctx.db
        .query('buildingAnalytics')
        .withIndex('by_buildingId_timestamp', (q) =>
          q.eq('buildingId', building._id).gte('timestamp', periodStart)
        )
        .order('desc')
        .take(VISITOR_LIST_EVENT_SCAN_CAP)
      for (const e of events) {
        flat.push({
          visitorId: e.visitorId,
          sessionId: e.sessionId,
          projectLabel: building.name,
          timestamp: e.timestamp,
          duration: e.duration,
          event: e.event,
          metadata: e.metadata,
          deviceType: e.device,
        })
      }
    }

    const sessionVisitor = new Map<string, Id<'visitors'>>()
    for (const e of flat) {
      if (e.visitorId) sessionVisitor.set(e.sessionId, e.visitorId)
    }
    for (const e of flat) {
      const vid = e.visitorId ?? sessionVisitor.get(e.sessionId)
      const key = vid ?? `session:${e.sessionId}`
      touch(
        key,
        e.tourId,
        e.projectLabel,
        e.sessionId,
        e.timestamp,
        e.duration,
        e.event,
        e.metadata,
        e.deviceType,
        e.sceneId
      )
    }

    type Ranked = {
      rowKey: string
      visitorId: string
      globalId: string
      acc: VisitAcc
      live?: Doc<'visitors'>
    }
    const ranked: Ranked[] = []

    // ponytail: raw can hold thousands of distinct keys for a heavy tenant. Sort by
    // recency and only resolve identity (a DB read per key, previously done for every
    // key with an O(n) `.find()` merge lookup — O(n^2) and unbounded I/O) for a bounded
    // slice up front. LIST_CAP is the real display limit; the buffer accounts for merges
    // collapsing multiple raw keys into fewer live visitors.
    const RESOLVE_BUFFER = LIST_CAP * 4
    const rawEntries = [...raw.entries()]
      .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
      .slice(0, RESOLVE_BUFFER)

    const rankedByLiveId = new Map<string, Ranked>()
    for (const [key, acc] of rawEntries) {
      if (key.startsWith('session:')) {
        ranked.push({
          rowKey: key,
          visitorId: key.slice('session:'.length),
          globalId: key.slice('session:'.length),
          acc,
        })
        continue
      }
      const live = await resolveChain(ctx, key as Id<'visitors'>)
      if (!live) continue
      const existing = rankedByLiveId.get(live._id)
      if (existing) {
        mergeAcc(existing.acc, acc)
        continue
      }
      const entry: Ranked = {
        rowKey: live._id,
        visitorId: live._id,
        globalId: live._id,
        acc,
        live,
      }
      rankedByLiveId.set(live._id, entry)
      ranked.push(entry)
    }

    ranked.sort((a, b) => b.acc.lastSeen - a.acc.lastSeen)
    const capped = ranked.slice(0, LIST_CAP)

    const rows = []
    for (const { rowKey, visitorId, globalId, acc, live } of capped) {
      const leads = live
        ? await ctx.db
            .query('leads')
            .withIndex('by_visitorId', (q) => q.eq('visitorId', live._id))
            .collect()
        : []
      const ownedLeads = leads
        .filter((l) => tourIds.has(l.tourId))
        .sort((a, b) => b._creationTime - a._creationTime)
      const lead = ownedLeads[0]
      const sections = EMPTY_SECTIONS()
      for (const key of SECTION_KEYS) {
        sections[key] =
          acc.sections[key] > 0 ? acc.sections[key] : acc.sceneSections[key]
      }
      const sectionSum =
        sections.homepage +
        sections.plans +
        sections.location +
        sections.price +
        sections.media +
        sections.specifications
      const intentMm = acc.lastTourId
        ? tourAddress.get(acc.lastTourId)
        : undefined
      const sceneSeconds = [...acc.sceneStats.values()].reduce(
        (sum, st) => sum + st.seconds,
        0
      )
      const scenes = [...acc.sceneStats.entries()]
        .map(([id, st]) => ({
          sceneId: id,
          title: sceneTitle.get(id) ?? id.slice(-6),
          views: st.views || (st.seconds > 0 ? 1 : 0),
          seconds: st.seconds,
          yawSamples: st.yawSamples,
        }))
        .sort(
          (a, b) =>
            b.seconds - a.seconds ||
            b.views - a.views ||
            a.title.localeCompare(b.title)
        )
      const locKind: 'Actual' | 'Intent' | 'IP Based' | '—' = live?.micromarketSource
        ? locationKind(live.micromarketSource, live.city ?? acc.geoCity)
        : acc.locationKind === 'Actual'
          ? 'Actual'
          : intentMm
            ? 'Intent'
            : locationKind(undefined, live?.city ?? acc.geoCity)
      const geoCity = live?.city ?? acc.geoCity
      const micromarket =
        live?.micromarket ??
        acc.micromarket ??
        lead?.micromarket ??
        (locKind === 'Intent' ? intentMm : undefined)

      rows.push({
        rowKey,
        visitorId,
        dateTs: acc.lastSeen,
        globalId,
        mlid: acc.mlid,
        frequency: acc.sessionIds.size || live?.totalSessions || 1,
        projects: [...acc.projects],
        isLead: lead != null,
        leadId: lead?._id,
        leadCreatedAt: lead?._creationTime,
        leadName: lead?.name,
        leadEmail: lead?.email,
        leadPhone: lead?.phoneNormalized ?? lead?.phone,
        platform: acc.platform ?? 'Direct',
        cid: acc.cid,
        micromarket,
        locationKind: locKind,
        geoCity,
        geoCountry: live?.countryCode ?? acc.geoCountry,
        device: acc.deviceType,
        totalSeconds:
          sceneSeconds || sectionSum || live?.totalSecondsViewed || 0,
        scenes,
        sessionIds: [...acc.sessionIds],
      })
    }

    return rows
  },
})

const TIMELINE_SKIP = new Set(['view_direction'])

/** Owner popup: session timeline, lead, and scene list for heatmaps. Never returns IP, phoneHash, or fingerprints. */
export const getDetailForOwner = query({
  args: {
    visitorId: v.optional(v.id('visitors')),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.visitorId && !args.sessionId) return null
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
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
    const tourIds = new Set(tours.map((t) => t._id))
    const tourTitle = new Map(tours.map((t) => [t._id as string, t.title]))

    const buildings = await ctx.db
      .query('buildings')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
    const buildingIds = new Set(buildings.map((b) => b._id))
    const buildingName = new Map(buildings.map((b) => [b._id as string, b.name]))

    // Events may be stored under the passed (pre-merge) id or the live id.
    const liveVisitor = args.visitorId ? await resolveChain(ctx, args.visitorId) : null
    const visitorIdSet = new Set<string>()
    if (args.visitorId) visitorIdSet.add(args.visitorId)
    if (liveVisitor) visitorIdSet.add(liveVisitor._id)
    // Only expose visitor-level fields if the visitor actually touched an owned tour/building.
    let visitorLinked = false

    type Ev = {
      _id: string
      event: string
      sessionId: string
      tourId?: string
      buildingId?: string
      sceneId?: string
      duration?: number
      timestamp: number
      metadata?: unknown
      deviceType?: string
      city?: string
      country?: string
      floor?: number
      unitNumber?: string
      timeOfDay?: string
    }
    const merged = new Map<string, Ev>()

    const add = (e: Ev) => {
      if (!merged.has(e._id)) merged.set(e._id, e)
    }

    for (const vid of visitorIdSet) {
      const visitorKey = vid as Id<'visitors'>
      const rows = await ctx.db
        .query('analytics')
        .withIndex('by_visitorId', (q) => q.eq('visitorId', visitorKey))
        .collect()
      for (const e of rows) {
        if (!tourIds.has(e.tourId)) continue
        visitorLinked = true
        add({
          _id: e._id,
          event: e.event,
          sessionId: e.sessionId,
          tourId: e.tourId,
          sceneId: e.sceneId,
          duration: e.duration,
          timestamp: e.timestamp,
          metadata: e.metadata,
          deviceType: e.deviceType,
          city: e.city,
          country: e.country,
        })
      }
      const bRows = await ctx.db
        .query('buildingAnalytics')
        .withIndex('by_visitorId', (q) => q.eq('visitorId', visitorKey))
        .collect()
      for (const e of bRows) {
        if (!buildingIds.has(e.buildingId)) continue
        visitorLinked = true
        add({
          _id: e._id,
          event: e.event,
          sessionId: e.sessionId,
          buildingId: e.buildingId,
          duration: e.duration,
          timestamp: e.timestamp,
          metadata: e.metadata,
          deviceType: e.device,
          city: metaCity(e.metadata),
          country: metaStr(e.metadata, 'country'),
          floor: e.floor,
          unitNumber: e.unitNumber,
          timeOfDay: e.timeOfDay,
        })
      }
    }

    const sessionIds = new Set<string>()
    if (args.sessionId) sessionIds.add(args.sessionId)
    for (const e of merged.values()) sessionIds.add(e.sessionId)

    for (const sid of sessionIds) {
      const rows = await ctx.db
        .query('analytics')
        .withIndex('by_sessionId', (q) => q.eq('sessionId', sid))
        .collect()
      for (const e of rows) {
        if (!tourIds.has(e.tourId)) continue
        if (e.visitorId && visitorIdSet.has(e.visitorId)) visitorLinked = true
        add({
          _id: e._id,
          event: e.event,
          sessionId: e.sessionId,
          tourId: e.tourId,
          sceneId: e.sceneId,
          duration: e.duration,
          timestamp: e.timestamp,
          metadata: e.metadata,
          deviceType: e.deviceType,
          city: e.city,
          country: e.country,
        })
      }
      const bRows = await ctx.db
        .query('buildingAnalytics')
        .withIndex('by_sessionId', (q) => q.eq('sessionId', sid))
        .collect()
      for (const e of bRows) {
        if (!buildingIds.has(e.buildingId)) continue
        if (e.visitorId && visitorIdSet.has(e.visitorId)) visitorLinked = true
        add({
          _id: e._id,
          event: e.event,
          sessionId: e.sessionId,
          buildingId: e.buildingId,
          duration: e.duration,
          timestamp: e.timestamp,
          metadata: e.metadata,
          deviceType: e.device,
          city: metaCity(e.metadata),
          country: metaStr(e.metadata, 'country'),
          floor: e.floor,
          unitNumber: e.unitNumber,
          timeOfDay: e.timeOfDay,
        })
      }
    }

    const events = [...merged.values()].sort((a, b) => a.timestamp - b.timestamp)
    if (events.length === 0) return null

    const sessionsMap = new Map<
      string,
      {
        sessionId: string
        startedAt: number
        endedAt: number
        tourTitle?: string
        buildingName?: string
        device?: string
        city?: string
        country?: string
        hotspotClicks: number
        yawSamples: number
        eventCount: number
        homepageSec: number
        plansSec: number
        locationSec: number
        priceSec: number
        mediaSec: number
        specificationsSec: number
        homepageViews: number
        plansViews: number
        locationViews: number
        priceViews: number
        mediaViews: number
        specificationsViews: number
        campaign: ReturnType<typeof campaignFromMeta>
        sceneYaw: Map<string, number>
        sceneStats: Map<string, { views: number; seconds: number }>
      }
    >()
    const sceneYaw = new Map<string, number>()
    const sceneStatsAll = new Map<string, { views: number; seconds: number }>()
    const sceneIds = new Set<string>()

    const bumpSessionScene = (
      map: Map<string, { views: number; seconds: number }>,
      sceneId: string,
      delta: { views?: number; seconds?: number }
    ) => {
      const cur = map.get(sceneId) ?? { views: 0, seconds: 0 }
      cur.views += delta.views ?? 0
      cur.seconds += delta.seconds ?? 0
      map.set(sceneId, cur)
    }

    for (const e of events) {
      let s = sessionsMap.get(e.sessionId)
      if (!s) {
        s = {
          sessionId: e.sessionId,
          startedAt: e.timestamp,
          endedAt: e.timestamp,
          hotspotClicks: 0,
          yawSamples: 0,
          eventCount: 0,
          homepageSec: 0,
          plansSec: 0,
          locationSec: 0,
          priceSec: 0,
          mediaSec: 0,
          specificationsSec: 0,
          homepageViews: 0,
          plansViews: 0,
          locationViews: 0,
          priceViews: 0,
          mediaViews: 0,
          specificationsViews: 0,
          campaign: campaignFromMeta(undefined),
          sceneYaw: new Map(),
          sceneStats: new Map(),
        }
        sessionsMap.set(e.sessionId, s)
      }
      s.startedAt = Math.min(s.startedAt, e.timestamp)
      s.endedAt = Math.max(s.endedAt, e.timestamp)
      s.eventCount += 1
      mergeCampaign(s.campaign, campaignFromMeta(e.metadata))
      if (e.event === 'hotspot_click') s.hotspotClicks += 1
      if (e.event === 'view_direction') {
        s.yawSamples += 1
        if (e.sceneId) {
          s.sceneYaw.set(e.sceneId, (s.sceneYaw.get(e.sceneId) ?? 0) + 1)
        }
      }
      if (
        e.event === 'section_dwell' &&
        typeof e.duration === 'number' &&
        e.duration > 0
      ) {
        const section = metaStr(e.metadata, 'section')
        if (section === 'homepage') s.homepageSec += e.duration
        else if (section === 'plans') s.plansSec += e.duration
        else if (section === 'location') s.locationSec += e.duration
        else if (section === 'price') s.priceSec += e.duration
        else if (section === 'media') s.mediaSec += e.duration
        else if (section === 'specifications') s.specificationsSec += e.duration
      }
      const viewBucket = bucketEvent(e.event, e.metadata)
      if (
        viewBucket &&
        VIEW_EVENTS.has(e.event) &&
        !metaFlag(e.metadata, 'linked')
      ) {
        if (e.event !== 'hotspot_click' || bucketHotspot(e.metadata)) {
          if (viewBucket === 'homepage') s.homepageViews += 1
          else if (viewBucket === 'plans') s.plansViews += 1
          else if (viewBucket === 'location') s.locationViews += 1
          else if (viewBucket === 'price') s.priceViews += 1
          else if (viewBucket === 'media') s.mediaViews += 1
          else if (viewBucket === 'specifications') s.specificationsViews += 1
        }
      }
      if (e.deviceType && !s.device) s.device = e.deviceType
      if (e.city && !s.city) s.city = e.city
      if (e.country && !s.country) s.country = e.country
      if (e.tourId) s.tourTitle = tourTitle.get(e.tourId) ?? s.tourTitle
      if (e.buildingId) s.buildingName = buildingName.get(e.buildingId) ?? s.buildingName
      if (e.sceneId) {
        sceneIds.add(e.sceneId)
        if (e.event === 'view_direction') {
          sceneYaw.set(e.sceneId, (sceneYaw.get(e.sceneId) ?? 0) + 1)
        }
        if (!metaFlag(e.metadata, 'linked')) {
          if (e.event === 'scene_view' || e.event === 'variant_view') {
            bumpSessionScene(s.sceneStats, e.sceneId, { views: 1 })
            bumpSessionScene(sceneStatsAll, e.sceneId, { views: 1 })
          }
          if (
            e.event === 'scene_exit' &&
            typeof e.duration === 'number' &&
            e.duration > 0
          ) {
            bumpSessionScene(s.sceneStats, e.sceneId, { seconds: e.duration })
            bumpSessionScene(sceneStatsAll, e.sceneId, { seconds: e.duration })
          }
        }
      }
    }

    const sceneTitles: Record<string, string> = {}
    for (const sid of sceneIds) {
      const scene = await ctx.db.get(sid as Id<'scenes'>)
      if (scene) sceneTitles[sid] = scene.title
    }

    const live = visitorLinked ? liveVisitor : null
    const leadSeen = new Set<string>()
    const leadCandidates: Doc<'leads'>[] = []
    const takeLeads = (rows: Doc<'leads'>[]) => {
      for (const row of rows) {
        if (leadSeen.has(row._id)) continue
        if (!tourIds.has(row.tourId)) continue
        leadSeen.add(row._id)
        leadCandidates.push(row)
      }
    }
    if (live) {
      takeLeads(
        await ctx.db
          .query('leads')
          .withIndex('by_visitorId', (q) => q.eq('visitorId', live._id))
          .collect()
      )
    }
    for (const sid of sessionsMap.keys()) {
      takeLeads(
        await ctx.db
          .query('leads')
          .withIndex('by_sessionId', (q) => q.eq('sessionId', sid))
          .collect()
      )
    }
    leadCandidates.sort((a, b) => b._creationTime - a._creationTime)
    const leadRow = leadCandidates[0]
    const lead = leadRow
      ? {
          _id: leadRow._id,
          name: leadRow.name,
          email: leadRow.email,
          phone: leadRow.phoneNormalized ?? leadRow.phone,
          status: leadRow.status ?? 'new',
          message: leadRow.message,
          source: leadRow.source,
          micromarket: leadRow.micromarket,
          createdAt: leadRow._creationTime,
          tourTitle: tourTitle.get(leadRow.tourId as string),
          sessionId: leadRow.sessionId,
          timeSpent: leadRow.timeSpent,
          deviceInfo: leadRow.deviceInfo,
          locationInfo: leadRow.locationInfo,
          notes: (leadRow.notes ?? []).map((n) => ({
            text: n.text,
            createdAt: n.createdAt,
          })),
        }
      : null

    const timelineBySession = new Map<string, typeof events>()
    for (const e of events) {
      if (TIMELINE_SKIP.has(e.event)) continue
      const arr = timelineBySession.get(e.sessionId) ?? []
      arr.push(e)
      timelineBySession.set(e.sessionId, arr)
    }
    const timeline = [...timelineBySession.values()]
      .flatMap((arr) => arr.slice(-150))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => ({
        _id: e._id,
        event: e.event,
        sessionId: e.sessionId,
        tourTitle: e.tourId ? tourTitle.get(e.tourId) : undefined,
        buildingName: e.buildingId ? buildingName.get(e.buildingId) : undefined,
        sceneId: e.sceneId,
        sceneTitle: e.sceneId ? sceneTitles[e.sceneId] : undefined,
        duration: e.duration,
        timestamp: e.timestamp,
        section: metaStr(e.metadata, 'section'),
        floor: e.floor,
        unitNumber: e.unitNumber,
        timeOfDay: e.timeOfDay,
        src: metaStr(e.metadata, 'src') ?? metaStr(e.metadata, 'utm_source'),
      }))

    const mapScenes = (
      ids: Iterable<string>,
      yawMap: Map<string, number>,
      statsMap: Map<string, { views: number; seconds: number }>
    ) => {
      const all = new Set([...ids, ...yawMap.keys(), ...statsMap.keys()])
      return [...all]
        .map((id) => {
          const st = statsMap.get(id) ?? { views: 0, seconds: 0 }
          return {
            sceneId: id as Id<'scenes'>,
            title: sceneTitles[id] ?? id.slice(-6),
            yawSamples: yawMap.get(id) ?? 0,
            views: st.views || (st.seconds > 0 ? 1 : 0),
            seconds: st.seconds,
          }
        })
        .sort(
          (a, b) =>
            b.seconds - a.seconds ||
            b.views - a.views ||
            b.yawSamples - a.yawSamples ||
            a.title.localeCompare(b.title)
        )
    }

    const sessions = [...sessionsMap.values()]
      .map((s) => {
        const { sceneYaw: yawMap, sceneStats: statsMap, ...rest } = s
        return {
          ...rest,
          homepageViews: s.homepageViews || (s.homepageSec > 0 ? 1 : 0),
          plansViews: s.plansViews || (s.plansSec > 0 ? 1 : 0),
          locationViews: s.locationViews || (s.locationSec > 0 ? 1 : 0),
          priceViews: s.priceViews || (s.priceSec > 0 ? 1 : 0),
          mediaViews: s.mediaViews || (s.mediaSec > 0 ? 1 : 0),
          specificationsViews:
            s.specificationsViews || (s.specificationsSec > 0 ? 1 : 0),
          durationSec: Math.max(0, Math.round((s.endedAt - s.startedAt) / 1000)),
          scenes: mapScenes(statsMap.keys(), yawMap, statsMap),
        }
      })
      .sort((a, b) => b.startedAt - a.startedAt)

    const scenes = mapScenes(sceneIds, sceneYaw, sceneStatsAll)

    return {
      visitorId: live?._id,
      identityTier: live?.identityTier,
      micromarket: live?.micromarket,
      micromarketSource: live?.micromarketSource,
      geoCity: live?.city ?? events.find((e) => e.city)?.city,
      geoCountry: live?.countryCode ?? events.find((e) => e.country)?.country,
      locationKind: locationKind(
        live?.micromarketSource,
        live?.city ?? events.find((e) => e.city)?.city
      ),
      totalSessions: live?.totalSessions ?? sessions.length,
      totalSeconds: live?.totalSecondsViewed,
      sessions,
      scenes,
      lead,
      timeline,
    }
  },
})

