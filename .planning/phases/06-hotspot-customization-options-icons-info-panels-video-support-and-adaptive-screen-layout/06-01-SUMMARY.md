---
phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout
plan: "01"
subsystem: database
tags: [convex, schema, hotspots, phase6, backend]

# Dependency graph
requires: []
provides:
  - Convex hotspots table extended with 6 optional Phase 6 fields (iconName, panelLayout, videoUrl, ctaLabel, ctaUrl, accentColor)
  - create and update mutations in hotspots.ts accept all 6 new fields
affects:
  - 06-02-PLAN.md (HotspotMarker icon rendering reads iconName from document)
  - 06-03-PLAN.md (HotspotInfoPanel reads panelLayout, ctaLabel, ctaUrl, accentColor)
  - 06-04-PLAN.md (video modal reads videoUrl)
  - 06-05-PLAN.md (editor form writes all 6 new fields via update mutation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase 6 optional-field pattern: all new schema fields use v.optional() so existing documents remain valid without migration"
    - "panelLayout union: 'compact' | 'rich' | 'video' — literals identical in schema.ts and hotspots.ts"

key-files:
  created: []
  modified:
    - convex/schema.ts
    - convex/hotspots.ts

key-decisions:
  - "All 6 new fields are optional — backward compatibility with existing hotspot documents guaranteed without data migration"
  - "panelLayout uses a typed union of 3 literals ('compact', 'rich', 'video') not a free string, to constrain valid values at the DB layer"
  - "iconName is a free string (not a union) to allow any Lucide icon name without a rigid enum that would require schema changes for each new icon"

patterns-established:
  - "Schema-first: all new Phase 6 fields land in schema.ts + mutation args before any frontend work begins"
  - "Identical validator expressions in schema.ts and hotspots.ts (especially the panelLayout union) to keep types in sync"

requirements-completed: [HS6-01]

# Metrics
duration: 8min
completed: 2026-03-09
---

# Phase 6 Plan 01: Hotspot Schema Extension Summary

**Convex hotspots table extended with 6 optional Phase 6 fields (iconName, panelLayout, videoUrl, ctaLabel, ctaUrl, accentColor) plus matching create/update mutation args — zero-migration backward compatibility**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-09T08:00:00Z
- **Completed:** 2026-03-09T08:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended `hotspots` defineTable in `convex/schema.ts` with 6 new optional fields after `visible`
- Updated both `create` and `update` mutation args in `convex/hotspots.ts` to accept the 6 new fields
- Verified panelLayout union literals are identical in both files: `'compact' | 'rich' | 'video'`
- Confirmed all 6 fields use `v.optional()` — existing hotspot documents remain valid

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 6 optional Phase 6 fields to the hotspots table in convex/schema.ts** - `d09184e` (feat)
2. **Task 2: Add the same 6 optional fields to create and update mutation args in convex/hotspots.ts** - `3591855` (feat)

## Files Created/Modified

- `/Users/padidamabhinay/Desktop/UI/Spazeo/convex/schema.ts` - hotspots defineTable extended with iconName, panelLayout, videoUrl, ctaLabel, ctaUrl, accentColor (all optional)
- `/Users/padidamabhinay/Desktop/UI/Spazeo/convex/hotspots.ts` - create and update mutation args extended with the same 6 optional fields

## Decisions Made

- All 6 new fields use `v.optional()` — this guarantees existing hotspot documents (which lack the new fields) remain valid against the updated schema without any data migration
- `panelLayout` is a typed union `v.union(v.literal('compact'), v.literal('rich'), v.literal('video'))` rather than a free string, to constrain valid values at the DB layer
- `iconName` is a free `v.string()` (not a union enum) so any Lucide icon name can be used without requiring schema changes when new icons are needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `npm run lint` output shows 107 pre-existing errors in files unrelated to this plan (primarily `src/components/viewer/PanoramaViewer.tsx` and other UI components). No new errors were introduced in `convex/hotspots.ts` (confirmed by running `npx eslint convex/hotspots.ts` which produced no output).

## User Setup Required

None - no external service configuration required. Schema changes take effect automatically when `npx convex dev` is run.

## Next Phase Readiness

- All 6 Phase 6 hotspot fields are available in Convex documents and mutations
- Plans 06-02 through 06-06 can now read/write iconName, panelLayout, videoUrl, ctaLabel, ctaUrl, accentColor from hotspot documents
- No blockers

---
*Phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout*
*Completed: 2026-03-09*
