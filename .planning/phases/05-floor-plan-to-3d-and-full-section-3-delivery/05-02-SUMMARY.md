---
phase: 05-floor-plan-to-3d-and-full-section-3-delivery
plan: "02"
subsystem: viewer
tags: [three.js, r3f, floor-plan, geometry, 3d-viewer]
dependency_graph:
  requires: [04-floor-plan-extraction]
  provides: [FloorPlanMesh, FloorPlanViewer, FloorPlanGeometry, FloorPlan3DOverrides, computeSceneBounds]
  affects: [05-03-review-page, 05-04-public-viewer]
tech_stack:
  added: []
  patterns: [BoxGeometry-wall-extrusion, ShapeGeometry-floor-polygon, GaussianSplatViewer-mirror-pattern, useMemo-geometry-disposal]
key_files:
  created:
    - src/components/viewer/FloorPlanMesh.tsx
    - src/components/viewer/FloorPlanViewer.tsx
  modified: []
decisions:
  - "FloorPlanMesh accepts overrides as Partial<FloorPlan3DOverrides> with defaults merged at component boundary — callers do not need to specify all override fields"
  - "geometryKey = JSON.stringify({geometry, ceilingHeight}) used as useMemo dependency to prevent per-frame geometry rebuilds when reference changes but data is identical"
  - "Door splits use 2D wall vector projection via THREE.Vector2 dot product to find parametric t position — handles walls at any angle"
  - "Header BoxGeometry added above each door opening at y = doorHeight + headerHeight/2 — structurally correct and visually complete"
  - "FloorPlanViewer dollhouse camera z-offset = cameraHeight so viewer starts looking down at scene center rather than inside it"
  - "HotspotMarker renders inline as teal MeshStandardMaterial sphere — minimal, no SplatHotspot3D dependency"
  - "NavigationModes has no sceneBounds prop — Canvas camera prop position handles initial dollhouse position directly"
metrics:
  duration: "7m"
  completed_date: "2026-03-10"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 05 Plan 02: FloorPlanMesh and FloorPlanViewer Summary

**One-liner:** Three.js wall BoxGeometry extrusion with door splits and ShapeGeometry floors, wrapped in a GaussianSplatViewer-mirrored R3F canvas shell with full furniture system integration.

## What Was Built

### FloorPlanMesh (src/components/viewer/FloorPlanMesh.tsx)

R3F component that converts 2D floor plan coordinate data into Three.js geometry:

- **Wall geometry:** Each wall becomes one or more `BoxGeometry` segments. When a wall has door openings, a `THREE.Vector2` dot product projects door centers onto the wall axis to find parametric position `t`. The wall is then split into left-segment, header-above-opening, and right-segment boxes. Header height = `ceilingHeight - doorHeight` to maintain structural integrity.
- **Floor geometry:** Each room polygon is converted to a `THREE.Shape`, then `ShapeGeometry` is applied and `rotateX(-Math.PI/2)` lays it flat on the XZ plane (Three.js horizontal plane).
- **Coordinate mapping:** 2D plan `x` → 3D `x`, 2D plan `y` → 3D `z` (vertical is 3D `y`).
- **Material colors:** Floor materials mapped by type (`wood`, `tile`, `carpet`, `concrete`, default grey).
- **Geometry memoization:** All geometry built in `useMemo` keyed on `JSON.stringify({geometry, ceilingHeight})` to prevent per-frame Three.js object creation.
- **Lighting:** Ambient (0.6) + two directional lights (0.8 + 0.3) included inside group.

**Exported:**
- `FloorPlanGeometry` interface
- `FloorPlan3DOverrides` interface
- `FloorPlanMesh` component
- `computeSceneBounds(geometry)` utility

### FloorPlanViewer (src/components/viewer/FloorPlanViewer.tsx)

Full R3F canvas shell mirroring GaussianSplatViewer architecture exactly:

- **Canvas camera:** Initial dollhouse position computed from `computeSceneBounds` — camera placed at `[centerX, max(width,depth)*0.8, centerZ + cameraHeight]` looking toward scene center.
- **Sub-components:** NavigationModes, ModeSwitcher, VirtualJoystick, FurnitureLayer, FurnitureToolbar, FurnitureCameraController, CatalogSidebar, CatalogBottomSheet — same imports and render patterns as GaussianSplatViewer.
- **enableFurniture prop:** Gates FurnitureLayer, FurnitureCameraController, FurnitureToolbar, CatalogSidebar, CatalogBottomSheet identically to Phase 3 pattern.
- **Hotspot conversion:** `DoorwayHotspot` (`{position: {x,y,z}}`) converted to `Hotspot3D` tuple format for NavigationModes. Rendered as teal sphere meshes inside Canvas.
- **Save/share dialog:** Full createRoom + savePlacements mutation flow copied from GaussianSplatViewer.
- **Fullscreen toggle:** containerRef + requestFullscreen/exitFullscreen + fullscreenchange listener.
- **OrbitControls config:** Mode-specific orbit configuration (dollhouse/freeRoam/hotspot) identical to GaussianSplatViewer.

**Named export:** `FloorPlanViewer` — consumers use `dynamic(() => import(...).then(m => ({ default: m.FloorPlanViewer })), { ssr: false })`.

## Deviations from Plan

None - plan executed exactly as written.

The one noted flexibility point was honored: NavigationModes does not accept a `sceneBounds` prop, so the initial dollhouse camera position was passed via Canvas `camera` prop directly (as the plan specified as the fallback).

## Self-Check: PASSED

Files created:
- FOUND: src/components/viewer/FloorPlanMesh.tsx (334 lines, > 80 minimum)
- FOUND: src/components/viewer/FloorPlanViewer.tsx (531 lines, > 100 minimum)

Exports verified:
- FloorPlanMesh: `FloorPlanGeometry`, `FloorPlan3DOverrides`, `computeSceneBounds`, `FloorPlanMesh`
- FloorPlanViewer: `FloorPlanViewer`

TypeScript: Zero errors in new files (`npx tsc --noEmit | grep FloorPlan` returns no output)

Commits:
- FOUND: e31a6f6 — feat(05-02): implement FloorPlanMesh Three.js geometry builder
- FOUND: 34b5131 — feat(05-02): implement FloorPlanViewer R3F canvas shell
