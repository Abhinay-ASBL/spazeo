---
phase: 01-tour-platform-stabilize-and-polish
plan: "03"
subsystem: ui
tags: [react-three-fiber, drei, OrbitControls, panorama, viewer, mobile, fullscreen, idle-timer]

# Dependency graph
requires: []
provides:
  - Pinch-to-zoom in panorama viewer via OrbitControls enableZoom=true with distance constraints
  - Idle timer auto-rotate: activates after 5s inactivity, stops on any user interaction
  - F key fullscreen keyboard shortcut with fullscreenchange event sync
  - touchAction:none on viewer container preventing mobile scroll interference
affects: [viewer, tour-editor, mobile-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Idle timer pattern using manualRotate + idleActive derived state for auto-rotate control
    - Fullscreen keyboard shortcut via document keydown event with input element guard
    - OrbitControls distance-based zoom (min/maxDistance) alongside FOV-based CameraController zoom

key-files:
  created: []
  modified:
    - src/components/viewer/PanoramaViewer.tsx
    - src/app/tour/[slug]/page.tsx

key-decisions:
  - "OrbitControls zoom (distance-based) and CameraController FOV zoom kept independent — they operate on different camera properties and don't conflict for panorama use"
  - "Idle timer starts fresh after manualRotate state change via useEffect dependency — avoids stale timer reference"
  - "F key handler guards against input/textarea targets to avoid blocking form field typing"

patterns-established:
  - "Idle timer pattern: idleTimerRef + manualRotate (user intent) + idleActive (timer state) = derived isAutoRotating"
  - "Fullscreen keyboard shortcut: document addEventListener on mount, cleanup on unmount, guard input elements"

requirements-completed:
  - VIEW-01
  - VIEW-02
  - VIEW-03

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 1 Plan 03: Viewer Mobile and UX Polish Summary

**Pinch-to-zoom via OrbitControls enableZoom=true, 5-second idle auto-rotate timer replacing manual toggle, and F key fullscreen shortcut with Escape-key sync**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-09T06:59:00Z
- **Completed:** 2026-03-09T07:02:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Enabled mobile pinch-to-zoom and desktop scroll zoom via OrbitControls with sensible distance limits (min 0.1, max 5)
- Replaced static auto-rotate toggle with idle timer: auto-rotate activates after 5 seconds of inactivity and stops immediately on any mouse/touch/key interaction
- Added F key keyboard shortcut for fullscreen with fullscreenchange event listener ensuring button icon stays accurate after Escape-key exit

## Task Commits

Each task was committed atomically:

1. **Task 1: Enable pinch-to-zoom in PanoramaViewer (VIEW-01)** - `5a822ae` (feat)
2. **Task 2: Idle auto-rotate timer + F key fullscreen shortcut (VIEW-02, VIEW-03)** - `5ad6a8d` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/components/viewer/PanoramaViewer.tsx` - enableZoom=true with zoomSpeed=0.5, minDistance=0.1, maxDistance=5; touchAction:none on container div
- `src/app/tour/[slug]/page.tsx` - idle timer (idleTimerRef + manualRotate + idleActive), F key listener, fullscreenchange listener, container div interaction handlers

## Decisions Made
- Kept OrbitControls distance-based zoom and CameraController FOV-based zoom as independent mechanisms — both work acceptably for panorama sphere and don't visually conflict
- Idle timer is driven by a simple setTimeout (not IntersectionObserver or requestAnimationFrame) — sufficient for 5-second precision
- Manual toggle button immediately clears timer and idleActive when toggled off, restarts timer when toggled on — state stays consistent

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — all pre-existing lint errors in modified files are from original code (as any casts, CameraController mutation pattern) not introduced by this plan's changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Viewer UX gaps VIEW-01, VIEW-02, VIEW-03 closed — ready for production
- Pinch zoom, idle auto-rotate, and F key fullscreen all functional
- No blockers for subsequent plans in Phase 1

---
*Phase: 01-tour-platform-stabilize-and-polish*
*Completed: 2026-03-09*
