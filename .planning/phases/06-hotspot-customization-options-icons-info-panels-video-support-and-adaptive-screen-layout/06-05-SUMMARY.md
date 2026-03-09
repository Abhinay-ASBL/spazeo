---
phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout
plan: 05
subsystem: ui
tags: [framer-motion, zustand, panorama-viewer, hotspot, mobile, touch-targets, safe-area]

# Dependency graph
requires:
  - phase: 06-03
    provides: HotspotMarker component using Zustand setActiveHotspot for delegation
  - phase: 06-04
    provides: HotspotInfoPanel and HotspotVideoModal components with Framer Motion animations

provides:
  - Public tour viewer wired end-to-end with HotspotInfoPanel and HotspotVideoModal
  - handleHotspotClick routing: navigation (scene transition), media+video (video modal), info/link/media-no-video (info panel)
  - AnimatePresence exit animations for both panel and modal
  - Scene change auto-closes info panel via useEffect
  - Responsive lead capture panel (w-full on mobile)
  - 44px touch targets on top bar and submit buttons
  - Safe-area-inset padding on viewer controls bar

affects:
  - tour viewer UX
  - mobile visitor experience

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AnimatePresence with stable key prop for exit animations (key=activeHotspot._id or key=videoModalUrl)
    - Zustand store subscription in page-level component for cross-component coordination
    - useEffect dependency on scene ID to reset derived selection state

key-files:
  created: []
  modified:
    - src/app/tour/[slug]/page.tsx

key-decisions:
  - "AnimatePresence children require stable key props (hotspot._id and videoModalUrl) — without them Framer Motion cannot detect unmount and exit animation never fires"
  - "handleHotspotClick routing order: navigation first (returns early), then media+video, then info panel fallback — prevents info panel opening for navigation hotspots"
  - "useEffect on [activeSceneId, setActiveHotspot] closes info panel on scene change — Zustand setActiveHotspot is stable (not recreated) so no infinite loop"
  - "Parameters<typeof HotspotInfoPanel>[0]['hotspot'] type extraction avoids adding a new any cast while maintaining Convex data compatibility"

patterns-established:
  - "AnimatePresence wrapping with stable key: required for exit animation on conditional render"
  - "Zustand store getState() for imperative calls inside useCallback (avoids stale closure)"

requirements-completed: [HS6-05]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 6 Plan 05: Wire HotspotInfoPanel and HotspotVideoModal into Public Tour Viewer Summary

**End-to-end hotspot experience wired in public tour viewer: AnimatePresence-driven info panel slide-in, full-screen video modal, scene-change auto-close, and WCAG 2.5.5 mobile touch target compliance**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T~T09:12:42Z
- **Completed:** 2026-03-09
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Wired HotspotInfoPanel into public viewer via AnimatePresence with stable key prop — clicking an info/link/media-no-video hotspot slides the panel in from the right with exit animation on X close
- Wired HotspotVideoModal via AnimatePresence — clicking a media hotspot with videoUrl opens full-screen modal; backdrop click fades it out
- Extended handleHotspotClick to route all three types: navigation (scene transition), media+video (video modal), info/link/media-no-video (info panel)
- useEffect on activeSceneId closes info panel automatically when navigating between scenes
- Adaptive mobile layout: lead panel fills full width on mobile (w-full sm:w-[280px]), submit and top-bar buttons have 44px minimum touch targets, controls bar clears iPhone home indicator via safe-area-inset-bottom

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire hotspot panels into the public viewer with AnimatePresence** - `ded2eaf` (feat)
2. **Task 2: Adaptive mobile layout improvements in the viewer** - `fecd3da` (feat)

## Files Created/Modified
- `src/app/tour/[slug]/page.tsx` - Added AnimatePresence+HotspotInfoPanel+HotspotVideoModal wiring, extended handleHotspotClick, added scene-change close effect, applied responsive/touch-target layout improvements

## Decisions Made
- AnimatePresence children require stable `key` props (`activeHotspot._id` and `videoModalUrl`) — without unique keys Framer Motion cannot detect the previous node unmounting, so exit animations never fire
- `handleHotspotClick` routing order: navigation first (early return), then media+videoSrc (video modal), then fallback to info panel — prevents navigation hotspots accidentally opening the info panel
- `useEffect([activeSceneId, setActiveHotspot])` resets `activeHotspotId` to null on scene change — Zustand setActiveHotspot is a stable reference (doesn't change), so no infinite loop risk
- Used `Parameters<typeof HotspotInfoPanel>[0]['hotspot']` type extraction to avoid introducing a new explicit `any` cast while accepting the Convex-typed data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — all changes applied cleanly. Pre-existing `as any` casts in the file (PanoramaViewer hotspots prop and SceneNav scenes prop) were not introduced by this plan and were left untouched per scope boundary rules.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6 complete end-to-end: hotspot schema extensions (Plan 01), viewer store + utilities (Plan 02), HotspotMarker with icon registry (Plan 03), HotspotInfoPanel and HotspotVideoModal components (Plan 04), editor form fields (Plan 06), and public viewer wiring (this plan — 05)
- All hotspot customization features are visible to tour visitors and editable by tour owners
- No blockers for downstream phases

---
*Phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout*
*Completed: 2026-03-09*
