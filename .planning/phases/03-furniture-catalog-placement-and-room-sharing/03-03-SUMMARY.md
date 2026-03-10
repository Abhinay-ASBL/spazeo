---
phase: 03-furniture-catalog-placement-and-room-sharing
plan: 03
subsystem: ui
tags: [r3f, three.js, drei, zustand, furniture, 3d-placement, transform-controls]

requires:
  - phase: 03-furniture-catalog-placement-and-room-sharing
    provides: useFurnitureStore Zustand store with PlacedItem, ghost state, undo stack
provides:
  - FurnitureGhost R3F component — cursor-following semi-transparent preview on floor plane
  - FurniturePiece R3F component — placed GLB with gold selection outline and TransformControls
  - FurnitureLayer R3F component — orchestrator for placement, selection, and keyboard shortcuts
affects: [03-04-furniture-save-share, 03-05-viewer-integration]

tech-stack:
  added: []
  patterns: [floor-plane-raycasting, ghost-preview-placement, transform-controls-gizmo]

key-files:
  created:
    - src/components/viewer/FurnitureGhost.tsx
    - src/components/viewer/FurniturePiece.tsx
    - src/components/viewer/FurnitureLayer.tsx
  modified: []

key-decisions:
  - "TransformControls ref typed as any to avoid drei type incompatibility with THREE.Group"
  - "Ghost material uses MeshBasicMaterial (not Standard) for consistent unlit semi-transparent look"
  - "Floor click catcher is 200x200 invisible plane at y=-0.001 to avoid z-fighting"

patterns-established:
  - "Floor plane raycasting: THREE.Plane(0,1,0) + ray.intersectPlane for y=0 cursor tracking"
  - "Ghost preview: Clone with material traversal override for semi-transparent gold effect"
  - "Selection glow: emissive color toggle on mesh materials via traverse"
  - "Keyboard shortcuts: document keydown listener with input/textarea guard and mode check"

requirements-completed: [FURN-04, FURN-05, FURN-06, FURN-08]

duration: 3min
completed: 2026-03-10
---

# Phase 03 Plan 03: 3D Furniture Placement Components Summary

**R3F ghost preview, click-to-place on floor plane, gold selection outline, and TransformControls gizmo for rotate/scale with full keyboard shortcuts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T01:45:08Z
- **Completed:** 2026-03-10T01:48:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- FurnitureGhost follows cursor via floor plane raycasting with semi-transparent gold MeshBasicMaterial
- FurniturePiece renders GLB with gold emissive selection glow and TransformControls (rotate/scale only, y=0 enforced)
- FurnitureLayer orchestrates ghost, placed items, floor click catcher, and all keyboard shortcuts (R, S, Delete, Ctrl+Z, Escape)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FurnitureGhost and FurniturePiece R3F components** - `14c50ed` (feat)
2. **Task 2: Create FurnitureLayer with click-to-place and keyboard shortcuts** - `8c63992` (feat)

## Files Created/Modified
- `src/components/viewer/FurnitureGhost.tsx` - Cursor-following ghost preview with gold semi-transparent material, floor plane raycasting
- `src/components/viewer/FurniturePiece.tsx` - Placed GLB with selection outline (emissive glow) and TransformControls gizmo
- `src/components/viewer/FurnitureLayer.tsx` - Orchestrator: ghost rendering, click-to-place, item selection/deselection, transform updates, keyboard shortcuts

## Decisions Made
- TransformControls ref typed as `any` — drei's exported TransformControls type doesn't match THREE.Group ref directly
- Ghost uses MeshBasicMaterial instead of MeshStandardMaterial for consistent unlit semi-transparent look regardless of scene lighting
- Floor click catcher positioned at y=-0.001 to avoid z-fighting with actual floor geometry
- Ghost hides (visible=false) when raycaster misses floor plane (e.g., pointing at sky)

## Deviations from Plan

None - plan executed exactly as written. The store already had ghostMetadata from Plan 01.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three R3F components ready to compose inside GaussianSplatViewer Canvas
- FurnitureLayer reads/writes from useFurnitureStore — catalog UI from Plan 02 connects seamlessly
- Plan 04 (save/share) and Plan 05 (viewer integration) can proceed

---
*Phase: 03-furniture-catalog-placement-and-room-sharing*
*Completed: 2026-03-10*
