---
phase: 02-3d-capture-pipeline-and-splat-viewer
plan: 07
subsystem: ui
tags: [react-dropzone, file-validation, upload-ux, video-preview, capture-tips]

requires:
  - phase: 02-3d-capture-pipeline-and-splat-viewer
    provides: CaptureUpload state machine, CapturePhotoGrid, CaptureTips, reconstructionJobs.getRemainingQuota

provides:
  - Production-quality CaptureUpload with react-dropzone validation, video preview, photo grid, tips panel, and quota display

affects: [02-3d-capture-pipeline-and-splat-viewer]

tech-stack:
  added: []
  patterns: [react-dropzone dual-instance pattern for video vs photos, video thumbnail extraction via canvas]

key-files:
  created: []
  modified: [src/components/tour/CaptureUpload.tsx]

key-decisions:
  - "Dual dropzone instances (video + photos) switched via selectedType rather than single reconfigured instance"
  - "Video thumbnail extracted at 1s mark via hidden video element and canvas.toDataURL"
  - "Photo count enforced both in dropzone maxFiles and on Start Reconstruction click for double safety"

patterns-established:
  - "Dropzone rejection handler maps error codes to user-facing toast messages"
  - "Quota exhaustion disables type selection buttons and reconstruction button"

requirements-completed: [CAP-01, CAP-02]

duration: 4min
completed: 2026-03-09
---

# Phase 02 Plan 07: Upload Validation and UX Completeness Summary

**react-dropzone upload validation with MP4/MOV and JPG/PNG filtering, video thumbnail preview, photo grid with live counter, capture tips panel, and reconstruction quota display**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T20:21:02Z
- **Completed:** 2026-03-09T20:25:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced basic input[type=file] with react-dropzone for proper drag-and-drop with format/size validation
- Video uploads restricted to MP4/MOV under 500MB with thumbnail extraction and duration display
- Photo uploads enforce JPG/PNG format and 10-30 count range with live counter and grid preview
- Wired orphaned CapturePhotoGrid and CaptureTips components into CaptureUpload
- Added reconstruction quota badge from getRemainingQuota query with exhaustion messaging

## Task Commits

Each task was committed atomically:

1. **Task 1: Add validation, react-dropzone, video preview, and wire orphaned components** - `bd376fc` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/components/tour/CaptureUpload.tsx` - Full rewrite of State 1 upload UI with react-dropzone, validation, video preview, photo grid, tips, and quota display

## Decisions Made
- Dual dropzone instances (video + photos) switched via selectedType rather than a single reconfigured instance — avoids stale config when switching types
- Video thumbnail extracted at 1s mark via hidden video element and canvas.toDataURL — works without server-side processing
- Photo count enforced both in dropzone maxFiles and on Start Reconstruction click — double safety net for edge cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript --noEmit check shows project-wide JSX flag and module resolution errors (pre-existing, not related to this change) — project uses `typescript.ignoreBuildErrors: true` in next.config.ts

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CaptureUpload.tsx is now production-quality with full validation and UX completeness
- All orphaned components (CapturePhotoGrid, CaptureTips) are wired in
- Ready for end-to-end testing with actual file uploads

---
*Phase: 02-3d-capture-pipeline-and-splat-viewer*
*Completed: 2026-03-09*
