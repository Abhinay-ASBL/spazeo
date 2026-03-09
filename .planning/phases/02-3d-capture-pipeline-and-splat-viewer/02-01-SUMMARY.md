---
phase: 02-3d-capture-pipeline-and-splat-viewer
plan: 01
subsystem: database
tags: [convex, schema, reconstruction, gaussian-splatting, job-queue]

requires:
  - phase: 01-tour-platform-stabilize-and-polish
    provides: tours table, users table, notifications table, auth patterns
provides:
  - reconstructionJobs table with 8-stage status lifecycle
  - Job CRUD mutations (create, updateStatus, complete, fail, cancel, acceptResult)
  - Job queries (getByTourId, getActiveByTourId, getByUserId, getRemainingQuota)
  - tours.linkSplat internal mutation for attaching splat output to tours
  - tours.splatStorageId and splatMetadata optional fields
  - Plan-based monthly reconstruction limits (Free 1, Starter 5, Pro/Biz 20, Enterprise unlimited)
affects: [02-02, 02-03, 02-04, 02-05, 02-06]

tech-stack:
  added: []
  patterns: [reconstruction-job-lifecycle, monthly-plan-limits, runpodJobId-lookup]

key-files:
  created: [convex/reconstructionJobs.ts]
  modified: [convex/schema.ts, convex/tours.ts]

key-decisions:
  - "getRemainingQuota returns -1 for limit and remaining when plan is unlimited (Enterprise) rather than Infinity to avoid JSON serialization issues"
  - "complete and fail mutations find jobs by runpodJobId via full-table scan and filter rather than index — runpodJobId is optional and set after creation, so indexing it would require a compound index with nullable field"
  - "notifications type union extended with 'system' literal to support reconstruction completion notifications"
  - "countMonthlyJobs filters by _creationTime >= start-of-month rather than a dedicated createdAt field — uses Convex built-in creation timestamp"

patterns-established:
  - "Reconstruction job lifecycle: uploading -> queued -> extracting_frames -> reconstructing -> compressing -> completed/failed/cancelled"
  - "Monthly quota check pattern: count non-failed/non-cancelled jobs in current calendar month per userId"
  - "acceptResult pattern: user reviews completed job, then explicitly accepts to link output to tour via linkSplat"

requirements-completed: [CAP-03, CAP-04]

duration: 2min
completed: 2026-03-09
---

# Phase 2 Plan 01: Reconstruction Job Schema and CRUD Summary

**Convex reconstructionJobs table with 8-stage lifecycle, plan-limited create mutation, and tours.linkSplat for attaching Gaussian Splat output**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T12:40:30Z
- **Completed:** 2026-03-09T12:42:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- reconstructionJobs table defined with all 8 status stages, 3 indexes, input/output metadata, and RunPod job reference
- Complete CRUD lifecycle: create (plan-limited), updateStatus, complete (with notification), fail, cancel, acceptResult (links splat to tour)
- Query functions for tour-level, user-level, active-job, and monthly quota views
- tours table extended with splatStorageId and splatMetadata optional fields for backward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add reconstructionJobs table and tours splat fields to Convex schema** - `c946d7b` (feat)
2. **Task 2: Create reconstructionJobs.ts CRUD functions and tours.linkSplat mutation** - `45a514c` (feat)

## Files Created/Modified
- `convex/schema.ts` - Added reconstructionJobs table definition, tours splatStorageId/splatMetadata fields, notifications 'system' type
- `convex/reconstructionJobs.ts` - Full job lifecycle CRUD: create, updateStatus, complete, fail, cancel, acceptResult + queries
- `convex/tours.ts` - Added linkSplat internal mutation for attaching reconstruction output to tours

## Decisions Made
- getRemainingQuota returns -1 for unlimited plans to avoid JSON Infinity serialization issues
- complete/fail find jobs by runpodJobId via collect+filter since runpodJobId is optional and set post-creation
- Extended notifications type union with 'system' literal for reconstruction completion notifications
- Monthly job counting uses _creationTime (Convex built-in) rather than adding a separate field

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added 'system' to notifications type union**
- **Found during:** Task 2 (creating complete mutation)
- **Issue:** Plan specified creating notifications with type 'system', but the notifications table only had lead_captured, tour_milestone, ai_completed, tour_error, weekly_summary
- **Fix:** Added v.literal('system') to the notifications type union in schema.ts
- **Files modified:** convex/schema.ts
- **Verification:** Schema compiles without type errors
- **Committed in:** c946d7b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for the complete mutation to create notifications. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema and CRUD functions are ready for downstream plans
- Plan 02-02 (spark.js compatibility spike) can begin independently
- Plan 02-03 (capture upload UI) can use reconstructionJobs.create mutation
- Plan 02-05 (RunPod integration) can use updateStatus, complete, fail internal mutations

---
*Phase: 02-3d-capture-pipeline-and-splat-viewer*
*Completed: 2026-03-09*
