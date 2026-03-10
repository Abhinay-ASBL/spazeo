---
phase: 03-furniture-catalog-placement-and-room-sharing
plan: 06
subsystem: database, ui
tags: [convex, furniture-catalog, glb, 3d-placement, seed-data]

# Dependency graph
requires:
  - phase: 03-furniture-catalog-placement-and-room-sharing (plans 01-05)
    provides: "Furniture schema, catalog UI, placement system, cost tracker, save/share flow"
provides:
  - "52-item furniture catalog seed data across 6 categories and 4 styles"
  - "3 test GLB primitives (cube, cylinder, sphere) for placement verification"
  - "Upload helper action to assign test GLBs to catalog items"
  - "Tour editor wired with enableFurniture for splat tours"
  - "Human-verified end-to-end furniture placement flow"
affects: [phase-04, phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GLB generation via Node.js script for test fixtures"
    - "Optional glbStorageId schema pattern for graceful seeding"

key-files:
  created:
    - convex/furnitureItems.ts (seedCatalog mutation, setGlbStorageId, uploadTestGlbs action)
    - public/test-glbs/cube.glb
    - public/test-glbs/cylinder.glb
    - public/test-glbs/sphere.glb
    - scripts/generate-test-glbs.cjs
  modified:
    - convex/schema.ts (glbStorageId made optional)
    - convex/furnishedRooms.ts
    - src/app/(dashboard)/tours/[id]/edit/page.tsx (enableFurniture prop for splat tours)

key-decisions:
  - "glbStorageId made optional in schema to allow catalog seeding without actual GLB files"
  - "Test GLBs generated as minimal valid binary primitives under 4KB each"
  - "enableFurniture prop defaults to false — only enabled for tours with splatStorageId"

patterns-established:
  - "Seed mutation pattern: bulk insert with upsert-like behavior for catalog data"
  - "Test GLB generation script for integration testing of 3D placement features"

requirements-completed: [FURN-01, FURN-02]

# Metrics
duration: 2m
completed: 2026-03-10
---

# Phase 03 Plan 06: Catalog Seed Data, Test GLBs, and E2E Verification Summary

**52-item furniture catalog seeded across 6 categories with test GLB primitives, tour editor wired for splat tours, and full placement flow human-verified**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-10T07:24:18Z
- **Completed:** 2026-03-10T07:24:37Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Seeded 52 furniture items with realistic metadata (dimensions, prices, Amazon URLs, style tags) across 6 categories
- Created 3 minimal test GLB primitives (cube, cylinder, sphere) for verifying placement, ghost preview, and transform controls
- Wired tour editor to pass enableFurniture=true to GaussianSplatViewer for splat tours only
- Human-verified complete end-to-end flow: catalog browsing, search/filter, click-to-place, transform controls, undo, cost tracker, save/share, and public share page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create catalog seed data, test GLB primitives, and wire tour editor** - `22f1ffb` (feat)
2. **Task 2: Verify complete furniture placement end-to-end flow** - checkpoint:human-verify approved

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `convex/furnitureItems.ts` - seedCatalog mutation with 52 items, setGlbStorageId mutation, uploadTestGlbs action
- `convex/schema.ts` - glbStorageId changed to v.optional(v.id('_storage'))
- `convex/furnishedRooms.ts` - Minor adjustments for optional glbStorageId handling
- `src/app/(dashboard)/tours/[id]/edit/page.tsx` - enableFurniture={true} for splat tours
- `public/test-glbs/cube.glb` - Minimal GLB cube primitive (~748 bytes)
- `public/test-glbs/cylinder.glb` - Minimal GLB cylinder primitive (~1.2KB)
- `public/test-glbs/sphere.glb` - Minimal GLB sphere primitive (~3.1KB)
- `scripts/generate-test-glbs.cjs` - Node.js script to regenerate test GLBs

## Decisions Made
- glbStorageId made optional in schema to allow catalog seeding without actual GLB files -- items without GLBs show as "Coming soon" in catalog UI
- Test GLBs generated as minimal valid binary primitives using a Node.js script rather than downloading from external sources
- enableFurniture prop only enabled for tours with splatStorageId -- panorama-only tours do not get furniture features

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (Furniture Catalog, Placement, and Room Sharing) is fully complete
- All 6 plans executed and verified
- Ready for Phase 4 (Floor Plan Extraction) or Phase 5 (AI Cost Estimation) as per roadmap dependencies

---
*Phase: 03-furniture-catalog-placement-and-room-sharing*
*Completed: 2026-03-10*
