---
phase: 03-furniture-catalog-placement-and-room-sharing
plan: 05
subsystem: ui, api
tags: [convex, react-three-fiber, share, furniture, cost-summary, amazon]

requires:
  - phase: 03-furniture-catalog-placement-and-room-sharing
    provides: "Furniture catalog, placement system, Gaussian Splat viewer with furniture mode"
provides:
  - "Save/share workflow for furnished rooms"
  - "Public share page at /tour/[slug]/furnished/[id]"
  - "CostSummaryPanel with itemized Amazon links"
  - "Furniture toggle (empty vs furnished comparison)"
affects: [phase-04, phase-05]

tech-stack:
  added: []
  patterns:
    - "Public share page with read-only R3F canvas reusing FurniturePiece"
    - "furnishedRooms.getBySlug returns nested tour context (title, slug, splatUrl)"
    - "Mobile collapsible bottom panel for cost summary"

key-files:
  created:
    - src/app/tour/[slug]/furnished/[id]/page.tsx
    - src/components/furnished/FurnishedRoomViewer.tsx
    - src/components/furnished/CostSummaryPanel.tsx
  modified:
    - src/components/viewer/GaussianSplatViewer.tsx
    - convex/furnishedRooms.ts

key-decisions:
  - "furnishedRooms.getBySlug restructured to return { room, tour, placements } for share page context"
  - "ReadOnlyFurniturePiece is a minimal wrapper (no TransformControls, no selection) rather than reusing FurniturePiece with disabled props"
  - "SplatScene loaded via require() in R3F context to avoid top-level spark.js bundling issues"
  - "priceUsd field used (not price) matching furnitureItems schema"

patterns-established:
  - "Public share pages use Convex public queries (no auth) with slug-based lookups"
  - "Cost summary responsive pattern: 320px sidebar on desktop, collapsible bottom panel on mobile"

requirements-completed: [SHARE-01, SHARE-02, SHARE-03]

duration: 3min
completed: 2026-03-10
---

# Phase 03 Plan 05: Save/Share Flow and Public Furnished Room Page Summary

**Save-to-Convex and shareable link workflow with public 3D viewer, itemized cost summary with Amazon links, and furniture toggle for empty vs furnished comparison**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T01:56:01Z
- **Completed:** 2026-03-10T01:59:58Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Save button in GaussianSplatViewer persists furniture arrangements to Convex and generates shareable URLs
- Public share page at /tour/[slug]/furnished/[id] renders read-only 3D room without authentication
- CostSummaryPanel displays itemized furniture costs with Amazon product links and total
- Furniture toggle (Eye/EyeOff) allows comparing empty vs furnished room

## Task Commits

Each task was committed atomically:

1. **Task 1: Add save/share flow to GaussianSplatViewer editor** - `8ae81ec` (feat)
2. **Task 2: Create public share page and CostSummaryPanel** - `01ea9f5` (feat)

## Files Created/Modified
- `src/app/tour/[slug]/furnished/[id]/page.tsx` - Public share page route with dynamic import
- `src/components/furnished/FurnishedRoomViewer.tsx` - Read-only 3D viewer with furniture pieces and cost panel
- `src/components/furnished/CostSummaryPanel.tsx` - Itemized cost list with Amazon links, responsive layout
- `src/components/viewer/GaussianSplatViewer.tsx` - Added save dialog, share button, load saved arrangement
- `convex/furnishedRooms.ts` - getBySlug now returns tour context (title, slug, splatUrl)

## Decisions Made
- Restructured furnishedRooms.getBySlug to return `{ room, tour, placements }` instead of flat object — share page needs tour context for title and splat URL
- Created ReadOnlyFurniturePiece as a minimal component rather than reusing FurniturePiece with disabled props — simpler, fewer dependencies, no transform/selection overhead
- Used require() for SplatScene inside R3F context to avoid top-level spark.js bundling issues with Turbopack
- Field name is priceUsd (not price) per furnitureItems schema

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed price field name mismatch**
- **Found during:** Task 1 (Save/share flow)
- **Issue:** Plan referenced `item.price` but furnitureItems schema uses `priceUsd`
- **Fix:** Changed to `p.furnitureItem.priceUsd` in placement mapping
- **Files modified:** src/components/viewer/GaussianSplatViewer.tsx
- **Committed in:** 8ae81ec (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Field name correction required for type safety. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (Furniture Catalog, Placement, Room Sharing) is complete with all 5 plans executed
- Share workflow enables end-to-end furniture staging and sharing flow
- Ready for Phase 4 (floor plan extraction) or Phase 5 (AI-powered staging)

---
*Phase: 03-furniture-catalog-placement-and-room-sharing*
*Completed: 2026-03-10*
