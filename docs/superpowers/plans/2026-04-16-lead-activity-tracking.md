# Lead Activity Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture per-visitor session activity on public tours — scenes viewed, dwell time, hotspot clicks, and yaw/pitch view direction — and link sessions to leads so tour owners can see each lead's full activity timeline plus an attention heatmap per scene.

**Architecture:** Event-log model on existing `analytics` table. New events emitted via a batching `trackBatch` mutation (10 events / 10s flush). Client-side `useSessionTracker` hook owns buffer + lifecycle; `usePanoramaTracking` wires PSV/R3F viewer events + 1Hz idle yaw sampler. Leads store `sessionId` for back-linking. Read-side queries derive session summaries and heatmap buckets; UI adds a lead activity drawer and an attention heatmap on the analytics page.

**Tech Stack:** Convex (schema, queries, mutations), Next.js 16 App Router, React 19, `@react-three/fiber` + `@react-three/drei` (current viewer), Tailwind v4, `crypto.randomUUID()`, `navigator.sendBeacon`.

**Spec:** `docs/superpowers/specs/2026-04-16-lead-activity-tracking-design.md`

---

## File Structure

**Backend (Convex)**
- Modify: `convex/schema.ts` — add `leads.sessionId` field + `by_sessionId` index.
- Modify: `convex/analytics.ts` — add `trackBatch`, `getBySession`, `getSessionsByTour`, `getYawHeatmap`, `getHotspotClickCounts`.
- Modify: `convex/leads.ts` — `capture` accepts `sessionId`; add `getWithActivity`.

**Frontend (Next.js)**
- Create: `src/hooks/useSessionTracker.ts` — buffer + flush + lifecycle.
- Create: `src/hooks/usePanoramaTracking.ts` — scene/hotspot/yaw instrumentation.
- Modify: `src/components/viewer/PanoramaViewer.tsx` — wire tracking callbacks.
- Modify: `src/app/tour/[slug]/page.tsx` — replace direct `track` calls with `useSessionTracker`, pass `sessionId` on lead submit, wire hotspot tracker.
- Create: `src/components/leads/LeadActivityDrawer.tsx` — timeline UI.
- Modify: `src/app/(dashboard)/leads/[id]/page.tsx` — mount activity drawer (create if missing).
- Create: `src/components/analytics/SessionsTable.tsx` — sessions list + drawer.
- Create: `src/components/analytics/AttentionHeatmap.tsx` — Canvas yaw/pitch overlay.
- Modify: `src/app/(dashboard)/analytics/[tourId]/page.tsx` or `analytics/page.tsx` — add Sessions tab + heatmap panel.

No automated test runner is configured; each phase ends with a **manual verification** step + commit. `npx convex dev` validates function contracts. Lint gates via `npm run lint`.

---

## Task 1: Schema — add `leads.sessionId` + index

**Files:**
- Modify: `convex/schema.ts` (leads table definition at line ~233)

- [ ] **Step 1: Add `sessionId` field and index to `leads` table**

In `convex/schema.ts`, locate the `leads: defineTable({ ... })` block. Add a new optional field after `locationInfo` and add `by_sessionId` index:

```ts
  leads: defineTable({
    tourId: v.id('tours'),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal('new'),
        v.literal('contacted'),
        v.literal('qualified'),
        v.literal('archived')
      )
    ),
    notes: v.optional(
      v.array(v.object({ text: v.string(), createdAt: v.number() }))
    ),
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
    sessionId: v.optional(v.string()),
  })
    .index('by_tourId', ['tourId'])
    .index('by_email', ['email'])
    .index('by_sessionId', ['sessionId']),
```

- [ ] **Step 2: Push schema via Convex dev**

Run: `npx convex dev --once`
Expected: `Schema validation` passes, `_generated/` regenerated with no errors. If it complains about existing leads lacking `sessionId`, the field is optional so it should succeed.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(schema): add sessionId to leads for activity tracking"
```

---

## Task 2: Backend — `analytics.trackBatch` mutation

**Files:**
- Modify: `convex/analytics.ts`

- [ ] **Step 1: Add `trackBatch` mutation**

Append to `convex/analytics.ts`:

```ts
export const trackBatch = mutation({
  args: {
    tourId: v.id('tours'),
    sessionId: v.string(),
    deviceType: v.optional(
      v.union(v.literal('desktop'), v.literal('mobile'), v.literal('tablet'))
    ),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    events: v.array(
      v.object({
        event: v.string(),
        sceneId: v.optional(v.id('scenes')),
        duration: v.optional(v.number()),
        metadata: v.optional(v.any()),
        timestamp: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    let tourViewEmitted = false
    for (const e of args.events) {
      await ctx.db.insert('analytics', {
        tourId: args.tourId,
        sessionId: args.sessionId,
        event: e.event,
        sceneId: e.sceneId,
        duration: e.duration,
        metadata: e.metadata,
        deviceType: args.deviceType,
        country: args.country,
        city: args.city,
        timestamp: e.timestamp ?? now,
      })
      if (e.event === 'tour_view') tourViewEmitted = true
    }
    if (tourViewEmitted) {
      const tour = await ctx.db.get(args.tourId)
      if (tour) {
        await ctx.db.patch(args.tourId, { viewCount: tour.viewCount + 1 })
      }
    }
  },
})
```

- [ ] **Step 2: Push to Convex dev**

Run: `npx convex dev --once`
Expected: no errors; `api.analytics.trackBatch` now exists in generated types.

- [ ] **Step 3: Commit**

```bash
git add convex/analytics.ts convex/_generated
git commit -m "feat(analytics): add trackBatch mutation for buffered event writes"
```

---

## Task 3: Backend — `getBySession`, `getSessionsByTour`

**Files:**
- Modify: `convex/analytics.ts`

- [ ] **Step 1: Add `getBySession` query**

Append to `convex/analytics.ts`:

```ts
export const getBySession = query({
  args: { sessionId: v.string(), tourId: v.optional(v.id('tours')) },
  handler: async (ctx, args) => {
    const all = args.tourId
      ? await ctx.db
          .query('analytics')
          .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId!))
          .collect()
      : await ctx.db.query('analytics').collect()
    return all
      .filter((e) => e.sessionId === args.sessionId)
      .sort((a, b) => a.timestamp - b.timestamp)
  },
})
```

- [ ] **Step 2: Add `getSessionsByTour` query**

Append to `convex/analytics.ts`:

```ts
export const getSessionsByTour = query({
  args: { tourId: v.id('tours'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []
    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return []

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const bySession = new Map<
      string,
      {
        sessionId: string
        startedAt: number
        endedAt: number
        scenes: Set<string>
        hotspotClicks: number
        deviceType?: string
        country?: string
        city?: string
      }
    >()
    for (const e of events) {
      let s = bySession.get(e.sessionId)
      if (!s) {
        s = {
          sessionId: e.sessionId,
          startedAt: e.timestamp,
          endedAt: e.timestamp,
          scenes: new Set<string>(),
          hotspotClicks: 0,
          deviceType: e.deviceType,
          country: e.country,
          city: e.city,
        }
        bySession.set(e.sessionId, s)
      }
      s.startedAt = Math.min(s.startedAt, e.timestamp)
      s.endedAt = Math.max(s.endedAt, e.timestamp)
      if (e.sceneId) s.scenes.add(e.sceneId as string)
      if (e.event === 'hotspot_click') s.hotspotClicks += 1
      if (!s.deviceType && e.deviceType) s.deviceType = e.deviceType
      if (!s.country && e.country) s.country = e.country
      if (!s.city && e.city) s.city = e.city
    }

    const leads = await ctx.db
      .query('leads')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()
    const leadBySession = new Map<string, string>()
    for (const l of leads) {
      if (l.sessionId) leadBySession.set(l.sessionId, l._id)
    }

    const rows = Array.from(bySession.values())
      .map((s) => ({
        sessionId: s.sessionId,
        startedAt: s.startedAt,
        duration: Math.round((s.endedAt - s.startedAt) / 1000),
        scenesVisited: s.scenes.size,
        hotspotClicks: s.hotspotClicks,
        deviceType: s.deviceType,
        country: s.country,
        city: s.city,
        leadId: leadBySession.get(s.sessionId),
      }))
      .sort((a, b) => b.startedAt - a.startedAt)

    return args.limit ? rows.slice(0, args.limit) : rows
  },
})
```

- [ ] **Step 2b: Run lint**

Run: `npm run lint`
Expected: no errors in `convex/analytics.ts`.

- [ ] **Step 3: Push + commit**

```bash
npx convex dev --once
git add convex/analytics.ts convex/_generated
git commit -m "feat(analytics): add getBySession and getSessionsByTour queries"
```

---

## Task 4: Backend — `getYawHeatmap`, `getHotspotClickCounts`

**Files:**
- Modify: `convex/analytics.ts`

- [ ] **Step 1: Add both queries**

Append to `convex/analytics.ts`:

```ts
export const getYawHeatmap = query({
  args: { sceneId: v.id('scenes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null
    const scene = await ctx.db.get(args.sceneId)
    if (!scene) return null
    const tour = await ctx.db.get(scene.tourId)
    if (!tour) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || tour.userId !== user._id) return null

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', scene.tourId))
      .collect()

    const YAW_BINS = 36 // 10° each over 360°
    const PITCH_BINS = 9 // 20° each over ±90° => 180°
    const grid: number[][] = Array.from({ length: PITCH_BINS }, () =>
      Array.from({ length: YAW_BINS }, () => 0)
    )
    let total = 0
    for (const e of events) {
      if (e.event !== 'view_direction') continue
      if (e.sceneId !== args.sceneId) continue
      const m = e.metadata as { yaw?: number; pitch?: number } | undefined
      if (!m || typeof m.yaw !== 'number' || typeof m.pitch !== 'number') continue
      const yawNorm = ((m.yaw % 360) + 360) % 360
      const yawBin = Math.min(YAW_BINS - 1, Math.floor(yawNorm / (360 / YAW_BINS)))
      const pitchNorm = Math.max(-90, Math.min(90, m.pitch))
      const pitchBin = Math.min(
        PITCH_BINS - 1,
        Math.floor(((pitchNorm + 90) / 180) * PITCH_BINS)
      )
      grid[pitchBin][yawBin] += 1
      total += 1
    }
    return { grid, total, yawBins: YAW_BINS, pitchBins: PITCH_BINS }
  },
})

export const getHotspotClickCounts = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return {}
    const tour = await ctx.db.get(args.tourId)
    if (!tour) return {}
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || tour.userId !== user._id) return {}

    const events = await ctx.db
      .query('analytics')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()
    const counts: Record<string, number> = {}
    for (const e of events) {
      if (e.event !== 'hotspot_click') continue
      const m = e.metadata as { hotspotId?: string } | undefined
      if (!m?.hotspotId) continue
      counts[m.hotspotId] = (counts[m.hotspotId] ?? 0) + 1
    }
    return counts
  },
})
```

- [ ] **Step 2: Push + commit**

```bash
npx convex dev --once
npm run lint
git add convex/analytics.ts convex/_generated
git commit -m "feat(analytics): add getYawHeatmap and getHotspotClickCounts"
```

---

## Task 5: Backend — `leads.capture` accepts `sessionId`; add `getWithActivity`

**Files:**
- Modify: `convex/leads.ts`

- [ ] **Step 1: Extend `capture` args**

In `convex/leads.ts`, modify the `capture` mutation. Add `sessionId` to the args object and include it in the insert:

```ts
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
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert('leads', {
      ...args,
      status: 'new',
    })
    // (keep existing activity + notification + email logic below unchanged)
```

Leave the rest of the handler body (activity log, notification, email) as-is.

- [ ] **Step 2: Add `getWithActivity` query**

Append to `convex/leads.ts`:

```ts
export const getWithActivity = query({
  args: { leadId: v.id('leads') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null
    const lead = await ctx.db.get(args.leadId)
    if (!lead) return null
    const tour = await ctx.db.get(lead.tourId)
    if (!tour) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || tour.userId !== user._id) return null

    let timeline: Array<{
      _id: string
      event: string
      sceneId?: string
      duration?: number
      metadata?: unknown
      timestamp: number
    }> = []
    if (lead.sessionId) {
      const events = await ctx.db
        .query('analytics')
        .withIndex('by_tourId', (q) => q.eq('tourId', lead.tourId))
        .collect()
      timeline = events
        .filter((e) => e.sessionId === lead.sessionId)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((e) => ({
          _id: e._id,
          event: e.event,
          sceneId: e.sceneId as string | undefined,
          duration: e.duration,
          metadata: e.metadata,
          timestamp: e.timestamp,
        }))
    }

    const scenes = await ctx.db
      .query('scenes')
      .withIndex('by_tourId', (q) => q.eq('tourId', lead.tourId))
      .collect()
    const sceneTitles: Record<string, string> = {}
    for (const s of scenes) sceneTitles[s._id] = s.title

    return {
      lead,
      tour: { _id: tour._id, title: tour.title, slug: tour.slug },
      timeline,
      sceneTitles,
    }
  },
})
```

- [ ] **Step 3: Push + commit**

```bash
npx convex dev --once
npm run lint
git add convex/leads.ts convex/_generated
git commit -m "feat(leads): accept sessionId on capture and add getWithActivity"
```

---

## Task 6: Client — `useSessionTracker` hook

**Files:**
- Create: `src/hooks/useSessionTracker.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useSessionTracker.ts`:

```ts
'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export type TrackedEvent = {
  event: string
  sceneId?: Id<'scenes'>
  duration?: number
  metadata?: Record<string, unknown>
  timestamp?: number
}

const FLUSH_MAX_EVENTS = 10
const FLUSH_MAX_MS = 10_000

function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  if (/Mobi/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function useSessionTracker(tourId: Id<'tours'> | null) {
  const trackBatch = useMutation(api.analytics.trackBatch)
  const sessionIdRef = useRef<string>('')
  if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID()

  const bufferRef = useRef<TrackedEvent[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deviceType = useMemo(detectDeviceType, [])
  const startedAtRef = useRef<number>(Date.now())

  const flush = useCallback(
    async (useBeacon = false) => {
      if (!tourId) return
      const events = bufferRef.current
      if (events.length === 0) return
      bufferRef.current = []
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        // Convex mutations can't be sent directly over sendBeacon. Fall through to
        // fire-and-forget fetch via mutation instead; sendBeacon is only relevant
        // if we later expose an HTTP action. For now, attempt mutation and ignore.
      }
      try {
        await trackBatch({
          tourId,
          sessionId: sessionIdRef.current,
          deviceType,
          events,
        })
      } catch {
        /* drop on failure; tracking must never block UX */
      }
    },
    [tourId, trackBatch, deviceType]
  )

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      void flush()
    }, FLUSH_MAX_MS)
  }, [flush])

  const trackEvent = useCallback(
    (event: TrackedEvent) => {
      bufferRef.current.push({ ...event, timestamp: event.timestamp ?? Date.now() })
      if (bufferRef.current.length >= FLUSH_MAX_EVENTS) {
        void flush()
      } else {
        scheduleFlush()
      }
    },
    [flush, scheduleFlush]
  )

  // Flush on tab hide + before unload
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const onBeforeUnload = () => {
      const totalSeconds = Math.round((Date.now() - startedAtRef.current) / 1000)
      bufferRef.current.push({
        event: 'session_end',
        duration: totalSeconds,
        timestamp: Date.now(),
      })
      void flush(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      void flush()
    }
  }, [flush])

  return {
    sessionId: sessionIdRef.current,
    trackEvent,
    flush,
  }
}
```

- [ ] **Step 2: Lint + commit**

Run: `npm run lint`
Expected: clean (or only pre-existing warnings).

```bash
git add src/hooks/useSessionTracker.ts
git commit -m "feat(hooks): add useSessionTracker with buffered flush"
```

---

## Task 7: Client — `usePanoramaTracking` hook

**Files:**
- Create: `src/hooks/usePanoramaTracking.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/usePanoramaTracking.ts`:

```ts
'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import type { TrackedEvent } from './useSessionTracker'

interface Args {
  sceneId: Id<'scenes'> | null
  sceneOrder?: number
  getViewDirection: () => { yaw: number; pitch: number; zoom?: number } | null
  trackEvent: (e: TrackedEvent) => void
}

const YAW_SAMPLE_MS = 1000

export function usePanoramaTracking({
  sceneId,
  sceneOrder,
  getViewDirection,
  trackEvent,
}: Args) {
  const prevSceneIdRef = useRef<Id<'scenes'> | null>(null)
  const sceneEnteredAtRef = useRef<number>(Date.now())
  const draggingRef = useRef<boolean>(false)

  // Scene enter/exit
  useEffect(() => {
    if (!sceneId) return
    if (prevSceneIdRef.current && prevSceneIdRef.current !== sceneId) {
      const dwell = Math.round((Date.now() - sceneEnteredAtRef.current) / 1000)
      trackEvent({
        event: 'scene_exit',
        sceneId: prevSceneIdRef.current,
        duration: dwell,
        metadata: sceneOrder !== undefined ? { order: sceneOrder } : undefined,
      })
    }
    prevSceneIdRef.current = sceneId
    sceneEnteredAtRef.current = Date.now()
    trackEvent({
      event: 'scene_view',
      sceneId,
      metadata: sceneOrder !== undefined ? { order: sceneOrder } : undefined,
    })
    return () => {
      // Final exit on unmount
      if (prevSceneIdRef.current) {
        const dwell = Math.round((Date.now() - sceneEnteredAtRef.current) / 1000)
        trackEvent({
          event: 'scene_exit',
          sceneId: prevSceneIdRef.current,
          duration: dwell,
        })
        prevSceneIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId])

  // 1Hz idle yaw sampler
  useEffect(() => {
    if (!sceneId) return
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      if (draggingRef.current) return
      const dir = getViewDirection()
      if (!dir) return
      trackEvent({
        event: 'view_direction',
        sceneId,
        metadata: {
          yaw: Math.round(dir.yaw),
          pitch: Math.round(dir.pitch),
          zoom: dir.zoom,
        },
      })
    }, YAW_SAMPLE_MS)
    return () => clearInterval(interval)
  }, [sceneId, getViewDirection, trackEvent])

  const onDragStart = useCallback(() => {
    draggingRef.current = true
  }, [])
  const onDragEnd = useCallback(() => {
    draggingRef.current = false
  }, [])

  return { onDragStart, onDragEnd }
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/hooks/usePanoramaTracking.ts
git commit -m "feat(hooks): add usePanoramaTracking for scene dwell + yaw sampling"
```

---

## Task 8: Wire tracking into `PanoramaViewer` (expose view direction + drag callbacks)

**Files:**
- Modify: `src/components/viewer/PanoramaViewer.tsx`

- [ ] **Step 1: Add optional tracking props to `Props`**

In `src/components/viewer/PanoramaViewer.tsx`, extend the `Props` interface (around line 61):

```ts
interface Props {
  imageUrl: string
  height?: string
  hotspots?: HotspotData[]
  onHotspotClick?: (hotspot: HotspotData) => void
  onSphereClick?: (position: { x: number; y: number; z: number }) => void
  isEditing?: boolean
  autoRotate?: boolean
  zoomLevel?: number
  previewPosition?: { x: number; y: number; z: number } | null
  onViewDirectionReady?: (
    getter: () => { yaw: number; pitch: number; zoom?: number } | null
  ) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}
```

- [ ] **Step 2: Emit view direction + drag events from the OrbitControls layer**

Locate where `OrbitControls` is rendered inside the viewer's `Canvas`. Wrap it with event handlers. The component currently renders `<OrbitControls ... />` inside a scene subtree — modify to add `onStart`, `onEnd`, and wire a camera getter via a ref:

```tsx
import { useRef as useReactRef } from 'react'
// ...
// Inside the Scene component (the one that has `useThree`):
const { camera } = useThree()
const controlsRef = useReactRef<any>(null)

useEffect(() => {
  if (!onViewDirectionReady) return
  onViewDirectionReady(() => {
    // Convert camera's spherical orientation to yaw/pitch in degrees.
    const dir = camera.getWorldDirection(new Vector3())
    // yaw: atan2 of x/z, 0° = looking along -Z, CW positive
    const yaw = (Math.atan2(dir.x, -dir.z) * 180) / Math.PI
    const pitch = (Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180) / Math.PI
    const zoom = (camera as any).zoom ?? 1
    return { yaw, pitch, zoom }
  })
}, [camera, onViewDirectionReady])

// ...
<OrbitControls
  ref={controlsRef}
  // existing props...
  onStart={() => onDragStart?.()}
  onEnd={() => onDragEnd?.()}
/>
```

Add `import { Vector3 } from 'three'` at the top of the file if not already imported. If `useThree` / `OrbitControls` / `Vector3` are used in a sub-component only, place these changes inside that sub-component.

- [ ] **Step 3: Lint + commit**

```bash
npm run lint
git add src/components/viewer/PanoramaViewer.tsx
git commit -m "feat(viewer): expose view direction getter + drag callbacks for tracking"
```

---

## Task 9: Wire trackers into public tour viewer

**Files:**
- Modify: `src/app/tour/[slug]/page.tsx`

- [ ] **Step 1: Replace direct `trackAnalytics` with `useSessionTracker`**

In `src/app/tour/[slug]/page.tsx`:

1. Add imports near existing imports:
   ```ts
   import { useSessionTracker } from '@/hooks/useSessionTracker'
   import { usePanoramaTracking } from '@/hooks/usePanoramaTracking'
   ```
2. Remove `const trackAnalytics = useMutation(api.analytics.track)` (line ~187).
3. Remove `const sessionIdRef = useRef(crypto.randomUUID())` (line ~237). Replace downstream `sessionIdRef.current` usages with `sessionId` from the tracker.
4. Above the `viewTrackedRef` block, add:
   ```ts
   const tourIdForTracking =
     tour && '_id' in tour && !('requiresPassword' in tour && tour.requiresPassword)
       ? (tour._id as Id<'tours'>)
       : null
   const { sessionId, trackEvent } = useSessionTracker(tourIdForTracking)
   ```
5. Replace the existing `useEffect` that calls `trackAnalytics({ event: 'tour_view', ... })` with:
   ```ts
   useEffect(() => {
     if (!tourIdForTracking || viewTrackedRef.current) return
     viewTrackedRef.current = true
     trackEvent({
       event: 'tour_view',
       metadata: {
         referrer: typeof document !== 'undefined' ? document.referrer : undefined,
         userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
       },
     })
   }, [tourIdForTracking, trackEvent])
   ```

- [ ] **Step 2: Wire `usePanoramaTracking` with a view-direction getter**

Below the session tracker, add:

```ts
const viewDirectionGetterRef = useRef<
  null | (() => { yaw: number; pitch: number; zoom?: number } | null)
>(null)
const getViewDirection = useCallback(
  () => (viewDirectionGetterRef.current ? viewDirectionGetterRef.current() : null),
  []
)

const { onDragStart, onDragEnd } = usePanoramaTracking({
  sceneId: activeSceneId as Id<'scenes'> | null,
  sceneOrder: activeScene?.order,
  getViewDirection,
  trackEvent,
})
```

Then pass these into the `PanoramaViewer` element (locate where `<PanoramaViewer ... />` is rendered):

```tsx
<PanoramaViewer
  // existing props...
  onViewDirectionReady={(getter) => {
    viewDirectionGetterRef.current = getter
  }}
  onDragStart={onDragStart}
  onDragEnd={onDragEnd}
/>
```

- [ ] **Step 3: Track hotspot clicks**

Find the `onHotspotClick` handler that currently navigates to the target scene or opens media. At the top of that handler, add:

```ts
trackEvent({
  event: 'hotspot_click',
  sceneId: activeSceneId as Id<'scenes'> | undefined,
  metadata: {
    hotspotId: hotspot._id,
    hotspotType: hotspot.type,
    targetSceneId: hotspot.targetSceneId,
  },
})
```

If there's a separate path for video/image modal, additionally track modal-close duration. When the modal opens, record `const mediaOpenAt = Date.now()`; when it closes, call:

```ts
trackEvent({
  event: 'hotspot_media_view',
  metadata: { hotspotId: hotspot._id, mediaType: hotspot.type === 'media' ? 'image' : 'video' },
  duration: Math.round((Date.now() - mediaOpenAt) / 1000),
})
```

- [ ] **Step 4: Pass `sessionId` on lead form submit**

Locate the `captureLead({ ... })` call. Add `sessionId` to its args:

```ts
await captureLead({
  tourId: tour._id as Id<'tours'>,
  name: leadForm.name,
  email: leadForm.email,
  phone: leadForm.phone || undefined,
  sessionId,
})
trackEvent({ event: 'lead_form_submitted' })
```

Also find where the lead form first becomes visible and emit `trackEvent({ event: 'lead_form_shown' })` once.

- [ ] **Step 5: Manual verification**

Run `npm run dev` and `npx convex dev` in two terminals. Open a published tour in the browser. In the Convex dashboard (or `npx convex run analytics:getBySession '{"sessionId":"<copy from devtools>"}'`), verify the event stream contains `tour_view`, `scene_view`, repeated `view_direction` while idle, and `hotspot_click` when interacting. Open a second tab — confirm a distinct `sessionId`.

- [ ] **Step 6: Commit**

```bash
npm run lint
git add src/app/tour/\[slug\]/page.tsx
git commit -m "feat(tour): wire session + panorama tracking into public viewer"
```

---

## Task 10: `LeadActivityDrawer` component

**Files:**
- Create: `src/components/leads/LeadActivityDrawer.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/leads/LeadActivityDrawer.tsx`:

```tsx
'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Eye,
  MousePointerClick,
  ImageIcon,
  Video,
  DoorOpen,
  DoorClosed,
  Flag,
  Compass,
} from 'lucide-react'

const EVENT_LABEL: Record<string, string> = {
  tour_view: 'Opened tour',
  scene_view: 'Entered scene',
  scene_exit: 'Left scene',
  hotspot_click: 'Clicked hotspot',
  hotspot_media_view: 'Viewed media',
  view_direction: 'Looked around',
  lead_form_shown: 'Saw lead form',
  lead_form_submitted: 'Submitted lead',
  session_end: 'Ended session',
}

function iconFor(event: string) {
  switch (event) {
    case 'tour_view':
      return <Eye size={16} style={{ color: '#D4A017' }} />
    case 'scene_view':
      return <DoorOpen size={16} style={{ color: '#2DD4BF' }} />
    case 'scene_exit':
      return <DoorClosed size={16} style={{ color: '#6B6560' }} />
    case 'hotspot_click':
      return <MousePointerClick size={16} style={{ color: '#D4A017' }} />
    case 'hotspot_media_view':
      return <ImageIcon size={16} style={{ color: '#2DD4BF' }} />
    case 'view_direction':
      return <Compass size={16} style={{ color: '#6B6560' }} />
    case 'lead_form_submitted':
      return <Flag size={16} style={{ color: '#FB7A54' }} />
    default:
      return <Video size={16} style={{ color: '#6B6560' }} />
  }
}

interface Props {
  leadId: Id<'leads'>
}

export function LeadActivityDrawer({ leadId }: Props) {
  const data = useQuery(api.leads.getWithActivity, { leadId })
  if (data === undefined) return <div className="p-4 text-sm text-[#6B6560]">Loading…</div>
  if (data === null) return <div className="p-4 text-sm text-[#6B6560]">No activity available.</div>

  const { timeline, sceneTitles, lead } = data

  // Aggregate scene dwell
  const dwellByScene: Record<string, number> = {}
  const clickByHotspot: Record<string, number> = {}
  for (const e of timeline) {
    if (e.event === 'scene_exit' && e.sceneId && e.duration) {
      dwellByScene[e.sceneId] = (dwellByScene[e.sceneId] ?? 0) + e.duration
    }
    if (e.event === 'hotspot_click') {
      const m = (e.metadata ?? {}) as { hotspotId?: string }
      if (m.hotspotId) clickByHotspot[m.hotspotId] = (clickByHotspot[m.hotspotId] ?? 0) + 1
    }
  }

  // Filter yaw samples from visual timeline (too noisy); keep summary count.
  const yawSamples = timeline.filter((e) => e.event === 'view_direction').length
  const visible = timeline.filter((e) => e.event !== 'view_direction')

  return (
    <div className="rounded-xl border border-[#2E2A24] bg-[#12100E] p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[#F5F3EF]" style={{ fontFamily: 'var(--font-jakarta)' }}>
          Session activity
        </h3>
        <p className="mt-1 text-xs text-[#A8A29E]">
          {lead.sessionId ? `${visible.length} events · ${yawSamples} direction samples` : 'No session linked.'}
        </p>
      </div>

      {Object.keys(dwellByScene).length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#A8A29E]">
            Scene dwell time
          </p>
          <div className="space-y-1">
            {Object.entries(dwellByScene).map(([sid, sec]) => (
              <div key={sid} className="flex items-center gap-2 text-xs">
                <span className="w-40 truncate text-[#F5F3EF]">{sceneTitles[sid] ?? sid.slice(-6)}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1B1916]">
                  <div
                    className="h-full rounded-full bg-[#2DD4BF]"
                    style={{
                      width: `${Math.min(100, (sec / Math.max(...Object.values(dwellByScene))) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-12 text-right text-[#A8A29E]">{sec}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ol className="space-y-2">
        {visible.map((e) => (
          <li key={e._id} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5">{iconFor(e.event)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[#F5F3EF]">{EVENT_LABEL[e.event] ?? e.event}</span>
                {e.sceneId && (
                  <span className="text-[#6B6560]">· {sceneTitles[e.sceneId] ?? e.sceneId.slice(-6)}</span>
                )}
                {e.duration !== undefined && <span className="text-[#6B6560]">· {e.duration}s</span>}
              </div>
              <div className="text-[#6B6560]">{new Date(e.timestamp).toLocaleTimeString()}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/leads/LeadActivityDrawer.tsx
git commit -m "feat(leads): add LeadActivityDrawer timeline component"
```

---

## Task 11: Mount `LeadActivityDrawer` on lead detail page

**Files:**
- Modify or create: `src/app/(dashboard)/leads/[id]/page.tsx`

- [ ] **Step 1: Check whether `/leads/[id]/page.tsx` exists**

Run: `ls src/app/\(dashboard\)/leads`
If `[id]/page.tsx` does not exist, check the current `leads/page.tsx` for how leads are opened (likely via a side-panel). In that case, mount `LeadActivityDrawer` inside the side-panel component instead. If an `[id]/page.tsx` exists, edit it.

- [ ] **Step 2: Mount the drawer**

Add:
```tsx
import { LeadActivityDrawer } from '@/components/leads/LeadActivityDrawer'
// ...
{selectedLead?._id && (
  <div className="mt-6">
    <LeadActivityDrawer leadId={selectedLead._id} />
  </div>
)}
```

Place under the existing lead details block. Replace `selectedLead` with whatever variable names the file uses.

- [ ] **Step 3: Manual verification**

With dev servers running, submit a lead on a published tour, then open `/leads` in the dashboard and select the just-created lead. Verify the drawer loads the timeline.

- [ ] **Step 4: Commit**

```bash
npm run lint
git add src/app/\(dashboard\)/leads
git commit -m "feat(leads): show activity drawer on lead detail"
```

---

## Task 12: `SessionsTable` + tab on analytics page

**Files:**
- Create: `src/components/analytics/SessionsTable.tsx`
- Modify: `src/app/(dashboard)/analytics/page.tsx` (or the per-tour analytics page if one exists)

- [ ] **Step 1: Create `SessionsTable`**

Create `src/components/analytics/SessionsTable.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface Props {
  tourId: Id<'tours'>
}

export function SessionsTable({ tourId }: Props) {
  const rows = useQuery(api.analytics.getSessionsByTour, { tourId, limit: 100 })
  const [openSession, setOpenSession] = useState<string | null>(null)
  const timeline = useQuery(
    api.analytics.getBySession,
    openSession ? { sessionId: openSession, tourId } : 'skip'
  )

  if (rows === undefined) return <div className="text-sm text-[#A8A29E]">Loading sessions…</div>
  if (!rows || rows.length === 0)
    return <div className="text-sm text-[#A8A29E]">No sessions yet.</div>

  return (
    <div>
      <div className="overflow-auto rounded-xl border border-[#2E2A24]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1B1916] text-[#A8A29E]">
            <tr>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Scenes</th>
              <th className="px-3 py-2">Hotspot clicks</th>
              <th className="px-3 py-2">Device</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Lead</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.sessionId}
                className="cursor-pointer border-t border-[#2E2A24] text-[#F5F3EF] hover:bg-[#1B1916]"
                onClick={() => setOpenSession(r.sessionId)}
              >
                <td className="px-3 py-2">{new Date(r.startedAt).toLocaleString()}</td>
                <td className="px-3 py-2">{r.duration}s</td>
                <td className="px-3 py-2">{r.scenesVisited}</td>
                <td className="px-3 py-2">{r.hotspotClicks}</td>
                <td className="px-3 py-2">{r.deviceType ?? '—'}</td>
                <td className="px-3 py-2">{r.country ?? '—'}</td>
                <td className="px-3 py-2">{r.leadId ? 'Yes' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openSession && timeline && (
        <div className="mt-4 rounded-xl border border-[#2E2A24] bg-[#12100E] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-[#F5F3EF]">Timeline · {openSession.slice(0, 8)}</span>
            <button
              className="text-xs text-[#A8A29E] hover:text-[#F5F3EF]"
              onClick={() => setOpenSession(null)}
            >
              Close
            </button>
          </div>
          <ol className="space-y-1 text-xs text-[#A8A29E]">
            {timeline
              .filter((e) => e.event !== 'view_direction')
              .map((e) => (
                <li key={e._id}>
                  <span className="text-[#F5F3EF]">{e.event}</span>
                  {e.sceneId && <span> · scene {String(e.sceneId).slice(-6)}</span>}
                  {e.duration !== undefined && <span> · {e.duration}s</span>}
                  <span className="ml-2">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add Sessions tab to analytics page**

Open `src/app/(dashboard)/analytics/page.tsx`. Identify the existing tab/section structure. Add a new section:

```tsx
import { SessionsTable } from '@/components/analytics/SessionsTable'
// ...
{selectedTourId && (
  <section className="mt-8">
    <h2 className="mb-3 text-base font-semibold text-[#F5F3EF]" style={{ fontFamily: 'var(--font-jakarta)' }}>
      Visitor sessions
    </h2>
    <SessionsTable tourId={selectedTourId} />
  </section>
)}
```

Replace `selectedTourId` with whatever the page uses to scope analytics to a single tour. If the page shows aggregated analytics across all tours, add a tour picker or skip this section until a tour is chosen.

- [ ] **Step 3: Manual verification**

Open `/analytics` (as tour owner). Select a tour that has some session data. Verify rows render and clicking one opens a timeline.

- [ ] **Step 4: Commit**

```bash
npm run lint
git add src/components/analytics/SessionsTable.tsx src/app/\(dashboard\)/analytics/page.tsx
git commit -m "feat(analytics): sessions table + timeline drawer"
```

---

## Task 13: `AttentionHeatmap` component + panel

**Files:**
- Create: `src/components/analytics/AttentionHeatmap.tsx`
- Modify: `src/app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: Create the Canvas heatmap**

Create `src/components/analytics/AttentionHeatmap.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface Props {
  sceneId: Id<'scenes'>
  width?: number
  height?: number
}

export function AttentionHeatmap({ sceneId, width = 720, height = 180 }: Props) {
  const data = useQuery(api.analytics.getYawHeatmap, { sceneId })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { grid, yawBins, pitchBins, total } = data
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (total === 0) {
      ctx.fillStyle = '#6B6560'
      ctx.font = '12px sans-serif'
      ctx.fillText('No direction samples yet.', 12, canvas.height / 2)
      return
    }

    const cellW = canvas.width / yawBins
    const cellH = canvas.height / pitchBins
    let max = 0
    for (const row of grid) for (const v of row) if (v > max) max = v

    for (let p = 0; p < pitchBins; p++) {
      for (let y = 0; y < yawBins; y++) {
        const v = grid[p][y] / Math.max(1, max)
        if (v === 0) continue
        // Gold → coral gradient. Pitch bins indexed from bottom up.
        const alpha = Math.min(1, 0.15 + v * 0.85)
        ctx.fillStyle = `rgba(212, 160, 23, ${alpha})`
        ctx.fillRect(y * cellW, (pitchBins - 1 - p) * cellH, cellW + 1, cellH + 1)
      }
    }
  }, [data])

  return (
    <div className="rounded-xl border border-[#2E2A24] bg-[#12100E] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[#A8A29E]">
          Attention heatmap
        </span>
        <span className="text-xs text-[#6B6560]">{data?.total ?? 0} samples</span>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-md bg-[#0A0908]"
      />
      <div className="mt-1 flex justify-between text-[10px] text-[#6B6560]">
        <span>0°</span>
        <span>90°</span>
        <span>180°</span>
        <span>270°</span>
        <span>360°</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add heatmap panel to analytics page**

In the analytics page, under the sessions section, add per-scene heatmap rendering. Fetch scenes for the selected tour (reuse `api.scenes.listByTour` if it exists; if not, use any existing list query that returns scenes for a tour):

```tsx
import { AttentionHeatmap } from '@/components/analytics/AttentionHeatmap'
// ...
const scenes = useQuery(
  api.scenes.listByTour,
  selectedTourId ? { tourId: selectedTourId } : 'skip'
)
// ...
{scenes && scenes.length > 0 && (
  <section className="mt-8 grid gap-4">
    <h2 className="text-base font-semibold text-[#F5F3EF]" style={{ fontFamily: 'var(--font-jakarta)' }}>
      Attention heatmaps
    </h2>
    {scenes.map((s) => (
      <div key={s._id}>
        <p className="mb-1 text-xs text-[#A8A29E]">{s.title}</p>
        <AttentionHeatmap sceneId={s._id} />
      </div>
    ))}
  </section>
)}
```

If `api.scenes.listByTour` doesn't exist, swap in the correct query name — check `convex/scenes.ts` for the tour-scoped list export and use that identifier.

- [ ] **Step 3: Manual verification**

Open `/analytics`, select a tour with view_direction data, and verify heatmap renders a gold density field. Open a public tour tab alongside and drag around; refresh analytics after ~30s to see the field update.

- [ ] **Step 4: Commit**

```bash
npm run lint
git add src/components/analytics/AttentionHeatmap.tsx src/app/\(dashboard\)/analytics/page.tsx
git commit -m "feat(analytics): per-scene attention heatmap"
```

---

## Task 14: End-to-end smoke test + docs note

**Files:**
- Modify: `docs/superpowers/specs/2026-04-16-lead-activity-tracking-design.md` (append verification log at bottom)

- [ ] **Step 1: Run full manual E2E**

With `npm run dev` + `npx convex dev` running:

1. Open a published tour in an incognito window.
2. Let it sit 10 seconds (yaw samples should flush).
3. Drag the panorama around.
4. Click a scene hotspot.
5. Click an info hotspot (if any).
6. Submit the lead form.
7. Close the tab.

In the owner account:
- Go to `/leads`, open the new lead. The activity drawer should show tour_view → scene_view → hotspot_click → lead_form_submitted → session_end with dwell bars.
- Go to `/analytics`, select the same tour. Sessions row should list the session with scenes count ≥ 1 and hotspotClicks ≥ 1, leadId = "Yes". Heatmap for the visited scene should show activity.

- [ ] **Step 2: Verify data-loss on tab close is acceptable**

Close a tour tab within 2 seconds of opening. Confirm `tour_view` still recorded (scheduleFlush runs immediately at FLUSH_MAX_EVENTS threshold for first event only if buffer hits 10; here it relies on unload flush). If `tour_view` is lost on fast close, update `useSessionTracker.trackEvent` to immediately flush when `event === 'tour_view'`:

```ts
const trackEvent = useCallback(
  (event: TrackedEvent) => {
    bufferRef.current.push({ ...event, timestamp: event.timestamp ?? Date.now() })
    if (event.event === 'tour_view' || bufferRef.current.length >= FLUSH_MAX_EVENTS) {
      void flush()
    } else {
      scheduleFlush()
    }
  },
  [flush, scheduleFlush]
)
```

Apply that change only if verification shows loss.

- [ ] **Step 3: Append verification log to spec**

Open the spec file and append under a new heading `## Implementation verification (YYYY-MM-DD)` a short bullet list of what was tested and the result.

- [ ] **Step 4: Final commit**

```bash
git add docs/superpowers/specs/2026-04-16-lead-activity-tracking-design.md src/hooks/useSessionTracker.ts
git commit -m "chore(docs): record E2E verification for lead activity tracking"
```

---

## Spec coverage check

| Spec item | Task |
|---|---|
| Event types: tour_view, scene_view, scene_exit, hotspot_click, hotspot_media_view, view_direction, lead_form_shown, lead_form_submitted, session_end | Tasks 6, 7, 9 |
| `trackBatch` mutation | Task 2 |
| `analytics.getBySession` | Task 3 |
| `analytics.getSessionsByTour` | Task 3 |
| `analytics.getYawHeatmap` | Task 4 |
| `analytics.getHotspotClickCounts` | Task 4 |
| `leads.sessionId` schema + index | Task 1 |
| `leads.capture` accepts sessionId | Task 5 |
| `leads.getWithActivity` | Task 5 |
| `useSessionTracker` hook | Task 6 |
| `usePanoramaTracking` hook | Task 7 |
| PanoramaViewer exposes view-direction + drag | Task 8 |
| Public viewer wires all trackers + sessionId on lead submit | Task 9 |
| `LeadActivityDrawer` | Task 10 |
| Drawer mounted on lead detail | Task 11 |
| `SessionsTable` + tab | Task 12 |
| `AttentionHeatmap` + per-scene panel | Task 13 |
| Privacy (anonymous, disclose in policy) | Non-code — documented in spec; no code change required |
| Storage-cost mitigation (rollup + 30d deletion) | **Deferred** per spec ("Follow-up phase — not blocking v1") |
| E2E verification | Task 14 |
