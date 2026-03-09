---
phase: 02-3d-capture-pipeline-and-splat-viewer
plan: 03
subsystem: ui
tags: [react, upload, 3d-capture, reconstruction, convex, react-dropzone]

requires:
  - phase: 02-3d-capture-pipeline-and-splat-viewer
    provides: reconstructionJobs table, create mutation, getRemainingQuota query
provides:
  - CaptureUpload component with video/photos upload, validation, and Start Reconstruction trigger
  - CapturePhotoGrid component for multi-photo grid preview
  - CaptureTips component with collapsible capture guidance
  - 3D Capture tab integrated into tour editor right panel
affects: [02-05, 02-06]

tech-stack:
  added: []
  patterns: [capture-upload-state-machine, video-thumbnail-extraction, three-tab-editor-panel]

key-files:
  created: [src/components/tour/CaptureUpload.tsx, src/components/tour/CapturePhotoGrid.tsx, src/components/tour/CaptureTips.tsx]
  modified: [src/app/(dashboard)/tours/[id]/edit/page.tsx]

key-decisions:
  - "CaptureUpload uses state machine pattern: upload UI -> active job progress -> completed preview -> accepted model status card"
  - "3D Capture added as third tab in editor right panel rather than separate section — consistent with existing Properties/Settings tab pattern"
  - "Right panel condition expanded to show when capture tab active even without selected scene — 3D Capture is tour-level not scene-level"

patterns-established:
  - "Three-tab editor right panel: Properties (scene-level), Settings (tour-level), 3D Capture (tour-level)"
  - "CaptureUpload delegates to ReconstructionProgress and SplatPreview for active/completed job states"

requirements-completed: [CAP-01, CAP-02]

duration: 6min
completed: 2026-03-09
---

# Phase 2 Plan 03: 3D Capture Upload UI Summary

**CaptureUpload component with video/photos upload tabs, validation, tips panel, and Start Reconstruction button integrated as 3D Capture tab in tour editor**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-09T13:06:58Z
- **Completed:** 2026-03-09T13:12:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- CaptureUpload component with state-driven UI: upload -> progress -> preview -> accepted model status
- CapturePhotoGrid for responsive multi-photo preview with remove overlay
- CaptureTips with collapsible guidance panel for video and photo capture modes
- 3D Capture tab added to tour editor right panel (desktop and mobile)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CaptureUpload, CapturePhotoGrid, and CaptureTips components** - `18fcba0` (feat)
2. **Task 2: Integrate CaptureUpload into the tour editor page** - `4a6d01b` (feat)

## Files Created/Modified
- `src/components/tour/CaptureUpload.tsx` - Main 3D capture upload component with video/photos selection, file upload, and reconstruction job creation
- `src/components/tour/CapturePhotoGrid.tsx` - Responsive photo grid with thumbnails and remove buttons
- `src/components/tour/CaptureTips.tsx` - Collapsible tips panel with video and photo capture guidance
- `src/app/(dashboard)/tours/[id]/edit/page.tsx` - Added 3D Capture tab to right panel tab navigation and content area

## Decisions Made
- CaptureUpload uses state machine pattern with 4 states: upload UI, active job progress, completed preview, accepted model status card
- 3D Capture added as third tab in editor right panel for consistency with existing Properties/Settings tab pattern
- Right panel shows when capture tab is active even without a selected scene since 3D Capture is tour-level

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CaptureUpload.tsx was externally modified during execution**
- **Found during:** Task 2 (editor integration)
- **Issue:** CaptureUpload.tsx was modified by an external process between Task 1 commit and Task 2 — the new version uses ReconstructionProgress and SplatPreview components with a state machine approach
- **Fix:** Adopted the modified version as it provides a more complete implementation with proper state management for active jobs and completed models
- **Files modified:** src/components/tour/CaptureUpload.tsx
- **Verification:** Build passes successfully
- **Committed in:** 4a6d01b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** External modification provided a more complete CaptureUpload implementation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Upload UI is ready and wired to reconstructionJobs.create mutation
- Plan 02-05 (RunPod pipeline) can implement the actual reconstruction processing
- Plan 02-06 can add progress monitoring UI

---
*Phase: 02-3d-capture-pipeline-and-splat-viewer*
*Completed: 2026-03-09*
