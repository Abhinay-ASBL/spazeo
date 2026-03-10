---
phase: 04-floor-plan-extraction
plan: 04
subsystem: ui
tags: [react-konva, konva, zustand, floor-plan, editor, 2d-diagram, drawing-tools, split-view]

# Dependency graph
requires:
  - phase: 04-floor-plan-extraction
    provides: Convex schema with floorPlanDetails table, geometry storage, updateGeometry/resetToAiVersion mutations
provides:
  - Interactive 2D floor plan editor with react-konva Stage and multi-layer rendering
  - Zustand editor store with geometry state, undo/redo (50-cap), tool selection, viewport tracking
  - Split-view layout with original image overlay (left) and editable diagram (right)
  - 6 drawing tools (select, wall, room, door, window, eraser)
  - Properties panel with context-sensitive editing for all element types
  - Minimap with viewport indicator and click-to-navigate
affects: [04-05, 05-floor-plan-to-3d]

# Tech tracking
tech-stack:
  added: [react-konva, konva]
  patterns: [multi-layer Konva Stage for performance (grid/walls/rooms/doors/dimensions/preview/selection), Zustand store with undo stack cap 50 and shift-oldest eviction, lazy-loaded DiagramCanvas with SSR disabled]

key-files:
  created:
    - src/stores/floorPlanEditorStore.ts
    - src/components/floor-plan/FloorPlanEditor.tsx
    - src/components/floor-plan/DiagramCanvas.tsx
    - src/components/floor-plan/OriginalOverlay.tsx
    - src/components/floor-plan/PropertiesPanel.tsx
    - src/components/floor-plan/DrawingToolbar.tsx
    - src/components/floor-plan/EditorMiniMap.tsx
  modified: []

key-decisions:
  - "react-konva dynamically imported with lazy() to avoid SSR issues with canvas APIs"
  - "Coordinates stored in meters (canonical), converted to pixels (PPM=50) only at render time in canvas components"
  - "Multi-layer Konva architecture with listening:false on grid/dimension layers for performance"
  - "Wall deletion cascades to attached doors/windows in Zustand store for referential integrity"
  - "ID counters (w1, r1, d1, win1) auto-initialized from existing geometry on setGeometry"

patterns-established:
  - "Floor plan editor uses Zustand store as single source of truth shared across overlay, diagram, and properties panel"
  - "PPM (pixels per meter) constant for coordinate conversion at render boundary"
  - "Drawing tool state machine: tool selection clears drawingPoints; wall needs 2 clicks; room needs 3+ clicks + double-click"

requirements-completed: [FP-03]

# Metrics
duration: 5m
completed: 2026-03-10
---

# Phase 4 Plan 04: Floor Plan Editor Summary

**Interactive 2D floor plan editor with react-konva split-view, 6 drawing tools, Zustand undo/redo, dimension display, and properties panel**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T09:06:12Z
- **Completed:** 2026-03-10T09:11:39Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Full interactive 2D floor plan editor with react-konva multi-layer Stage architecture
- Zustand store managing geometry, selection, tool state, drawing progress, viewport, and 50-item undo/redo history
- Split-view layout: original image with SVG overlay (left) + editable Konva diagram (right)
- 6 drawing tools: select (drag endpoints), wall (two-click), room (polygon + double-click close), door/window (click on wall), eraser
- Properties panel with context-sensitive editing for wall coordinates, room name/type/area, door width/swing, window width
- Low-confidence elements highlighted in amber with hover tooltip
- Minimap with viewport rectangle and click-to-navigate

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zustand editor store, toolbar, and minimap** - `b24770f` (feat)
2. **Task 2: Build DiagramCanvas, OriginalOverlay, and PropertiesPanel** - `4bc9eee` (feat)

## Files Created/Modified
- `src/stores/floorPlanEditorStore.ts` - Zustand store with geometry, undo/redo, tool state, viewport, ID generators
- `src/components/floor-plan/FloorPlanEditor.tsx` - Main split-view editor container with save/reset/keyboard shortcuts
- `src/components/floor-plan/DiagramCanvas.tsx` - react-konva Stage with 8 layers (grid, rooms, walls, doors/windows, dimensions, preview, selection, tooltip)
- `src/components/floor-plan/OriginalOverlay.tsx` - Original floor plan image with synchronized SVG wall/room overlay
- `src/components/floor-plan/PropertiesPanel.tsx` - Context-sensitive property editor for all element types
- `src/components/floor-plan/DrawingToolbar.tsx` - Tool selection bar with undo/redo and save/reset actions
- `src/components/floor-plan/EditorMiniMap.tsx` - Corner minimap with wall overview and viewport indicator
- `package.json` - Added react-konva and konva dependencies

## Decisions Made
- react-konva dynamically imported via lazy() to prevent SSR canvas API errors
- All coordinates stored in meters (canonical); PPM=50 conversion happens only at Konva render boundary
- Multi-layer Konva architecture with listening:false on non-interactive layers (grid, dimensions) for performance
- Wall deletion cascades to remove attached doors/windows in the Zustand store
- ID counters auto-initialize from existing geometry when setGeometry is called

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed react-konva and konva dependencies**
- **Found during:** Task 1
- **Issue:** react-konva and konva packages not present in project
- **Fix:** Ran npm install react-konva konva
- **Files modified:** package.json, package-lock.json
- **Committed in:** b24770f

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential dependency installation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Editor components ready for integration into floor plan upload/extraction flow
- Zustand store geometry types match Convex schema v.any() geometry shape
- Save calls Convex updateGeometry mutation; reset calls resetToAiVersion mutation
- DiagramCanvas lazy-loaded for SSR compatibility

---
*Phase: 04-floor-plan-extraction*
*Completed: 2026-03-10*
