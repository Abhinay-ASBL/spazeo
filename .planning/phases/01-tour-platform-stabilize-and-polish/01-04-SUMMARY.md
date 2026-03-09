---
phase: 01-tour-platform-stabilize-and-polish
plan: 04
subsystem: viewer-hotspots
tags: [hotspots, viewer, editor, ui, animations]
dependency_graph:
  requires: []
  provides: [HotspotMarker-gold-pulse-ring, HotspotMarker-popup-card, HotspotMarker-visibility, editor-hotspot-config-panel]
  affects: [src/components/viewer/HotspotMarker.tsx, src/app/(dashboard)/tours/[id]/edit/page.tsx, src/app/globals.css, convex/schema.ts, convex/hotspots.ts]
tech_stack:
  added: []
  patterns: [inline-style-animation, popup-card-state, visibility-gate]
key_files:
  created: []
  modified:
    - src/components/viewer/HotspotMarker.tsx
    - src/app/globals.css
    - src/app/(dashboard)/tours/[id]/edit/page.tsx
    - convex/schema.ts
    - convex/hotspots.ts
decisions:
  - Navigation hotspot uses Gold (#D4A017) pulse ring with two staggered spans (animation-delay 0.6s) for depth effect — no Tailwind animate-ping since that is Teal-colored from prior design
  - Info/media/link popup card uses inline styles (not Tailwind classes) for portability inside @react-three/drei Html component
  - Visibility toggle added to both new hotspot creation panel and existing hotspot list items in right panel
  - visible field added as optional boolean in Convex schema to maintain backward compatibility with existing hotspots (undefined = visible)
metrics:
  duration: 7m
  completed: "2026-03-09"
  tasks: 2
  files_changed: 5
---

# Phase 1 Plan 4: Hotspot Visuals Upgrade and Editor Config Panel Summary

Gold pulse ring navigation hotspots + rich info/link/media popup cards in the viewer, plus visibility toggle and title/content fields in the tour editor config panel.

## What Was Built

### Task 1: Upgrade HotspotMarker with Gold Pulse Ring and Info Popup Card

**HotspotMarker.tsx** — complete rewrite with two behavior paths:

**Navigation type:**
- Two staggered expanding rings using `@keyframes hotspot-pulse` (1.8s, delay 0.6s for depth effect)
- Inner 36px Gold (#D4A017) circle button with ChevronRight (14px) icon
- Hover: scale 1.1 at 150ms transition
- Tooltip label on hover above the marker
- `isSelected` prop applies teal glow box-shadow (`0 0 0 2px #2DD4BF`)

**Info / Media / Link types:**
- Existing ping animation ring kept (color-coded per type)
- `isPopupOpen` state toggles a 240px popup card anchored below the marker
- Popup card: title, description, content text, image (max 120px height), external link
- Close button with X icon; click-outside not required (close button provided)
- Popup works correctly with `@react-three/drei` Html component

**Visibility gate:**
- `hotspot.visible === false` returns `null` — hotspot is not rendered
- `undefined` defaults to visible (backward compatible with existing data)

**globals.css:**
- Added `@keyframes hotspot-pulse` (scale 1→2.2, opacity 0.8→0)
- Added `@keyframes hotspot-pulse-inner` (scale 1→0.95→1 subtle inner breathe)

**Convex backend (schema.ts + hotspots.ts):**
- Added `visible: v.optional(v.boolean())` to hotspots table schema
- Added `visible` arg to `create` and `update` mutations

### Task 2: Complete Hotspot Config Panel in Tour Editor

**New hotspot creation panel (pendingPosition dialog):**
- Added **Title** field (text input) before the Label field
- Added **Visibility toggle** (40×22px pill switch, Gold when visible) after the Label field
- `hotspotVisible` state initialized to `true`, reset to `true` after each creation
- `visible: hotspotVisible` passed to `createHotspot` mutation call
- useCallback deps array updated to include all required state variables

**Existing hotspot list in right panel:**
- Added 28×16px mini visibility toggle to each hotspot row
- Toggle calls `updateHotspot({ hotspotId, visible: !current })` inline
- Displays Gold when visible, dark `#2E2A24` when hidden

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added `visible` field to Convex schema and mutations**
- **Found during:** Task 1 implementation
- **Issue:** HotspotMarker used `hotspot.visible === false` to skip rendering, but `visible` was not in the Convex schema or mutations — it could not be persisted
- **Fix:** Added `visible: v.optional(v.boolean())` to `hotspots` table in `convex/schema.ts` and added `visible` arg to both `create` and `update` mutations in `convex/hotspots.ts`
- **Files modified:** `convex/schema.ts`, `convex/hotspots.ts`
- **Commit:** 1a26448

**2. [Rule 1 - Bug] Fixed missing deps in handleConfirmHotspot useCallback array**
- **Found during:** Task 2 implementation
- **Issue:** `hotspotTitle`, `hotspotDescription`, `hotspotImageFile`, `generateUploadUrl`, and `hotspotVisible` were missing from the useCallback dependency array, causing stale closure bugs when these values changed
- **Fix:** Added all used variables to the deps array
- **Files modified:** `src/app/(dashboard)/tours/[id]/edit/page.tsx`
- **Commit:** included in task 2 commit

## Pre-existing Issues (Out of Scope)

- `src/app/(dashboard)/tours/[id]/edit/page.tsx` lines 873-874: two `@typescript-eslint/no-explicit-any` errors on `hotspots as any[]` and `onHotspotClick as any` — these pre-date this plan and are tracked for future cleanup

## Self-Check: PASSED

Files confirmed present:
- src/components/viewer/HotspotMarker.tsx — FOUND
- src/app/globals.css — FOUND (contains hotspot-pulse)
- convex/schema.ts — FOUND (contains visible)
- convex/hotspots.ts — FOUND (contains visible arg)

Commits confirmed:
- 1a26448: feat(01-04): upgrade HotspotMarker with Gold pulse ring and info popup card
- d46140d: feat(01-05): add embed code display (includes hotspot editor config panel changes from this session)
