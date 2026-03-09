---
phase: 01-tour-platform-stabilize-and-polish
plan: 06
subsystem: viewer
tags: [hotspot, navigation, media, video, panorama]
dependency_graph:
  requires: []
  provides: [directional-arrow-bearing, video-popup-renderer]
  affects: [src/components/viewer/HotspotMarker.tsx]
tech_stack:
  added: []
  patterns: [atan2-bearing, iife-jsx-branch, native-video-iframe-embed]
key_files:
  created: []
  modified:
    - src/components/viewer/HotspotMarker.tsx
decisions:
  - "atan2(x, -z) formula used for equirectangular panorama bearing — viewer sits at origin looking toward -z"
  - "IIFE pattern used for conditional JSX branching inside media content section — readable without extracting to named function"
  - "YouTube/Vimeo embed URLs are built by extracting video ID from raw URL — handles both standard and shortened formats"
metrics:
  duration: "5m"
  completed: "2026-03-09"
  tasks: 2
  files: 1
---

# Phase 1 Plan 6: HotspotMarker Gap Closure (TOUR-03) Summary

**One-liner:** Bearing-based ChevronRight rotation via atan2(x,-z) + YouTube/Vimeo iframe and native video element renderer in media hotspot popup.

## What Was Built

Two TOUR-03 gaps in `HotspotMarker.tsx` were closed:

1. **Directional arrow bearing** — The navigation hotspot `ChevronRight` icon was static. Added `yawDeg = Math.round((Math.atan2(hotspot.position.x, -hotspot.position.z) * 180) / Math.PI)` and applied it as `style={{ transform: \`rotate(${yawDeg}deg)\` }}` on the icon. Each hotspot placed at a different angle in the panorama sphere now shows its chevron pointing in the corresponding compass direction.

2. **Video rendering in media popup** — The media hotspot popup previously rendered `hotspot.content` as a plain `<p>` text element regardless of content type. Replaced with an IIFE branch that:
   - Detects YouTube (`youtube.com`, `youtu.be`) or Vimeo (`vimeo.com`) URLs and embeds them via an `<iframe>` with proper embed URL extraction
   - Detects direct video files (`.mp4`, `.webm`, `.ogg`) and renders them in a native `<video controls>` element
   - Falls through to plain text for unrecognized content strings
   - Info-type hotspots continue to render as plain text (unchanged)

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Directional arrow bearing calculation | 9979409 |
| 2 | Video rendering in media hotspot popup | 9979409 |

## Files Modified

| File | Change |
|------|--------|
| `src/components/viewer/HotspotMarker.tsx` | Added yawDeg bearing + video/iframe renderer |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `yawDeg` variable and `Math.atan2` present in navigation branch (line 45)
- `ChevronRight` has `style={{ transform: \`rotate(${yawDeg}deg)\` }}` (line 131)
- `<video` element present (line 295)
- `<iframe` element present (line 283)
- `/youtube\.com|youtu\.be/` regex present (line 270)
- Lint run: no new errors introduced (pre-existing errors in PanoramaViewer.tsx are out of scope)

## Self-Check: PASSED

- File `src/components/viewer/HotspotMarker.tsx` exists and contains all required patterns
- Commit `9979409` exists in git log
