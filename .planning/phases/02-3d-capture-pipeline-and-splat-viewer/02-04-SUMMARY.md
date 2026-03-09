---
phase: 02-3d-capture-pipeline-and-splat-viewer
plan: 04
subsystem: ui
tags: [react, convex, gaussian-splatting, progress-indicator, 3d-preview]

requires:
  - phase: 02-02
    provides: GaussianSplatViewer component for 3D splat rendering
  - phase: 02-01
    provides: reconstructionJobs Convex module with CRUD, status tracking, and quota

provides:
  - ReconstructionProgress component with multi-stage stepper and cancel
  - SplatPreview component with 3D preview, metadata, and Accept/Re-capture
  - CaptureUpload orchestrator component with 4-state lifecycle
  - getSplatUrl query for resolving reconstruction output storage URLs

affects: [02-05, tour-editor]

tech-stack:
  added: []
  patterns:
    - "Convex reactive query for live progress monitoring (no polling)"
    - "Dynamic import for heavy 3D viewer component (SSR disabled)"
    - "4-state lifecycle pattern: upload -> progress -> preview -> active"

key-files:
  created:
    - src/components/tour/ReconstructionProgress.tsx
    - src/components/tour/SplatPreview.tsx
    - src/components/tour/CaptureUpload.tsx
  modified:
    - convex/reconstructionJobs.ts

key-decisions:
  - "CaptureUpload uses showUpload boolean override to allow re-capture even when a model is active"
  - "getSplatUrl added as separate query rather than embedding URL resolution in getByTourId to keep queries focused"
  - "Failure state rendered inside ReconstructionProgress rather than a separate component for state colocation"

patterns-established:
  - "4-state lifecycle: CaptureUpload renders different child components based on job status and tour state"
  - "MetadataCard pattern: reusable inline component for displaying labeled key-value data with icons"

requirements-completed: [CAP-03, CAP-04]

duration: 4min
completed: 2026-03-09
---

# Phase 02 Plan 04: Reconstruction Progress and Quality Review Summary

**Multi-stage progress indicator, failure handling, and 3D quality review with Accept/Re-capture lifecycle for reconstruction jobs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T13:06:38Z
- **Completed:** 2026-03-09T13:10:38Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ReconstructionProgress with 6-stage horizontal stepper, pulsing active state, progress bar, cancel confirmation, and failure state with Retry/Re-upload
- SplatPreview with dynamically imported GaussianSplatViewer, metadata grid (file size, gaussian count, processing time, input type), and Accept/Re-capture buttons
- CaptureUpload orchestrates full lifecycle: upload UI with video/photos selection, progress monitoring, quality review, and active model status card

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ReconstructionProgress component** - `eb0f60a` (feat)
2. **Task 2: Create SplatPreview and wire CaptureUpload** - `0855e41` (feat)

## Files Created/Modified
- `src/components/tour/ReconstructionProgress.tsx` - Multi-stage progress indicator with cancel and failure handling
- `src/components/tour/SplatPreview.tsx` - 3D preview with metadata cards and Accept/Re-capture
- `src/components/tour/CaptureUpload.tsx` - Orchestrator component with 4-state lifecycle
- `convex/reconstructionJobs.ts` - Added getSplatUrl query for resolving output storage URLs

## Decisions Made
- CaptureUpload uses a `showUpload` boolean state to override computed state, allowing re-capture even when a model is active or a completed job exists
- getSplatUrl added as a focused query rather than embedding URL resolution in getByTourId -- keeps queries single-purpose
- Failure state lives inside ReconstructionProgress rather than a separate component -- keeps error handling collocated with progress tracking
- Used tours.getById (existing query) in CaptureUpload to check splatStorageId/splatMetadata for active model detection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added getSplatUrl query to reconstructionJobs.ts**
- **Found during:** Task 2 (SplatPreview needs splat URL)
- **Issue:** No query existed to resolve outputStorageId to a URL for the GaussianSplatViewer
- **Fix:** Added getSplatUrl query using ctx.storage.getUrl()
- **Files modified:** convex/reconstructionJobs.ts
- **Verification:** Query compiles and returns URL or null
- **Committed in:** 0855e41 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for SplatPreview to render the 3D model. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full reconstruction lifecycle UI is complete: upload -> progress -> review -> accept
- Ready for Plan 05 (RunPod integration) which will trigger actual GPU jobs and send status updates through these components
- CaptureUpload can be imported into the tour editor page when ready

## Self-Check: PASSED

- All 4 files verified present on disk
- Commits eb0f60a and 0855e41 verified in git log

---
*Phase: 02-3d-capture-pipeline-and-splat-viewer*
*Completed: 2026-03-09*
