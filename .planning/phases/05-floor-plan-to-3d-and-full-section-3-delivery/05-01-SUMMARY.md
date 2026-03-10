---
phase: 05-floor-plan-to-3d-and-full-section-3-delivery
plan: "01"
subsystem: backend-schema
tags: [schema, convex, floor-plan, mutations]
dependency_graph:
  requires: [04-01, 04-04]
  provides: [floor-plan-tour-schema, createFromFloorPlan-mutation, insertDoorwayHotspots-mutation, generate-3d-space-button]
  affects: [convex/schema.ts, convex/tours.ts, convex/hotspots.ts, FloorPlanEditor]
tech_stack:
  added: []
  patterns: [optional-schema-fields-backward-compat, atomic-mutation-tour-scene-hotspots]
key_files:
  created: []
  modified:
    - convex/schema.ts
    - convex/tours.ts
    - convex/hotspots.ts
    - convex/scenes.ts
    - convex/demoTours.ts
    - src/components/floor-plan/FloorPlanEditor.tsx
    - src/app/(dashboard)/floor-plans/[id]/edit/FloorPlanEditorShell.tsx
decisions:
  - "createFromFloorPlan creates Tour + Scene + doorway hotspots in one mutation transaction — no separate action needed"
  - "scenes.imageStorageId made optional — floor_plan scenes have no panorama image, null guard added to all getUrl callers"
  - "Generate 3D Space button uses showGenerate3DButton = extractionStatus === 'completed' guard — only shown when extraction is done"
  - "extractionStatus passed as optional prop from FloorPlanEditorShell to FloorPlanEditor — no store changes needed"
metrics:
  duration: 7m
  completed_date: "2026-03-10"
  tasks_completed: 2
  files_modified: 7
---

# Phase 5 Plan 01: Schema + Mutations for Floor Plan Derived Tours

**One-liner:** Extended Convex schema with optional floor plan tour fields and created createFromFloorPlan + insertDoorwayHotspots mutations with a teal Generate 3D Space CTA in the Phase 4 editor.

## What Was Built

Extended the data layer to support floor-plan-derived tours — the entrypoint into Phase 5. Three schema additions (all optional/backward compatible), two new Convex mutations, and a Generate 3D Space button in the FloorPlanEditor toolbar.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend Convex schema with floor plan tour fields | c7922a3 | convex/schema.ts, convex/scenes.ts |
| 2 | Add mutations and wire editor button | 0892ff9 | convex/tours.ts, convex/hotspots.ts, convex/demoTours.ts, FloorPlanEditor.tsx, FloorPlanEditorShell.tsx |

## Decisions Made

- **createFromFloorPlan in tours.ts (not an action):** All three writes (tour, scene, hotspots) are DB-only, so a single mutation is correct — no external APIs required, transaction semantics guaranteed.
- **scenes.imageStorageId made optional:** Floor plan scenes have no panorama image. Required callers in scenes.ts, demoTours.ts, tours.ts all have null guards via conditional `scene.imageStorageId ?` checks.
- **extractionStatus prop (not store):** FloorPlanEditorShell already holds the floor plan data — passing `extractionStatus` as an optional prop avoids store pollution and keeps the editor component self-contained.
- **Generate 3D Space button position:** Rendered as flex sibling after DrawingToolbar with a vertical divider separator — doesn't require modifying the DrawingToolbar component interface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed null-safety for optional imageStorageId in scenes.ts**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** Making `scenes.imageStorageId` optional caused 4 TypeScript errors in `convex/scenes.ts` where `ctx.storage.getUrl(scene.imageStorageId)` and `ctx.storage.delete(scene.imageStorageId)` expected a non-optional `Id<'_storage'>`.
- **Fix:** Added `scene.imageStorageId ? await ctx.storage.getUrl(...) : null` guards in `listByTour`, `getById`, `replaceImage`, and `remove`.
- **Files modified:** convex/scenes.ts
- **Commit:** c7922a3

**2. [Rule 1 - Bug] Fixed null-safety for optional imageStorageId in demoTours.ts**
- **Found during:** Task 2 verification (tsc --noEmit after mutations added)
- **Issue:** `convex/demoTours.ts` line 58 also called `ctx.storage.getUrl(scene.imageStorageId)` without null check.
- **Fix:** Added `scene.imageStorageId ?` conditional.
- **Files modified:** convex/demoTours.ts
- **Commit:** 0892ff9

## Self-Check: PASSED

All key files exist. Both task commits (c7922a3, 0892ff9) verified in git log.
