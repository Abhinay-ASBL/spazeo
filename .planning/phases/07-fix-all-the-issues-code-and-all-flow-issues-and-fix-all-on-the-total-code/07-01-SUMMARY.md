---
phase: 07-fix-all-the-issues-code-and-all-flow-issues-and-fix-all-on-the-total-code
plan: 01
subsystem: viewer/hotspot
tags: [hotspot, navigation, marker, info-panel, uat-fix]
dependency_graph:
  requires: []
  provides: [HotspotMarker-markerStyle, HotspotInfoPanel-navigation-type]
  affects: [src/components/viewer/HotspotMarker.tsx, src/components/viewer/HotspotInfoPanel.tsx]
tech_stack:
  added: []
  patterns: [markerStyle variant branching, effectivePanelLayout guard, ICON_REGISTRY dynamic lookup]
key_files:
  created: []
  modified:
    - src/components/viewer/HotspotMarker.tsx
    - src/components/viewer/HotspotInfoPanel.tsx
decisions:
  - "[07-01]: Navigation hotspot icon falls back to ChevronRight (not Navigation icon) for backward compatibility with existing ring markers"
  - "[07-01]: dot style uses 2.4s pulse (slower than ring 1.8s) for visual differentiation"
  - "[07-01]: effectivePanelLayout derived variable guards navigation type from video layout without mutating hotspot data"
  - "[07-01]: Go-to button uses &rarr; HTML entity instead of arrow character for React JSX compatibility"
metrics:
  duration: 3m
  completed_date: "2026-03-16"
  tasks: 2
  files_modified: 2
---

# Phase 07 Plan 01: Navigation Hotspot Marker and Info Panel — Summary

**One-liner:** Three markerStyle visual variants (ring/arrow/dot) for navigation hotspots using ICON_REGISTRY + accentColor, plus HotspotInfoPanel navigation type support with teal Go-to button and video layout guard.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Extend HotspotMarker navigation branch — icon, accentColor, markerStyle variants | 7b4b767 | HotspotMarker.tsx |
| 2 | Extend HotspotInfoPanel — navigation type, onNavigate prop, effectivePanelLayout guard | 9e2350e | HotspotInfoPanel.tsx |

## What Was Built

### HotspotMarker.tsx

- Added `markerStyle?: 'ring' | 'arrow' | 'dot' | 'label'` to the `HotspotData` interface
- Updated `IconComponent` derivation to fall back to `ChevronRight` for navigation type when no `iconName` is set, and use `ICON_REGISTRY[iconName]` with `ChevronRight` fallback when `iconName` is set
- Navigation branch now reads `markerStyle` (defaults to `'ring'`) and branches into three render paths:
  - **dot**: 20px circle, `markerColor` background, no icon, 2.4s slow pulse animation
  - **arrow**: bare `<IconComponent>` at 28px, `markerColor` foreground color, rotated by `yawDeg`, `drop-shadow` filter, no background
  - **ring** (default): existing two-ring pulse structure with `markerColor` replacing all previously hardcoded `#D4A017` values on inner button and both ring spans
- `yawDeg` computed unconditionally inside the navigation branch (needed for arrow rotation)
- Non-navigation branch (info/media/link) is completely unchanged

### HotspotInfoPanel.tsx

- Extended `HotspotData.type` to include `'navigation'`
- Added `targetSceneId?: string` to `HotspotData`
- Added `onNavigate?: (targetSceneId: string) => void` and `targetSceneTitle?: string` to `Props`
- Added `effectivePanelLayout` derived variable: overrides `'video'` to `'compact'` when `type === 'navigation'`
- Added teal Go-to button as last element in panel: renders only when `type === 'navigation'` AND `onNavigate` is provided AND `targetSceneId` is set
  - Button: `#2DD4BF` background, `#0A0908` text, 40px height, 8px radius, `Go to {targetSceneTitle ?? 'Next Room'} →`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

Both files pass `npx eslint src/components/viewer/HotspotMarker.tsx src/components/viewer/HotspotInfoPanel.tsx` with zero errors or warnings.

## Self-Check: PASSED

- FOUND: src/components/viewer/HotspotMarker.tsx
- FOUND: src/components/viewer/HotspotInfoPanel.tsx
- FOUND: .planning/phases/07-.../07-01-SUMMARY.md
- FOUND: commit 7b4b767
- FOUND: commit 9e2350e
