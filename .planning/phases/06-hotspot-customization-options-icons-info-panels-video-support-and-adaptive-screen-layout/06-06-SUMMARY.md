---
phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout
plan: "06"
subsystem: tour-editor
tags: [hotspot, icon-picker, panel-layout, cta, tour-editor, phase-6]
dependency_graph:
  requires:
    - "06-01: Convex schema with iconName, panelLayout, ctaLabel, ctaUrl fields"
    - "06-02: useViewerStore and video URL utilities"
  provides:
    - "Tour editor UI for setting iconName, panelLayout, ctaLabel, ctaUrl per hotspot"
  affects:
    - "convex/hotspots.ts: createHotspot mutation now receives 4 new optional fields"
tech_stack:
  added:
    - "13 new Lucide icon imports: Home, Bed, Bath, Car, Wifi, Camera, Star, DollarSign, Ruler, Trees, Sun, Building2, Key"
  patterns:
    - "EDITOR_ICON_OPTIONS as const array for type-safe icon grid"
    - "Conditional JSX blocks keyed on hotspotType for contextual field display"
    - "useCallback deps array expanded for all new state vars"
key_files:
  modified:
    - path: "src/app/(dashboard)/tours/[id]/edit/page.tsx"
      change: "Extended hotspot creation form with icon picker grid, panel layout dropdown, and CTA label/URL inputs"
decisions:
  - "EDITOR_ICON_OPTIONS defined as module-level constant (not inside component) — avoids re-creation on each render"
  - "None button in icon grid uses empty string sentinel — matches hotspotIconName initial state; no separate boolean needed"
  - "CTA URL input only renders when CTA Label is non-empty — progressive disclosure keeps form compact"
  - "hotspotVideoUrl state omitted per plan scope — existing hotspotContent covers media URL; dedicated videoUrl field deferred"
metrics:
  duration: "4m"
  completed_date: "2026-03-09"
  tasks_completed: 2
  files_modified: 1
---

# Phase 06 Plan 06: Tour Editor Hotspot Form — Phase 6 Fields Summary

Tour editor hotspot creation form extended with icon picker grid (17 Lucide icons + None), panel layout selector (Compact/Rich/Video), and CTA Label/URL inputs wired to the createHotspot Convex mutation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add state variables, EDITOR_ICON_OPTIONS constant, createHotspot wiring | 99685eb | src/app/(dashboard)/tours/[id]/edit/page.tsx |
| 2 | Add icon picker, panel layout selector, and CTA fields to hotspot form JSX | 2097ae8 | src/app/(dashboard)/tours/[id]/edit/page.tsx |

## What Was Built

### Task 1: State and Logic Layer
- Added 13 new Lucide icon imports alongside existing ones in the import block
- Added `EDITOR_ICON_OPTIONS` constant after `HOTSPOT_TYPES` — 17 entries covering navigation, info, play, link, home, bedroom, bathroom, parking, WiFi, photo, feature, price, area, garden, balcony, building, and key
- Added 4 new `useState` variables: `hotspotIconName` (string, default ''), `hotspotPanelLayout` ('compact'|'rich'|'video', default 'compact'), `hotspotCtaLabel` (string), `hotspotCtaUrl` (string)
- Extended `createHotspot` call with `iconName`, `panelLayout`, `ctaLabel`, `ctaUrl`
- Added reset logic for all 4 new fields in the post-submit block
- Updated `useCallback` deps array

### Task 2: Form UI
- Icon picker grid: 34x34px buttons with gold highlight border and background for selected state; "—" None button resets to type-default icon; grid uses flexWrap for responsive layout
- Panel Layout dropdown: `<select>` with 3 options — Compact, Rich (image + CTA), Video modal — visible for non-navigation types
- CTA Button Label input: text input with 40-char limit, visible for info and link types
- CTA Button URL input: url input, conditionally shown only when CTA Label has non-empty trimmed value
- All new fields placed immediately before the "Add Hotspot" footer button

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. `npm run lint` passes — only pre-existing warnings (Suspense, Layers, ChevronDown unused imports)
2. `EDITOR_ICON_OPTIONS` has exactly 17 entries confirmed via grep count
3. Panel layout dropdown has exactly: Compact, Rich (image + CTA), Video modal
4. CTA Label shows for info and link types; CTA URL renders only when CTA Label non-empty
5. `createHotspot` call includes `iconName`, `panelLayout`, `ctaLabel`, `ctaUrl`
6. All 4 new fields reset in post-submit block (`setHotspotIconName('')`, `setHotspotPanelLayout('compact')`, `setHotspotCtaLabel('')`, `setHotspotCtaUrl('')`)
7. Navigation type: icon picker and panel layout do NOT show (gated by `hotspotType !== 'navigation'`)

## Self-Check: PASSED

Files exist:
- FOUND: src/app/(dashboard)/tours/[id]/edit/page.tsx

Commits exist:
- FOUND: 99685eb feat(06-06): add EDITOR_ICON_OPTIONS, new state vars, and createHotspot wiring
- FOUND: 2097ae8 feat(06-06): add icon picker, panel layout selector, and CTA fields to hotspot form JSX
