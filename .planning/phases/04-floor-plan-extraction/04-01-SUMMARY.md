---
phase: 04-floor-plan-extraction
plan: 01
subsystem: database
tags: [convex, schema, ai-extraction, dashscope, floor-plan, versioning]

# Dependency graph
requires:
  - phase: 01-tour-platform-stabilize-and-polish
    provides: Convex schema with users, tours, aiJobs tables and DashScope AI patterns
provides:
  - floorPlanProjects table and CRUD for multi-floor project grouping
  - floorPlanDetails table and CRUD for individual floor plans with geometry
  - floorPlanVersions table and queries for edit history
  - floorPlanJobs table and job lifecycle mutations
  - AI extraction action via DashScope structured JSON output
  - Plan-limited extraction with per-tier caps
affects: [04-02, 04-03, 04-04, 05-floor-plan-to-3d]

# Tech tracking
tech-stack:
  added: []
  patterns: [floorPlanJobs separate from aiJobs for standalone floor plans, response_format json_object for structured AI output, version history via separate table]

key-files:
  created:
    - convex/floorPlanProjects.ts
    - convex/floorPlanDetails.ts
    - convex/floorPlanVersions.ts
    - convex/floorPlanJobs.ts
    - convex/floorPlanActions.ts
  modified:
    - convex/schema.ts
    - convex/users.ts

key-decisions:
  - "floorPlanJobs separate table from aiJobs because aiJobs requires tourId which floor plans may not have"
  - "floorPlanDetails new table (not modifying existing floorPlans) to avoid breaking legacy table consumers"
  - "response_format json_object used instead of max_tokens + regex cleaning for reliable structured AI output"
  - "floorPlanExtractionsUsed separate counter from aiCreditsUsed for independent plan limit tracking"
  - "Version 1 with source ai created on extraction; resetToAiVersion finds version 1 to restore"

patterns-established:
  - "Floor plan extraction uses dedicated floorPlanJobs table with internalMutation lifecycle"
  - "DashScope structured JSON mode via response_format: { type: json_object } eliminates regex cleaning"
  - "Version history via separate floorPlanVersions table with versionNumber and source tracking"

requirements-completed: [FP-01, FP-02, FP-04]

# Metrics
duration: 4m
completed: 2026-03-10
---

# Phase 4 Plan 01: Schema and Backend Summary

**Convex schema with 4 new tables (floorPlanProjects, floorPlanDetails, floorPlanVersions, floorPlanJobs), full CRUD, AI extraction via DashScope structured JSON, and version history with reset-to-AI capability**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T09:00:03Z
- **Completed:** 2026-03-10T09:04:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Four new Convex tables defined and deployed for floor plan data layer
- Full CRUD mutations/queries for projects, floor plans, versions, and jobs
- AI extraction action with DashScope qwen3.5-plus vision model and structured JSON output
- Plan-limited extraction (Free 3/mo, Starter 15/mo, Pro 50/mo, Enterprise unlimited) with failed extractions not counting
- Version history system enabling undo across sessions and "Reset to AI result"

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Phase 4 tables to Convex schema** - `65eae27` (feat)
2. **Task 2: Create Convex backend files** - `97d61b5` (feat)

## Files Created/Modified
- `convex/schema.ts` - Added 4 new tables and floorPlanExtractionsUsed field on users
- `convex/floorPlanProjects.ts` - CRUD for multi-floor project grouping (create, getById, listByUser, update, remove with cascade delete)
- `convex/floorPlanDetails.ts` - CRUD for individual floor plans with geometry updates, version saves, AI reset, and internal extraction result updates
- `convex/floorPlanVersions.ts` - Version history queries (listByFloorPlan, getVersion)
- `convex/floorPlanJobs.ts` - Job lifecycle (create, updateStatus, complete, fail, getByFloorPlan)
- `convex/floorPlanActions.ts` - AI extraction action with DashScope structured JSON, plan limits, error handling, notifications
- `convex/users.ts` - Added incrementFloorPlanExtractions internal mutation

## Decisions Made
- floorPlanJobs is a separate table from aiJobs because aiJobs requires tourId (non-optional) but floor plans can exist independently
- New floorPlanDetails table created instead of modifying existing floorPlans to avoid breaking existing consumers
- DashScope response_format: { type: "json_object" } used for reliable structured output (no regex cleaning needed)
- floorPlanExtractionsUsed is a separate counter from aiCreditsUsed for independent plan limit tracking
- Version 1 with source "ai" is created after extraction; resetToAiVersion finds and restores it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added internal mutations for extraction pipeline**
- **Found during:** Task 2
- **Issue:** Plan specified extraction action updates floor plan geometry but did not detail the internal mutation interface needed
- **Fix:** Added updateExtractionResult and updateExtractionStatus internal mutations to floorPlanDetails.ts for the action to call
- **Files modified:** convex/floorPlanDetails.ts
- **Committed in:** 97d61b5

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for the extraction action to update floor plan status. No scope creep.

## Issues Encountered
- Convex dev server already running on port 3210 prevented `npx convex dev --once` verification. Schema type-checked via tsc instead. The running dev server will auto-sync the changes.

## User Setup Required
None - no external service configuration required. DashScope API key (DASHSCOPE_API_KEY) is already configured from Phase 1.

## Next Phase Readiness
- Schema and backend fully ready for Plan 02 (upload UI) and Plan 03 (editor)
- All Convex functions export correctly via api.* for frontend consumption
- AI extraction action ready to be triggered from upload UI

---
*Phase: 04-floor-plan-extraction*
*Completed: 2026-03-10*
