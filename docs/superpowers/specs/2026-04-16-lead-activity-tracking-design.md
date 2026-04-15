# Lead Activity Tracking — Design

**Date:** 2026-04-16
**Scope:** v1, Option B (full timeline + yaw/pitch heatmap)

---

## Goal

Capture per-visitor session activity on public tours (`/tour/[slug]`): which scenes they viewed, for how long, which hotspots they clicked (and hotspot type/target), and where they looked inside each panorama (yaw/pitch). Link sessions to leads when a visitor submits the lead form, so owners can see a full activity log per lead and per tour.

## Non-goals (v1)

- Cross-tour session stitching (each tour = independent session).
- Real-time "live view" dashboard.
- IP → country enrichment beyond what already exists (uses current Convex HTTP headers pattern).
- Retention policies / archival — tracked in follow-up.

---

## Architecture

### Event model

Reuse existing `analytics` table. Event log only — no new per-session table in v1. Session summaries derived on read via `sessionId` grouping.

Existing fields used: `tourId`, `event`, `sessionId`, `sceneId`, `metadata`, `timestamp`, `deviceType`, `country`, `city`, `duration`.

### New event types

| Event | When emitted | `duration` | `metadata` shape |
|---|---|---|---|
| `tour_view` | On tour load (already emitted) | — | `{ referrer, userAgent }` |
| `scene_view` | On scene enter | — | `{ order }` |
| `scene_exit` | On scene leave or tab hide / unload | dwell seconds | `{ order }` |
| `hotspot_click` | User clicks hotspot marker | — | `{ hotspotId, hotspotType: 'info'\|'link'\|'scene'\|'image'\|'video', targetSceneId?, url? }` |
| `hotspot_media_view` | Image/video hotspot modal opened | modal open seconds (on close) | `{ hotspotId, mediaType: 'image'\|'video' }` |
| `view_direction` | 1Hz idle sample (skip while dragging, skip when tab hidden) | — | `{ yaw, pitch, zoom }` rounded to 1° |
| `lead_form_shown` | Lead form becomes visible (already emitted) | — | — |
| `lead_form_submitted` | Lead submits (already emitted) | — | `{ leadId }` |
| `session_end` | `beforeunload` / visibilitychange hidden after 30s | total session seconds | — |

### Session linkage to leads

Add `sessionId: v.optional(v.string())` to `leads` table. When lead form submits, write the current `sessionId` alongside lead row. Activity timeline for a lead = `analytics.getBySession(sessionId)`.

### Yaw/pitch sampling

- Runs in `PanoramaViewer` via `setInterval(1000ms)`.
- Paused during active `dragstart → dragend` from PSV events.
- Paused when `document.hidden === true`.
- Batched client-side: buffer up to 10 samples or 10s, flush via single `analytics.trackBatch` mutation to cut row cost.
- Server stores each sample as separate row (enables simple heatmap aggregation).

### Batching mutation

New `analytics.trackBatch({ tourId, sessionId, events: [...] })` to reduce mutation count. `track` kept for backward compat.

---

## Data flow

```
User opens /tour/[slug]
  → sessionId = crypto.randomUUID() (existing)
  → trackBatch: [tour_view, scene_view(scene1)]
  → scene entered, start dwell timer
  → viewer emits dragstart/dragend + idle samples to yaw buffer (1Hz)
  → every 10s or 10 samples: flush buffer via trackBatch([view_direction, view_direction, ...])
  → user clicks info hotspot
    → trackBatch: [hotspot_click{type:info, hotspotId}]
    → modal opens → on close: trackBatch: [hotspot_media_view{duration:12}]
  → user clicks scene hotspot → jump scene2
    → trackBatch: [scene_exit(scene1, duration:45), scene_view(scene2)]
  → user fills lead form → submit
    → leads.create includes sessionId
    → trackBatch: [lead_form_submitted{leadId}]
  → user closes tab
    → beforeunload: sendBeacon trackBatch([scene_exit(duration), session_end(totalDuration)])
```

---

## Components

### Backend — `convex/`

**`analytics.ts` additions:**
- `trackBatch` mutation — accepts array of events, inserts all in one transaction.
- `getBySession(sessionId)` query — ordered timeline for one session.
- `getSessionsByTour(tourId, limit)` query — returns per-session summary: `{ sessionId, startedAt, duration, scenesVisited, hotspotClicks, device, country, leadId? }`. Derived by grouping.
- `getYawHeatmap(sceneId)` query — buckets yaw samples into 36 bins (10° each) × 9 pitch bins, returns 2D density array.
- `getHotspotClickCounts(tourId)` query — groups `hotspot_click` by `hotspotId` for heatmap overlay in editor.

**`leads.ts` additions:**
- `create` mutation accepts `sessionId` arg, stores on lead row.
- `getWithActivity(leadId)` query — returns lead + derived session timeline.

**`schema.ts`:**
- `leads.sessionId: v.optional(v.string())` + new index `by_sessionId`.
- No change to `analytics` table (new events are just new `event` string values).

### Frontend — `src/`

**`src/hooks/useSessionTracker.ts` (new):**
- Owns the session's event buffer.
- Debounced flush (10 events or 10s).
- Exposes `trackEvent(event, metadata?, duration?)`.
- Sets up `visibilitychange` + `beforeunload` listeners, uses `navigator.sendBeacon` on unload (falls back to sync fetch).
- Returns `sessionId`.

**`src/hooks/usePanoramaTracking.ts` (new):**
- Plugs into PSV `position-updated`, `panorama-loaded`, `start-move`, `stop-move`.
- 1Hz idle sampler → pushes `view_direction` events.
- Emits `scene_view`/`scene_exit` around panorama swaps.
- Tracks current scene's entry time for `duration` on exit.

**`src/components/viewer/PanoramaViewer.tsx`:**
- Consume `useSessionTracker` + `usePanoramaTracking`.
- Wire hotspot click handlers to `trackEvent('hotspot_click', { hotspotId, hotspotType, ... })`.
- Image/video hotspot modal → emit `hotspot_media_view` on close with open duration.

**`src/app/tour/[slug]/page.tsx`:**
- Replace existing `trackAnalytics({ event: 'tour_view' })` with `useSessionTracker`.
- Pass `sessionId` into lead form submit.

**`src/components/leads/LeadActivityDrawer.tsx` (new):**
- Props: `leadId`.
- Uses `api.leads.getWithActivity`.
- Renders timeline list (icon per event type), scene dwell bars, hotspot click summary.

**`src/app/(dashboard)/leads/[id]/page.tsx`:**
- Drop `LeadActivityDrawer` under lead details.

**`src/app/(dashboard)/analytics/[tourId]/page.tsx`:**
- New "Sessions" tab — table from `getSessionsByTour`, row click opens timeline drawer.
- New "Attention Heatmap" per-scene panel — 2D yaw/pitch heatmap rendered as Canvas overlay on top of scene thumb.

---

## Privacy

- Tracking anonymous — `sessionId` is `crypto.randomUUID()`, not tied to fingerprint.
- No IP stored (country/city already derived server-side from existing headers, kept).
- Disclose in `/privacy` page: panorama interaction telemetry collected for tour owners.
- Lead → session linkage only occurs on explicit form submit.

## Storage cost

- Yaw samples: ~60 rows/min/active session × typical 3min visit = ~180 rows/visit.
- At 1K visits/month per tour = ~180K rows/mo/tour yaw-only.
- Mitigation: `dailyAnalytics` rollup extended to aggregate yaw samples into heatmap bins nightly, old `view_direction` rows deleted after 30 days via cron. (Follow-up phase — not blocking v1.)

## Error handling

- `trackBatch` failures: client drops buffer silently after single retry; tracking must never block UX.
- On unload: `sendBeacon` is fire-and-forget — accept some data loss on close.
- If Convex unavailable on tour open: viewer still renders; buffer queues in-memory, flushes on recovery.

## Testing

- Convex function tests: `trackBatch` inserts N rows; `getBySession` returns ordered events; `getYawHeatmap` bucket math.
- Playwright (follow-up): open tour → click hotspot → submit lead → verify `leads.getWithActivity` returns expected timeline.
- Manual: open tour in 2 tabs simultaneously → verify two distinct sessionIds recorded.

---

## Implementation phases

1. **Schema + batching** — add `leads.sessionId`, `analytics.trackBatch`, `getBySession`.
2. **Session tracker hook** — `useSessionTracker` + flush lifecycle.
3. **Panorama tracking** — `usePanoramaTracking` scene + hotspot + yaw sampler.
4. **Lead linkage** — `leads.create` accepts sessionId; form submit passes it.
5. **Lead activity UI** — `LeadActivityDrawer` on `/leads/[id]`.
6. **Sessions list** — tab on analytics page with drawer.
7. **Yaw heatmap** — `getYawHeatmap` query + Canvas overlay on analytics.

Each phase ships independently.
