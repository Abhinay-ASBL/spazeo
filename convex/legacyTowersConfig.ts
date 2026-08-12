import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireAdmin, requireAdminKey } from './authHelpers'

const heightSampleValidator = v.object({
  heightM: v.number(),
  floor: v.number(),
  label: v.string(),
})

const towerValidator = v.object({
  id: v.string(),
  name: v.string(),
  tagline: v.optional(v.string()),
  floorPlanStorageId: v.optional(v.id('_storage')),
  heroStorageId: v.optional(v.id('_storage')),
  heroLeftPct: v.optional(v.number()),
  heroTopPct: v.optional(v.number()),
  heroRightPct: v.optional(v.number()),
  heroBottomPct: v.optional(v.number()),
})

const cornerValidator = v.object({
  id: v.string(),
  direction: v.string(),
  sitePlanLeftPct: v.number(),
  sitePlanTopPct: v.number(),
  floorPlanLeftPct: v.number(),
  floorPlanTopPct: v.number(),
})

const unitTypeValidator = v.object({
  id: v.string(),
  name: v.string(),
  bhk: v.number(),
  areaSqft: v.optional(v.number()),
  layoutStorageId: v.optional(v.id('_storage')),
  towerId: v.optional(v.string()),
  points: v.optional(
    v.array(v.object({ leftPct: v.number(), topPct: v.number() }))
  ),
  balconyYawRad: v.optional(v.number()),
  balconyYawRads: v.optional(v.array(v.object({ heightM: v.number(), yawRad: v.number() }))),
  balconyHotspots: v.optional(
    v.array(
      v.object({
        id: v.string(),
        heightM: v.number(),
        x: v.number(),
        y: v.number(),
        z: v.number(),
        title: v.string(),
        description: v.optional(v.string()),
        lineHeight: v.optional(v.number()),
      })
    )
  ),
  balconyStickyLabels: v.optional(
    v.array(
      v.object({
        id: v.string(),
        heightM: v.number(),
        text: v.string(),
        x: v.optional(v.number()),
        y: v.optional(v.number()),
        z: v.optional(v.number()),
        size: v.optional(v.number()),
      })
    )
  ),
})

const panoramaValidator = v.object({
  towerId: v.string(),
  cornerId: v.string(),
  heightM: v.number(),
  storageId: v.id('_storage'),
  timeOfDay: v.optional(v.string()),
  unitId: v.optional(v.string()),
  vertexIndex: v.optional(v.number()),
})

async function resolveStorageUrls<T extends Record<string, unknown>>(
  ctx: { storage: { getUrl: (id: string) => Promise<string | null> } },
  obj: T,
  keys: string[]
) {
  const out: Record<string, unknown> = { ...obj }
  for (const k of keys) {
    const storageId = obj[k] as string | undefined
    if (storageId) {
      out[k.replace(/StorageId$/, 'Url')] = await ctx.storage.getUrl(storageId)
    } else {
      out[k.replace(/StorageId$/, 'Url')] = null
    }
  }
  return out
}

// ─── Queries ────────────────────────────────────────────────────────────────

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const cfg = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!cfg) return null

    const heroUrl = cfg.heroStorageId ? await ctx.storage.getUrl(cfg.heroStorageId) : null
    const sitePlanUrl = cfg.sitePlanStorageId
      ? await ctx.storage.getUrl(cfg.sitePlanStorageId)
      : null

    const towers = await Promise.all(
      cfg.towers.map((t) => resolveStorageUrls(ctx, t, ['floorPlanStorageId', 'heroStorageId']))
    )
    const unitTypes = await Promise.all(
      cfg.unitTypes.map((u) => resolveStorageUrls(ctx, u, ['layoutStorageId']))
    )
    const panoramas = await Promise.all(
      cfg.panoramas.map(async (p) => ({
        ...p,
        imageUrl: await ctx.storage.getUrl(p.storageId),
      }))
    )

    return {
      ...cfg,
      heroUrl,
      sitePlanUrl,
      towers,
      unitTypes,
      panoramas,
    }
  },
})

// ─── Mutations ──────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation(async (ctx) => {
  await requireAdmin(ctx)
  return await ctx.storage.generateUploadUrl()
})

// Called by bulk-upload CLI script with admin key (no user session available)
export const generateUploadUrlAdmin = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, args) => {
    requireAdminKey(args.adminKey)
    return await ctx.storage.generateUploadUrl()
  },
})

export const upsert = mutation({
  args: {
    slug: v.string(),
    projectName: v.string(),
    projectTagline: v.optional(v.string()),
    projectLocation: v.optional(v.string()),
    heroStorageId: v.optional(v.id('_storage')),
    sitePlanStorageId: v.optional(v.id('_storage')),
    totalFloors: v.number(),
    heightSamples: v.array(heightSampleValidator),
    towers: v.array(towerValidator),
    corners: v.array(cornerValidator),
    unitTypes: v.array(unitTypeValidator),
    panoramas: v.array(panoramaValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now })
      return existing._id
    }
    return await ctx.db.insert('legacyTowerConfigs', { ...args, updatedAt: now })
  },
})

export const patchMeta = mutation({
  args: {
    slug: v.string(),
    projectName: v.optional(v.string()),
    projectTagline: v.optional(v.string()),
    projectLocation: v.optional(v.string()),
    totalFloors: v.optional(v.number()),
    floorsPerSection: v.optional(v.number()),
    heroStorageId: v.optional(v.id('_storage')),
    sitePlanStorageId: v.optional(v.id('_storage')),
    heightSamples: v.optional(v.array(heightSampleValidator)),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found — seed first')

    const { slug: _slug, ...patch } = args
    void _slug
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    )
    await ctx.db.patch(existing._id, { ...clean, updatedAt: Date.now() })
  },
})

export const setTowers = mutation({
  args: { slug: v.string(), towers: v.array(towerValidator) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    if (args.towers.length === 0) throw new Error('Refusing to save empty towers array — bug guard')

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    await ctx.db.patch(existing._id, { towers: args.towers, updatedAt: Date.now() })
  },
})

export const setUnitTypes = mutation({
  args: { slug: v.string(), unitTypes: v.array(unitTypeValidator) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    await ctx.db.patch(existing._id, { unitTypes: args.unitTypes, updatedAt: Date.now() })
  },
})

export const setUnitBalconyYaw = mutation({
  args: {
    slug: v.string(),
    unitId: v.string(),
    heightM: v.number(),
    balconyYawRad: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const unitTypes = existing.unitTypes.map((u) => {
      if (u.id !== args.unitId) return u
      const prev = u.balconyYawRads ?? []
      let next: { heightM: number; yawRad: number }[]
      if (args.balconyYawRad === null) {
        next = prev.filter((e) => e.heightM !== args.heightM)
      } else {
        const existing2 = prev.filter((e) => e.heightM !== args.heightM)
        next = [...existing2, { heightM: args.heightM, yawRad: args.balconyYawRad }]
      }
      return { ...u, balconyYawRads: next.length > 0 ? next : undefined }
    })
    await ctx.db.patch(existing._id, { unitTypes, updatedAt: Date.now() })
  },
})

export const setUnitBalconyYawAllFloors = mutation({
  args: {
    slug: v.string(),
    unitId: v.string(),
    yawRad: v.number(),
    heightMs: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const unitTypes = existing.unitTypes.map((u) => {
      if (u.id !== args.unitId) return u
      const prev = u.balconyYawRads ?? []
      const kept = prev.filter((e) => !args.heightMs.includes(e.heightM))
      const added = args.heightMs.map((h) => ({ heightM: h, yawRad: args.yawRad }))
      return { ...u, balconyYawRads: [...kept, ...added] }
    })
    await ctx.db.patch(existing._id, { unitTypes, updatedAt: Date.now() })
  },
})

// Replaces all balcony hotspots for a unit at a single floor height.
export const setUnitBalconyHotspots = mutation({
  args: {
    slug: v.string(),
    unitId: v.string(),
    heightM: v.number(),
    hotspots: v.array(
      v.object({
        id: v.string(),
        x: v.number(),
        y: v.number(),
        z: v.number(),
        title: v.string(),
        description: v.optional(v.string()),
        lineHeight: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const unitTypes = existing.unitTypes.map((u) => {
      if (u.id !== args.unitId) return u
      const prev = u.balconyHotspots ?? []
      const kept = prev.filter((h) => h.heightM !== args.heightM)
      const added = args.hotspots.map((h) => ({ ...h, heightM: args.heightM }))
      const next = [...kept, ...added]
      return { ...u, balconyHotspots: next.length > 0 ? next : undefined }
    })
    await ctx.db.patch(existing._id, { unitTypes, updatedAt: Date.now() })
  },
})

// Replaces all sticky labels for a unit at a single floor height.
export const setUnitBalconyStickyLabels = mutation({
  args: {
    slug: v.string(),
    unitId: v.string(),
    heightM: v.number(),
    labels: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        x: v.optional(v.number()),
        y: v.optional(v.number()),
        z: v.optional(v.number()),
        size: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const unitTypes = existing.unitTypes.map((u) => {
      if (u.id !== args.unitId) return u
      const prev = u.balconyStickyLabels ?? []
      const kept = prev.filter((l) => l.heightM !== args.heightM)
      const added = args.labels.map((l) => ({ ...l, heightM: args.heightM }))
      const next = [...kept, ...added]
      return { ...u, balconyStickyLabels: next.length > 0 ? next : undefined }
    })
    await ctx.db.patch(existing._id, { unitTypes, updatedAt: Date.now() })
  },
})

// Copies one floor's hotspots to every floor (overwrites each floor's set).
export const setUnitBalconyHotspotsAllFloors = mutation({
  args: {
    slug: v.string(),
    unitId: v.string(),
    heightMs: v.array(v.number()),
    hotspots: v.array(
      v.object({
        id: v.string(),
        x: v.number(),
        y: v.number(),
        z: v.number(),
        title: v.string(),
        description: v.optional(v.string()),
        lineHeight: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const unitTypes = existing.unitTypes.map((u) => {
      if (u.id !== args.unitId) return u
      const prev = u.balconyHotspots ?? []
      const kept = prev.filter((h) => !args.heightMs.includes(h.heightM))
      const added = args.heightMs.flatMap((hm) =>
        args.hotspots.map((h) => ({ ...h, heightM: hm, id: `${h.id.split('__')[0]}__${hm}` }))
      )
      const next = [...kept, ...added]
      return { ...u, balconyHotspots: next.length > 0 ? next : undefined }
    })
    await ctx.db.patch(existing._id, { unitTypes, updatedAt: Date.now() })
  },
})

// Copies one floor's sticky labels to every floor (overwrites each floor's set).
export const setUnitBalconyStickyLabelsAllFloors = mutation({
  args: {
    slug: v.string(),
    unitId: v.string(),
    heightMs: v.array(v.number()),
    labels: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        x: v.optional(v.number()),
        y: v.optional(v.number()),
        z: v.optional(v.number()),
        size: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const unitTypes = existing.unitTypes.map((u) => {
      if (u.id !== args.unitId) return u
      const prev = u.balconyStickyLabels ?? []
      const kept = prev.filter((l) => !args.heightMs.includes(l.heightM))
      const added = args.heightMs.flatMap((hm) =>
        args.labels.map((l) => ({ ...l, heightM: hm, id: `${l.id.split('__')[0]}__${hm}` }))
      )
      const next = [...kept, ...added]
      return { ...u, balconyStickyLabels: next.length > 0 ? next : undefined }
    })
    await ctx.db.patch(existing._id, { unitTypes, updatedAt: Date.now() })
  },
})

// Copies one floor's sticky labels to every unit across every tower and every
// floor in the entire plan (overwrites each unit's set on the listed heightMs).
export const setUnitBalconyStickyLabelsAllPlan = mutation({
  args: {
    slug: v.string(),
    heightMs: v.array(v.number()),
    labels: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        x: v.optional(v.number()),
        y: v.optional(v.number()),
        z: v.optional(v.number()),
        size: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const unitTypes = existing.unitTypes.map((u) => {
      const prev = u.balconyStickyLabels ?? []
      const kept = prev.filter((l) => !args.heightMs.includes(l.heightM))
      const added = args.heightMs.flatMap((hm) =>
        args.labels.map((l) => ({ ...l, heightM: hm, id: `${l.id.split('__')[0]}__${hm}` }))
      )
      const next = [...kept, ...added]
      return { ...u, balconyStickyLabels: next.length > 0 ? next : undefined }
    })
    await ctx.db.patch(existing._id, { unitTypes, updatedAt: Date.now() })
  },
})

// Called by CLI scripts with admin key to restore tower data (no user session available)
export const setTowersAdmin = mutation({
  args: { slug: v.string(), towers: v.array(towerValidator), adminKey: v.string() },
  handler: async (ctx, args) => {
    requireAdminKey(args.adminKey)
    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')
    await ctx.db.patch(existing._id, { towers: args.towers, updatedAt: Date.now() })
  },
})

// Admin polygon recalibration via CLI (no user session available). Matches units by towerId + name.
export const setUnitPointsAdmin = mutation({
  args: {
    slug: v.string(),
    towerId: v.string(),
    units: v.array(
      v.object({
        name: v.string(),
        points: v.array(v.object({ leftPct: v.number(), topPct: v.number() })),
      })
    ),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdminKey(args.adminKey)
    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')
    const byName = new Map(args.units.map((u) => [u.name, u.points]))
    const unitTypes = existing.unitTypes.map((u) => {
      if (u.towerId !== args.towerId) return u
      const pts = byName.get(u.name)
      return pts ? { ...u, points: pts } : u
    })
    await ctx.db.patch(existing._id, { unitTypes, updatedAt: Date.now() })
  },
})

// Used by the bulk-upload CLI script (no user session available; admin key only)
export const addPanoramaAdmin = mutation({
  args: { slug: v.string(), panorama: panoramaValidator, adminKey: v.string() },
  handler: async (ctx, args) => {
    requireAdminKey(args.adminKey)
    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')
    const filtered = existing.panoramas.filter(
      (p) =>
        !(
          p.towerId === args.panorama.towerId &&
          p.cornerId === args.panorama.cornerId &&
          p.heightM === args.panorama.heightM
        )
    )
    await ctx.db.patch(existing._id, {
      panoramas: [...filtered, args.panorama],
      updatedAt: Date.now(),
    })
  },
})

export const addPanorama = mutation({
  args: { slug: v.string(), panorama: panoramaValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const filtered = existing.panoramas.filter(
      (p) =>
        !(
          p.towerId === args.panorama.towerId &&
          p.cornerId === args.panorama.cornerId &&
          p.heightM === args.panorama.heightM
        )
    )

    await ctx.db.patch(existing._id, {
      panoramas: [...filtered, args.panorama],
      updatedAt: Date.now(),
    })
  },
})

export const removePanorama = mutation({
  args: {
    slug: v.string(),
    towerId: v.string(),
    cornerId: v.string(),
    heightM: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const target = existing.panoramas.find(
      (p) =>
        p.towerId === args.towerId &&
        p.cornerId === args.cornerId &&
        p.heightM === args.heightM
    )
    if (target) {
      try {
        await ctx.storage.delete(target.storageId)
      } catch {}
    }

    await ctx.db.patch(existing._id, {
      panoramas: existing.panoramas.filter(
        (p) =>
          !(
            p.towerId === args.towerId &&
            p.cornerId === args.cornerId &&
            p.heightM === args.heightM
          )
      ),
      updatedAt: Date.now(),
    })
  },
})

// Migration: remap panoramas from old 44-floor heights to correct 50-floor heights.
// Old static samples (44-floor estimate): 35/67/99/131/163m
// Correct samples (G+50, 3.7m/floor):     37/74/111/148/185m
// Safe to run multiple times — already-correct heights pass through unchanged.
export const fixPanoramaHeights = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    // Maps old 44-floor heights → correct 50-floor heights
    const REMAP: Record<number, number> = {
      35: 37, 67: 74, 99: 111, 131: 148, 163: 185,
    }

    const remapped = existing.panoramas.map((p) => ({
      ...p,
      heightM: REMAP[p.heightM] ?? p.heightM,
    }))

    // Deduplicate: if remap creates duplicate tower|cornerId|heightM, keep last
    const seen = new Map<string, typeof remapped[number]>()
    for (const p of remapped) {
      seen.set(`${p.towerId}|${p.cornerId}|${p.heightM}`, p)
    }
    const deduped = Array.from(seen.values())

    await ctx.db.patch(existing._id, {
      panoramas: deduped,
      updatedAt: Date.now(),
    })

    return { before: existing.panoramas.length, after: deduped.length }
  },
})

export const fixStaleData = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!existing) throw new Error('Config not found')

    const CORRECT_BHK: Record<string, number> = {
      a1: 4, a2: 4, a3: 3, a4: 3, a5: 3, a6: 3, a7: 3, a8: 3, a9: 4, a10: 4,
      b1: 4, b2: 4, b3: 3, b4: 3, b5: 3, b6: 3, b7: 3, b8: 3, b9: 4, b10: 4,
      c1: 4, c2: 4, c3: 3, c4: 3, c5: 3, c6: 3, c7: 3, c8: 3, c9: 4, c10: 4,
    }

    const CORRECT_HERO: Record<string, { heroLeftPct: number; heroTopPct: number; heroRightPct: number; heroBottomPct: number }> = {
      A: { heroLeftPct: 26, heroTopPct: 34, heroRightPct: 40, heroBottomPct: 90 },
      C: { heroLeftPct: 67, heroTopPct: 34, heroRightPct: 82, heroBottomPct: 90 },
    }

    const fixedTowers = existing.towers.map((t) => {
      const h = CORRECT_HERO[t.id]
      if (!h) return t
      return { ...t, ...h }
    })

    const fixedUnits = existing.unitTypes.map((u) => {
      const bhk = CORRECT_BHK[u.id]
      if (bhk === undefined) return u
      return { ...u, bhk }
    })

    const unitsFixed = fixedUnits.filter((u, i) => u.bhk !== existing.unitTypes[i]?.bhk).length

    const patch: Record<string, unknown> = {
      projectTagline: 'Hyderabad · 3 towers · 50 floors',
      totalFloors: 50,
      heightSamples: [
        { heightM: 37,  floor: 10, label: '~Floor 10' },
        { heightM: 74,  floor: 20, label: '~Floor 20' },
        { heightM: 111, floor: 30, label: '~Floor 30' },
        { heightM: 148, floor: 40, label: '~Floor 40' },
        { heightM: 185, floor: 50, label: '~Floor 50' },
      ],
      unitTypes: fixedUnits,
      updatedAt: Date.now(),
    }
    // Only write towers if there are towers to write — guard against empty-array wipe
    if (fixedTowers.length > 0) patch.towers = fixedTowers
    await ctx.db.patch(existing._id, patch)

    return { towersFixed: Object.keys(CORRECT_HERO).length, unitsFixed }
  },
})

export const seedDefault = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    // Tower A & C units per floor (identical layout, mirror image)
    // Source: TA-1F 1.jpg / TC-1F.jpg floor plan images
    // Points: approximate 4-corner polygons on portrait floor plan (SVG 0–100 coords)
    const towerACUnits = (towerId: 'A' | 'C') => [
      // Row 1 — top, large 4BHK units
      { id: `${towerId.toLowerCase()}1`,  name: 'Unit 1',  bhk: 4, areaSqft: 3015, towerId, points: [{ leftPct: 54, topPct: 2  }, { leftPct: 97, topPct: 2  }, { leftPct: 97, topPct: 18 }, { leftPct: 54, topPct: 18 }] }, // W-facing
      { id: `${towerId.toLowerCase()}2`,  name: 'Unit 2',  bhk: 4, areaSqft: 3015, towerId, points: [{ leftPct: 3,  topPct: 2  }, { leftPct: 46, topPct: 2  }, { leftPct: 46, topPct: 18 }, { leftPct: 3,  topPct: 18 }] }, // E-facing
      // Row 2 — 3BHK
      { id: `${towerId.toLowerCase()}3`,  name: 'Unit 3',  bhk: 3, areaSqft: 1970, towerId, points: [{ leftPct: 54, topPct: 20 }, { leftPct: 97, topPct: 20 }, { leftPct: 97, topPct: 35 }, { leftPct: 54, topPct: 35 }] }, // W-facing
      { id: `${towerId.toLowerCase()}4`,  name: 'Unit 4',  bhk: 3, areaSqft: 1970, towerId, points: [{ leftPct: 3,  topPct: 20 }, { leftPct: 46, topPct: 20 }, { leftPct: 46, topPct: 35 }, { leftPct: 3,  topPct: 35 }] }, // E-facing
      // Row 3 — 3BHK
      { id: `${towerId.toLowerCase()}5`,  name: 'Unit 5',  bhk: 3, areaSqft: 1970, towerId, points: [{ leftPct: 54, topPct: 38 }, { leftPct: 97, topPct: 38 }, { leftPct: 97, topPct: 53 }, { leftPct: 54, topPct: 53 }] }, // W-facing
      { id: `${towerId.toLowerCase()}6`,  name: 'Unit 6',  bhk: 3, areaSqft: 1970, towerId, points: [{ leftPct: 3,  topPct: 38 }, { leftPct: 46, topPct: 38 }, { leftPct: 46, topPct: 53 }, { leftPct: 3,  topPct: 53 }] }, // E-facing
      // Row 4 — 3BHK
      { id: `${towerId.toLowerCase()}7`,  name: 'Unit 7',  bhk: 3, areaSqft: 1970, towerId, points: [{ leftPct: 54, topPct: 56 }, { leftPct: 97, topPct: 56 }, { leftPct: 97, topPct: 71 }, { leftPct: 54, topPct: 71 }] }, // W-facing
      { id: `${towerId.toLowerCase()}8`,  name: 'Unit 8',  bhk: 3, areaSqft: 1970, towerId, points: [{ leftPct: 3,  topPct: 56 }, { leftPct: 46, topPct: 56 }, { leftPct: 46, topPct: 71 }, { leftPct: 3,  topPct: 71 }] }, // E-facing
      // Row 5 — bottom, large 4BHK corner units
      { id: `${towerId.toLowerCase()}9`,  name: 'Unit 9',  bhk: 4, areaSqft: 2535, towerId, points: [{ leftPct: 54, topPct: 74 }, { leftPct: 97, topPct: 74 }, { leftPct: 97, topPct: 97 }, { leftPct: 54, topPct: 97 }] }, // N-facing
      { id: `${towerId.toLowerCase()}10`, name: 'Unit 10', bhk: 4, areaSqft: 2535, towerId, points: [{ leftPct: 3,  topPct: 74 }, { leftPct: 46, topPct: 74 }, { leftPct: 46, topPct: 97 }, { leftPct: 3,  topPct: 97 }] }, // E-facing
    ]

    // Tower B units per floor — T-shaped layout
    // Source: TB-1F.jpg floor plan image
    // Top section (4 large units), bottom section (6 units)
    const towerBUnits = [
      // Top section — 4 units across the wide bar (~0–45% height)
      { id: 'b1',  name: 'Unit 1',  bhk: 4, areaSqft: 2540, towerId: 'B', points: [{ leftPct: 76, topPct: 2  }, { leftPct: 98, topPct: 2  }, { leftPct: 98, topPct: 44 }, { leftPct: 76, topPct: 44 }] }, // W-facing
      { id: 'b2',  name: 'Unit 2',  bhk: 4, areaSqft: 2540, towerId: 'B', points: [{ leftPct: 52, topPct: 2  }, { leftPct: 74, topPct: 2  }, { leftPct: 74, topPct: 44 }, { leftPct: 52, topPct: 44 }] }, // E-facing
      { id: 'b9',  name: 'Unit 9',  bhk: 4, areaSqft: 2540, towerId: 'B', points: [{ leftPct: 2,  topPct: 2  }, { leftPct: 24, topPct: 2  }, { leftPct: 24, topPct: 44 }, { leftPct: 2,  topPct: 44 }] }, // E-facing
      { id: 'b10', name: 'Unit 10', bhk: 4, areaSqft: 2540, towerId: 'B', points: [{ leftPct: 26, topPct: 2  }, { leftPct: 50, topPct: 2  }, { leftPct: 50, topPct: 44 }, { leftPct: 26, topPct: 44 }] }, // W-facing
      // Bottom section — 6 units across the narrow bar (~47–98% height)
      { id: 'b3',  name: 'Unit 3',  bhk: 3, areaSqft: 2085, towerId: 'B', points: [{ leftPct: 82, topPct: 48 }, { leftPct: 98, topPct: 48 }, { leftPct: 98, topPct: 97 }, { leftPct: 82, topPct: 97 }] }, // N-facing
      { id: 'b4',  name: 'Unit 4',  bhk: 3, areaSqft: 1970, towerId: 'B', points: [{ leftPct: 66, topPct: 48 }, { leftPct: 80, topPct: 48 }, { leftPct: 80, topPct: 97 }, { leftPct: 66, topPct: 97 }] }, // N-facing
      { id: 'b5',  name: 'Unit 5',  bhk: 3, areaSqft: 1970, towerId: 'B', points: [{ leftPct: 50, topPct: 48 }, { leftPct: 64, topPct: 48 }, { leftPct: 64, topPct: 97 }, { leftPct: 50, topPct: 97 }] }, // N-facing
      { id: 'b6',  name: 'Unit 6',  bhk: 3, areaSqft: 1970, towerId: 'B', points: [{ leftPct: 36, topPct: 48 }, { leftPct: 50, topPct: 48 }, { leftPct: 50, topPct: 97 }, { leftPct: 36, topPct: 97 }] }, // N-facing
      { id: 'b7',  name: 'Unit 7',  bhk: 3, areaSqft: 1970, towerId: 'B', points: [{ leftPct: 20, topPct: 48 }, { leftPct: 34, topPct: 48 }, { leftPct: 34, topPct: 97 }, { leftPct: 20, topPct: 97 }] }, // N-facing
      { id: 'b8',  name: 'Unit 8',  bhk: 3, areaSqft: 2115, towerId: 'B', points: [{ leftPct: 2,  topPct: 48 }, { leftPct: 18, topPct: 48 }, { leftPct: 18, topPct: 97 }, { leftPct: 2,  topPct: 97 }] }, // E-facing
    ]

    const allUnits = [...towerACUnits('A'), ...towerBUnits, ...towerACUnits('C')]

    const existing = await ctx.db
      .query('legacyTowerConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (existing) {
      // Refresh unit types only — derived from static floor plans
      await ctx.db.patch(existing._id, {
        unitTypes: allUnits,
        updatedAt: Date.now(),
      })
      return existing._id
    }

    return await ctx.db.insert('legacyTowerConfigs', {
      slug: args.slug,
      projectName: 'ASBL Legacy Towers',
      projectTagline: 'Hyderabad · 3 towers · 50 floors',
      projectLocation: 'Hyderabad, India',
      totalFloors: 50,
      heightSamples: [
        { heightM: 37,  floor: 10, label: '~Floor 10' },
        { heightM: 74,  floor: 20, label: '~Floor 20' },
        { heightM: 111, floor: 30, label: '~Floor 30' },
        { heightM: 148, floor: 40, label: '~Floor 40' },
        { heightM: 185, floor: 50, label: '~Floor 50' },
      ],
      towers: [
        { id: 'A', name: 'Tower A', tagline: 'West block · Lake & city views',        heroLeftPct: 26, heroTopPct: 34, heroRightPct: 40, heroBottomPct: 90 },
        { id: 'B', name: 'Tower B', tagline: 'Central block · North courtyard views', heroLeftPct: 42, heroTopPct: 28, heroRightPct: 65, heroBottomPct: 90 },
        { id: 'C', name: 'Tower C', tagline: 'East block · City & sunset views',      heroLeftPct: 67, heroTopPct: 34, heroRightPct: 82, heroBottomPct: 90 },
      ],
      corners: [
        { id: 'A', direction: 'North-East', sitePlanLeftPct: 78, sitePlanTopPct: 18, floorPlanLeftPct: 82, floorPlanTopPct: 10 },
        { id: 'B', direction: 'East',       sitePlanLeftPct: 78, sitePlanTopPct: 78, floorPlanLeftPct: 82, floorPlanTopPct: 90 },
        { id: 'C', direction: 'North',      sitePlanLeftPct: 50, sitePlanTopPct: 14, floorPlanLeftPct: 50, floorPlanTopPct: 6  },
        { id: 'D', direction: 'South',      sitePlanLeftPct: 50, sitePlanTopPct: 82, floorPlanLeftPct: 50, floorPlanTopPct: 94 },
        { id: 'E', direction: 'North-West', sitePlanLeftPct: 22, sitePlanTopPct: 18, floorPlanLeftPct: 18, floorPlanTopPct: 10 },
        { id: 'F', direction: 'West',       sitePlanLeftPct: 22, sitePlanTopPct: 78, floorPlanLeftPct: 18, floorPlanTopPct: 90 },
      ],
      unitTypes: allUnits,
      panoramas: [],
      updatedAt: Date.now(),
    })
  },
})
