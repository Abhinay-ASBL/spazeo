---
phase: 07-fix-all-the-issues-code-and-all-flow-issues-and-fix-all-on-the-total-code
plan: 02
subsystem: ui
tags: [react, nextjs, hotspot, navigation, panorama-viewer, floor-plan, building-viewer, stripe, csp]

# Dependency graph
requires:
  - phase: 07-01
    provides: HotspotInfoPanel onNavigate prop, HotspotMarker markerStyle variants
provides:
  - Panel-first click routing for navigation hotspots in public tour page
  - onNavigate callback wired from tour page to HotspotInfoPanel
  - targetSceneTitle derivation from scenes array passed to HotspotInfoPanel
  - accentColor input in create form for all hotspot types
  - Committed staged fixes: floor plan null guards, building viewer useMemo scaling, Stripe 2026-02-25.clover, CSP unpkg.com
affects: [tour-viewer, hotspot-editor, building-exterior-viewer, floor-plan-editor, stripe-webhooks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Panel-first navigation: navigation hotspot with title/description opens info panel; Go-to button triggers scene transition
    - IIFE JSX pattern for deriving targetSceneTitle inside AnimatePresence block safely

key-files:
  created: []
  modified:
    - src/app/tour/[slug]/page.tsx
    - src/app/(dashboard)/tours/[id]/edit/page.tsx
    - convex/schema.ts
    - convex/http.ts
    - convex/subscriptions.ts
    - next.config.ts
    - src/components/floor-plan/DiagramCanvas.tsx
    - src/components/floor-plan/OriginalOverlay.tsx
    - src/components/viewer/BuildingExteriorViewer.tsx
    - public/legacy-towers.glb

key-decisions:
  - "Panel-first navigation: setActiveHotspot() only when hotspot has title/description; immediate setActiveSceneId() when no content — backward compatible"
  - "onNavigate callback does NOT call setActiveHotspot(null) — existing useEffect on activeSceneId change handles panel close automatically, avoiding race condition"
  - "IIFE JSX pattern (immediately invoked function expression inside AnimatePresence) used to derive targetSceneTitle with proper null safety without extracting named component"
  - "accentColor added to create form for all hotspot types (not just navigation) — consistent with edit form behavior"
  - "hotspotAccentColor state added to create form; passed to mutation; reset after successful create"

patterns-established:
  - "Panel-first navigation pattern: hotspot click → panel open → Go-to button → scene transition"
  - "Staged code fix commit pattern: verify each file's expected state before staging, commit all together"

requirements-completed: [NAV-GOTO, NAV-BACKWARD, CODE-FIXES, CODE-STRIPE, CODE-CSP, NAV-EDITOR]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 7 Plan 02: Navigation Hotspot Panel-First Flow + Staged Fixes Summary

**Panel-first navigation hotspot routing wired in public tour page with onNavigate callback, accentColor added to create form, and all staged code fixes committed (floor plan guards, building viewer scaling, Stripe API version, CSP headers)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T08:10:45Z
- **Completed:** 2026-03-16T08:14:44Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Navigation hotspot now opens info panel first when title/description is set; "Go to" button triggers scene transition (panel-first UX)
- Navigation hotspot with no title/description navigates immediately (backward compatible)
- accentColor field added to hotspot create form for all types; passes to mutation and resets after create
- Edit form already had accentColor for all types — confirmed no gating change needed
- All 8 staged code fixes committed: floor plan null guards, building viewer useMemo scaling, Stripe 2026-02-25.clover, CSP unpkg.com, schema overallWidth/Height

## Task Commits

1. **Task 1: Fix handleHotspotClick routing and wire HotspotInfoPanel with onNavigate** - `2f769f8` (feat)
2. **Task 2: Add accentColor to navigation hotspot create and edit forms + commit staged code fixes** - `c3d5dfe` (fix)

## Files Created/Modified
- `src/app/tour/[slug]/page.tsx` - Panel-first handleHotspotClick, onNavigate + targetSceneTitle wired to HotspotInfoPanel
- `src/app/(dashboard)/tours/[id]/edit/page.tsx` - hotspotAccentColor state, mutation arg, reset, UI input in create form
- `convex/schema.ts` - overallWidth/overallHeight in floorPlanDetails
- `convex/http.ts` - Stripe apiVersion 2026-02-25.clover
- `convex/subscriptions.ts` - Stripe apiVersion 2026-02-25.clover (all constructors)
- `next.config.ts` - CSP allows https://unpkg.com in script-src, connect-src, worker-src
- `src/components/floor-plan/DiagramCanvas.tsx` - geometry?.walls ?? [] and geometry?.rooms ?? [] null guards
- `src/components/floor-plan/OriginalOverlay.tsx` - geometry?.walls/rooms null guards at lines 10-11
- `src/components/viewer/BuildingExteriorViewer.tsx` - useMemo scaling, targetHeight = totalFloors * FLOOR_HEIGHT, no console.log, no Draco CDN
- `public/legacy-towers.glb` - optimized 3D model (Draco-compressed)

## Decisions Made
- Panel-first navigation: `setActiveHotspot()` when hotspot has content; immediate `setActiveSceneId()` otherwise — preserves backward compatibility for hotspots with no content
- `onNavigate` callback does NOT call `setActiveHotspot(null)` — the existing `useEffect` on `activeSceneId` fires automatically, closing the panel without a race condition
- IIFE JSX pattern inside `AnimatePresence` to derive `targetSceneTitle` with proper null safety
- Edit form `accentColor` was already ungated (renders for all types) — no change required

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing lint errors in both files (3 errors in tour page, 2 errors in edit page before changes). My changes introduced zero new lint errors — verified by stashing changes and comparing before/after error counts.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 7 UAT fixes committed — ready for human verification checkpoint
- Checkpoint requires: tour editor + public viewer running, navigation hotspot create/click flow test, building exterior viewer CSP check
- After verification passes, Phase 7 is complete

---
*Phase: 07-fix-all-the-issues-code-and-all-flow-issues-and-fix-all-on-the-total-code*
*Completed: 2026-03-16*
