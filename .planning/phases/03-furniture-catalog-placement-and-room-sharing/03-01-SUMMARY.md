---
phase: 03-furniture-catalog-placement-and-room-sharing
plan: 01
subsystem: database
tags: [convex, zustand, furniture, catalog, placement, 3d]

requires:
  - phase: 01-tour-platform-stabilize-and-polish
    provides: "Convex schema with tours/scenes tables, Zustand store pattern"
provides:
  - "furnitureItems, furnishedRooms, placedFurniture Convex tables"
  - "Furniture catalog CRUD queries with search index"
  - "Furnished room persistence with placement save/load"
  - "useFurnitureStore Zustand store for client-side placement state"
affects: [03-02, 03-03, 03-04, 03-05, 03-06]

tech-stack:
  added: []
  patterns: [furniture-catalog-query, placement-state-management, undo-stack-pattern]

key-files:
  created:
    - convex/furnitureItems.ts
    - convex/furnishedRooms.ts
    - src/hooks/useFurnitureStore.ts
  modified:
    - convex/schema.ts

key-decisions:
  - "Catalog queries (list, search, getById) are public — no auth required for browsing"
  - "savePlacements uses delete-all-then-insert pattern for idempotent room saves"
  - "Undo stack capped at 50 with shift-oldest strategy"
  - "setGhostItem auto-switches mode to furnish for seamless catalog-to-placement flow"

patterns-established:
  - "Furniture placement state: Zustand store with ghost preview, placed items, undo stack"
  - "Catalog search: Convex searchIndex on name with category/style filter fields"

requirements-completed: [FURN-01, FURN-02, FURN-03]

duration: 2min
completed: 2026-03-10
---

# Phase 3 Plan 01: Schema, Backend, and Furniture Store Summary

**Three Convex tables (furnitureItems/furnishedRooms/placedFurniture) with catalog CRUD, room persistence, and Zustand placement state with undo stack**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-10T01:41:08Z
- **Completed:** 2026-03-10T01:43:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- furnitureItems table with search index on name and indexed queries for category/style filtering
- furnishedRooms and placedFurniture tables for persisting user room arrangements
- Full CRUD backend: list, search, getById, seed, create, getBySlug, savePlacements, deleteRoom
- useFurnitureStore with mode switching, ghost preview metadata, placed items CRUD, undo/redo, selection, camera centering, and transform controls

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Convex schema and create furniture backend functions** - `daa46fc` (feat)
2. **Task 2: Create useFurnitureStore Zustand store** - `14aa066` (feat)

## Files Created/Modified
- `convex/schema.ts` - Added furnitureItems, furnishedRooms, placedFurniture table definitions
- `convex/furnitureItems.ts` - Catalog CRUD queries with search and URL resolution
- `convex/furnishedRooms.ts` - Room creation, placement persistence, slug-based public access
- `src/hooks/useFurnitureStore.ts` - Client-side furniture placement state management

## Decisions Made
- Catalog queries (list, search, getById) are public — no auth required for browsing furniture
- savePlacements uses delete-all-then-insert pattern for idempotent saves
- Undo stack capped at 50 entries with shift-oldest eviction
- setGhostItem auto-switches mode to 'furnish' for seamless catalog-to-placement flow
- getBySlug is public (no auth) to support shared room viewing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Schema and store foundation ready for Plan 02 (Catalog UI) and Plan 03 (3D FurnitureLayer)
- All types exported for downstream consumption
- No blockers

---
*Phase: 03-furniture-catalog-placement-and-room-sharing*
*Completed: 2026-03-10*
