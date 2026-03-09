---
phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout
plan: 04
subsystem: ui
tags: [framer-motion, viewer, hotspot, responsive, video, react]

# Dependency graph
requires:
  - phase: 06-02
    provides: parseVideoUrl utility and useViewerStore Zustand store

provides:
  - HotspotInfoPanel: responsive right-drawer (desktop) / bottom-sheet (mobile) rich info panel
  - HotspotVideoModal: full-screen video overlay with iframe/native video selection

affects:
  - "06-05 — wires both components into the public tour viewer page via AnimatePresence"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DOM-sibling rendering: both components rendered outside R3F Canvas as fixed viewport overlays to avoid z-index stacking context conflicts"
    - "AnimatePresence-ready: motion.div initial/animate/exit props on all overlays for clean enter/exit transitions"
    - "Mobile-first responsive panel: sm: breakpoint switches bottom-sheet to right-drawer"

key-files:
  created:
    - src/components/viewer/HotspotInfoPanel.tsx
    - src/components/viewer/HotspotVideoModal.tsx
  modified: []

key-decisions:
  - "HotspotInfoPanel and HotspotVideoModal are DOM siblings outside R3F Canvas — avoids z-index/stacking context conflicts that occur with R3F Html components inside Canvas"
  - "HotspotVideoModal has no autoPlay — mobile browsers (iOS Safari, Chrome Android) block autoplay and show black screen or infinite spinner; user clicks play manually"
  - "z-50 for HotspotInfoPanel, z-[60] (zIndex:60) for HotspotVideoModal — video always renders above info panel"

patterns-established:
  - "Viewer overlay pattern: fixed viewport position, motion.div with initial/animate/exit, rendered as DOM sibling to Canvas"
  - "Mobile bottom-sheet to desktop drawer: inset-x-0 bottom-0 sm:inset-x-auto sm:right-0 sm:top-0 pattern"

requirements-completed:
  - HS6-04

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 06 Plan 04: HotspotInfoPanel and HotspotVideoModal Summary

**Responsive right-drawer info panel and full-screen video overlay for hotspot rich content, rendered as DOM siblings outside R3F Canvas**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T09:02:47Z
- **Completed:** 2026-03-09T09:05:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created HotspotInfoPanel: responsive fixed overlay (right-drawer on sm+, bottom-sheet on mobile) with title, image, description, content, external link, and CTA button sections — all conditional on hotspot data
- Created HotspotVideoModal: full-screen backdrop overlay at z-index 60, uses parseVideoUrl to branch between native video element (direct URLs) and iframe (YouTube/Vimeo), no autoplay, backdrop-click-to-close
- Both components use Framer Motion motion.div with initial/animate/exit props enabling AnimatePresence to fire exit animations when Plan 05 unmounts them

## Task Commits

1. **Task 1: HotspotInfoPanel — responsive right-drawer and bottom-sheet** - `3c21b86` (feat)
2. **Task 2: HotspotVideoModal — full-screen video overlay** - `40a3f66` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/components/viewer/HotspotInfoPanel.tsx` - Responsive info panel: right-drawer on desktop, bottom-sheet on mobile; shows title, image, description, CTA; z-50
- `src/components/viewer/HotspotVideoModal.tsx` - Full-screen video overlay at z-index 60; uses parseVideoUrl for iframe vs native video; backdrop click closes

## Decisions Made

- Both components are DOM siblings outside the R3F Canvas to avoid z-index stacking context conflicts that arise with R3F Html components
- No autoPlay on video element — mobile browsers block it causing black screens; user clicks play manually
- z-50 vs zIndex:60 layering ensures video modal always appears above info panel

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both components are importable and ready for wiring in Plan 05 (public tour viewer page)
- Both components require AnimatePresence wrapper in the parent page — Plan 05 is responsible for that
- HotspotInfoPanel expects the parent to call setActiveHotspot(null) via the onClose prop (Plan 05 wires this)
- HotspotVideoModal expects the parent to call closeVideoModal() via the onClose prop (Plan 05 wires this)

---
*Phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout*
*Completed: 2026-03-09*
