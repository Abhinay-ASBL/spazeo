---
phase: 02-3d-capture-pipeline-and-splat-viewer
plan: 06
subsystem: viewer
tags: [three.js, r3f, zustand, nipplejs, gaussian-splatting, navigation, mobile]

requires:
  - phase: 02-01
    provides: reconstructionJobs table and tours.splatStorageId field
  - phase: 02-02
    provides: spark.js WASM rendering in R3F Canvas via SplatScene
provides:
  - Three navigation modes (dollhouse, free-roam, hotspot) for 3D splat viewer
  - Mode switcher pill toolbar with animated transitions
  - Virtual joystick for mobile free-roam navigation
  - 3D hotspot markers with Gold pulse rings and hover tooltips
  - Conditional rendering on public tour page (splat vs panorama)
  - Zustand store for 3D viewer state management
affects: [phase-03-furniture, public-tour-viewer]

tech-stack:
  added: [nipplejs]
  patterns: [zustand-viewer-store, lerp-camera-transitions, conditional-viewer-rendering, billboard-3d-markers]

key-files:
  created:
    - src/hooks/useSplatViewerStore.ts
    - src/components/viewer/NavigationModes.tsx
    - src/components/viewer/ModeSwitcher.tsx
    - src/components/viewer/VirtualJoystick.tsx
    - src/components/viewer/SplatHotspot3D.tsx
  modified:
    - src/components/viewer/GaussianSplatViewer.tsx
    - src/components/viewer/SplatScene.tsx
    - src/app/tour/[slug]/page.tsx
    - convex/tours.ts
    - package.json

key-decisions:
  - "Three navigation modes use lerp/slerp camera transitions (~1s) instead of gsap — pure Three.js/R3F"
  - "Virtual joystick uses nipplejs with 120px zone and 40px handle for mobile free-roam"
  - "SplatHotspot3D uses drei Billboard for camera-facing markers with Gold pulse ring animation"
  - "Public tour page conditionally renders GaussianSplatViewer vs PanoramaViewer based on splatStorageId"
  - "Click-to-move raycasts onto invisible floor plane at y=0 and lerps camera at eye height (1.6m)"
  - "Stray setState during render in NavigationModes fixed as bug (d84c0ee)"

patterns-established:
  - "Zustand store pattern for 3D viewer state: navMode, transitioning, controlsVisible, joystickVector"
  - "Conditional viewer rendering: check splatStorageId to switch between 3D and panorama viewers on same URL"
  - "Mode transition guard: setNavMode only fires when not transitioning and mode differs"
  - "Auto-hiding mobile controls: controlsVisible resets after 3s inactivity, tap to show"

requirements-completed: [VIEW3D-01, VIEW3D-02, VIEW3D-03, VIEW3D-04]

duration: 8m
completed: 2026-03-09
---

# Phase 2 Plan 06: Navigation Modes, Mode Switcher, Virtual Joystick, and Public Viewer Summary

**Three 3D navigation modes (dollhouse, free-roam, hotspot) with smooth lerp transitions, nipplejs virtual joystick, Gold pulse-ring hotspot markers, and conditional splat/panorama rendering on the public tour page**

## Performance

- **Duration:** ~8 min (across two sessions with checkpoint)
- **Started:** 2026-03-09T14:00:00Z
- **Completed:** 2026-03-09T19:40:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 11

## Accomplishments
- Three navigation modes with animated camera transitions: dollhouse (overhead orbit), free-roam (eye-height click-to-move), and hotspot (marker-to-marker flight)
- Mode switcher pill toolbar at bottom-center with Gold active state, 44px touch targets, and auto-hide on mobile
- Virtual joystick for mobile free-roam using nipplejs with directional camera movement
- 3D hotspot markers using drei Billboard with Gold pulse rings and hover tooltips
- Public tour page auto-switches between GaussianSplatViewer and PanoramaViewer based on tour.splatStorageId
- Fullscreen and share controls in viewer header bar

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zustand store, navigation mode camera logic, and mode switcher UI** - `9dc5ecf` (feat)
2. **Task 2: Create VirtualJoystick, SplatHotspot3D, update GaussianSplatViewer, and wire into public tour page** - `7fda2d7` (feat)
3. **Task 3: Verify 3D viewer navigation modes and mobile UX** - Checkpoint approved (no commit needed)

**Bug fix:** `d84c0ee` - Removed stray setState call during render in NavigationModes

## Files Created/Modified
- `src/hooks/useSplatViewerStore.ts` - Zustand store for navMode, transitioning, controlsVisible, joystickVector
- `src/components/viewer/NavigationModes.tsx` - R3F component with camera logic for all three modes and lerp transitions
- `src/components/viewer/ModeSwitcher.tsx` - Floating pill toolbar with three mode icons and auto-hide
- `src/components/viewer/VirtualJoystick.tsx` - nipplejs wrapper for mobile free-roam directional input
- `src/components/viewer/SplatHotspot3D.tsx` - Billboard 3D hotspot marker with Gold pulse ring animation
- `src/components/viewer/GaussianSplatViewer.tsx` - Updated with NavigationModes, hotspot props, ModeSwitcher, VirtualJoystick
- `src/components/viewer/SplatScene.tsx` - Added invisible floor plane for click-to-move raycasting
- `src/app/tour/[slug]/page.tsx` - Conditional rendering: GaussianSplatViewer when splatStorageId exists
- `convex/tours.ts` - Added getSplatUrl query for resolving splat storage URLs
- `package.json` - Added nipplejs dependency

## Decisions Made
- Three navigation modes use Vector3.lerp and Quaternion.slerp for smooth transitions instead of gsap — keeps dependencies pure Three.js/R3F
- Virtual joystick uses nipplejs (120px zone, 40px handle) positioned bottom-left, only visible on touch devices in free-roam
- SplatHotspot3D uses drei Billboard component so markers always face camera with Gold pulse ring matching Phase 1 hotspot style
- Public tour page uses same URL pattern — checks splatStorageId to decide which viewer to render
- Click-to-move raycasts onto invisible floor plane (y=0) and lerps camera position at eye height (y=1.6m)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stray setState during render in NavigationModes**
- **Found during:** Task 2 verification
- **Issue:** NavigationModes component called setState directly during render causing React warning
- **Fix:** Moved state update to useEffect
- **Files modified:** src/components/viewer/NavigationModes.tsx
- **Verification:** No console warnings during mode transitions
- **Committed in:** d84c0ee

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor render-time bug fix. No scope creep.

## Issues Encountered
None beyond the stray setState bug documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 is now complete: GPU reconstruction pipeline, spark.js splat rendering, capture upload UI, progress tracking, RunPod integration, and all three navigation modes are operational
- Phase 3 (Furniture Catalog, Placement, and Room Sharing) can begin — it builds on the 3D viewer established in this plan
- Hotspot placement in 3D space is a future enhancement — current hotspot mode works with navigation-aware camera but no 3D hotspots are placed by default

## Self-Check: PASSED

- All 9 key files verified present on disk
- All 3 commits verified in git history (9dc5ecf, 7fda2d7, d84c0ee)

---
*Phase: 02-3d-capture-pipeline-and-splat-viewer*
*Completed: 2026-03-09*
