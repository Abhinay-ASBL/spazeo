---
phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout
plan: 02
subsystem: ui
tags: [zustand, video, utility, viewer, hotspot]

requires: []
provides:
  - parseVideoUrl utility centralizing YouTube/Vimeo/direct/unknown URL detection
  - useViewerStore Zustand store for cross-Canvas hotspot panel and video modal state
affects:
  - 06-03 (HotspotMarker uses setActiveHotspot and imports parseVideoUrl)
  - 06-04 (HotspotVideoModal imports parseVideoUrl and useViewerStore)
  - 06-05 (HotspotInfoPanel reads activeHotspotId from useViewerStore)
  - 06-06 (adaptive layout reads video modal state from useViewerStore)

tech-stack:
  added: []
  patterns:
    - Zustand v5 named import { create } for cross-Canvas state
    - Pure utility functions in src/lib for logic shared across multiple components
    - 'use client' directive on Zustand store files — required for client-only hooks

key-files:
  created:
    - src/lib/videoUtils.ts
    - src/hooks/useViewerStore.ts
  modified: []

key-decisions:
  - "parseVideoUrl returns type='unknown' for unrecognized URLs rather than throwing — callers can render fallback text safely"
  - "useViewerStore uses 'use client' directive because Zustand stores are consumed exclusively in client components; the directive prevents accidental server-side import"
  - "videoModalTitle typed as string | undefined (not null) to match optional parameter semantics — undefined signals absence, null would require explicit clearing"

patterns-established:
  - "parseVideoUrl pattern: centralize regex-based URL detection in src/lib rather than inlining in components"
  - "useViewerStore pattern: Zustand v5 create<Interface>((set) => ({})) with named export"

requirements-completed:
  - HS6-02

duration: 5min
completed: 2026-03-09
---

# Phase 06 Plan 02: Video URL Utility and Viewer Store Summary

**parseVideoUrl utility (src/lib/videoUtils.ts) and useViewerStore Zustand store (src/hooks/useViewerStore.ts) created as Wave 1 shared infrastructure for Plans 03-06**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-09T08:56:19Z
- **Completed:** 2026-03-09T09:01:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `parseVideoUrl` centralizing YouTube (youtu.be + youtube.com v=), Vimeo, direct video file, and unknown URL handling
- Created `useViewerStore` with `activeHotspotId`/`setActiveHotspot` for hotspot info panel state and `videoModalUrl`/`videoModalTitle`/`openVideoModal`/`closeVideoModal` for full-screen video modal
- Both files pass eslint with zero warnings — ready for import by Plans 03, 04, 05, and 06

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/lib/videoUtils.ts with parseVideoUrl utility** - `1ec53f3` (feat)
2. **Task 2: Create src/hooks/useViewerStore.ts Zustand store** - `522d6d4` (feat)

## Files Created/Modified

- `src/lib/videoUtils.ts` — Exports `VideoType`, `ParsedVideo`, and `parseVideoUrl`; handles YouTube, Vimeo, direct video (.mp4/.webm/.ogg), and unknown URL patterns
- `src/hooks/useViewerStore.ts` — Zustand v5 store exporting `useViewerStore` with hotspot panel state and video modal state

## Decisions Made

- `parseVideoUrl` returns `type='unknown'` for unrecognized URLs rather than throwing — allows callers to render fallback text without try/catch
- `useViewerStore` has `'use client'` directive to prevent accidental server-side import of the Zustand store
- `videoModalTitle` is `string | undefined` (not `string | null`) matching optional parameter semantics — `undefined` signals absence, avoids explicit null clearing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/lib/videoUtils.ts` is importable by HotspotMarker.tsx (Plan 03) and HotspotVideoModal.tsx (Plan 04) without modification
- `src/hooks/useViewerStore.ts` is importable by HotspotMarker.tsx (Plan 03), HotspotInfoPanel.tsx (Plan 05), and any adaptive layout component (Plan 06)
- No blockers for Wave 2 execution of Plans 03, 04, and 06 in parallel

## Self-Check: PASSED

- `src/lib/videoUtils.ts`: FOUND
- `src/hooks/useViewerStore.ts`: FOUND
- Commit `1ec53f3`: FOUND
- Commit `522d6d4`: FOUND

---
*Phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout*
*Completed: 2026-03-09*
