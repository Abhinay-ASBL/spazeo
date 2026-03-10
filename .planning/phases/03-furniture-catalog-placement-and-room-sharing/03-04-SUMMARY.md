---
phase: 03-furniture-catalog-placement-and-room-sharing
plan: 04
subsystem: ui
tags: [r3f, three.js, zustand, furniture, viewer-integration, mode-switcher, framer-motion]

requires:
  - phase: 03-furniture-catalog-placement-and-room-sharing
    provides: "FurnitureLayer R3F component, CatalogSidebar/BottomSheet UI, useFurnitureStore"
provides:
  - "Furnish mode toggle in ModeSwitcher with nav mode mutual exclusion"
  - "FurnitureToolbar floating pill with Rotate/Scale/Delete for selected items"
  - "FurnitureCameraController smooth lerp animation for cost-list item centering"
  - "Full viewer integration: FurnitureLayer + CatalogSidebar/BottomSheet inside GaussianSplatViewer"
  - "enableFurniture prop to gate furniture features on read-only pages"
affects: [03-05, 03-06]

tech-stack:
  added: []
  patterns: [mode-switcher-extension, furniture-toolbar-overlay, camera-center-animation]

key-files:
  created:
    - src/components/viewer/FurnitureToolbar.tsx
    - src/components/viewer/FurnitureCameraController.tsx
  modified:
    - src/components/viewer/ModeSwitcher.tsx
    - src/components/viewer/GaussianSplatViewer.tsx
    - src/components/viewer/NavigationModes.tsx

key-decisions:
  - "enableFurniture prop defaults to false — public share pages do not load furniture components"
  - "OrbitControls gets makeDefault so FurnitureCameraController can access controls via useThree"
  - "NavigationModes click-to-move disabled in furnish mode via useFurnitureStore.getState() check"
  - "CatalogSidebar is desktop-only (hidden md:block), CatalogBottomSheet is mobile-only (block md:hidden)"
  - "FurnitureToolbar positioned at bottom: 80px to avoid overlap with ModeSwitcher at bottom: 16px"

patterns-established:
  - "Mode-gated rendering: enableFurniture prop prevents any furniture code from loading"
  - "Camera centering: useFrame lerp loop with arrival threshold to smoothly animate OrbitControls target"
  - "Responsive catalog layout: sidebar on desktop, bottom sheet on mobile via CSS breakpoints"

requirements-completed: [FURN-04, FURN-05, FURN-08]

duration: 3min
completed: 2026-03-10
---

# Phase 03 Plan 04: Viewer Integration Summary

**Furnish mode toggle in ModeSwitcher, floating toolbar for selected items, camera centering on cost-list clicks, and full CatalogSidebar/BottomSheet wiring into GaussianSplatViewer**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T01:49:55Z
- **Completed:** 2026-03-10T01:53:28Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- ModeSwitcher extended with Furnish toggle button separated by gold divider, disables nav modes when active
- FurnitureToolbar renders floating pill with Rotate/Scale/Delete buttons, keyboard shortcuts (R/S/Del), and framer-motion animations
- FurnitureCameraController smoothly lerps OrbitControls target to center on items clicked in CostTracker
- GaussianSplatViewer renders CatalogSidebar (desktop) or CatalogBottomSheet (mobile) alongside Canvas in furnish mode
- NavigationModes click-to-move disabled during furnish mode to prevent handler conflicts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Furnish mode to ModeSwitcher, create FurnitureToolbar and FurnitureCameraController** - `dc50c3f` (feat)
2. **Task 2: Wire FurnitureLayer, CatalogSidebar, and CameraController into GaussianSplatViewer** - `711fa6f` (feat)

## Files Created/Modified
- `src/components/viewer/ModeSwitcher.tsx` - Added Furnish toggle with divider, nav mode disabling, enableFurniture prop
- `src/components/viewer/FurnitureToolbar.tsx` - Floating mini toolbar for Rotate/Scale/Delete with keyboard hints
- `src/components/viewer/FurnitureCameraController.tsx` - R3F component for smooth camera centering via OrbitControls lerp
- `src/components/viewer/GaussianSplatViewer.tsx` - Integrated FurnitureLayer, CatalogSidebar/BottomSheet, FurnitureToolbar, enableFurniture prop
- `src/components/viewer/NavigationModes.tsx` - Disabled click-to-move in furnish mode via useFurnitureStore check

## Decisions Made
- enableFurniture prop defaults to false so public share pages do not load furniture components
- OrbitControls gets makeDefault attribute for FurnitureCameraController to access via useThree controls
- Click-to-move disabled in furnish mode by checking useFurnitureStore.getState().mode in the click handler
- CatalogSidebar desktop-only (hidden md:block), CatalogBottomSheet mobile-only (block md:hidden)
- FurnitureToolbar at bottom: 80px to avoid overlap with ModeSwitcher at bottom: 16px

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All furniture components fully integrated into GaussianSplatViewer
- Complete flow: toggle furnish mode, browse catalog, click item, ghost preview, click floor to place, select item, rotate/scale/delete
- Camera centering from cost-list clicks works end-to-end
- Ready for Plan 05 (save/share) and Plan 06 (room persistence)

---
*Phase: 03-furniture-catalog-placement-and-room-sharing*
*Completed: 2026-03-10*
