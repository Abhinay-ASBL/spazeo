---
phase: 3
slug: furniture-catalog-placement-and-room-sharing
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler + Convex schema validation (no vitest — 3D/WebGL domain) |
| **Config file** | tsconfig.json (existing) |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npx convex dev --once` |
| **Estimated runtime** | ~15 seconds |

**Rationale:** This phase is entirely 3D/WebGL (R3F Canvas, Three.js TransformControls, Gaussian Splat rendering, floor plane raycasting). These behaviors cannot be meaningfully unit tested — they require visual/interactive verification. The automated verification layer uses TypeScript type checking (`npx tsc --noEmit`) to catch interface mismatches and Convex schema validation (`npx convex dev --once`) to verify backend functions compile and deploy. All behavioral verification is manual via the Plan 06 checkpoint.

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit` on modified files
- **After every plan wave:** Run `npx tsc --noEmit && npx convex dev --once`
- **Before `/gsd:verify-work`:** Full suite must pass + Plan 06 checkpoint approved
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 03-01-01 | 01 | 1 | FURN-01 | schema | `npx convex dev --once` | pending |
| 03-01-02 | 01 | 1 | FURN-02,03 | type-check | `npx tsc --noEmit src/hooks/useFurnitureStore.ts` | pending |
| 03-02-01 | 02 | 2 | FURN-03 | type-check | `npx tsc --noEmit src/components/furniture/CatalogSidebar.tsx src/components/furniture/CatalogItemCard.tsx` | pending |
| 03-02-02 | 02 | 2 | FURN-07 | type-check | `npx tsc --noEmit src/components/furniture/CostTracker.tsx src/components/furniture/CatalogBottomSheet.tsx` | pending |
| 03-03-01 | 03 | 2 | FURN-04,05 | type-check | `npx tsc --noEmit src/components/viewer/FurnitureGhost.tsx src/components/viewer/FurniturePiece.tsx` | pending |
| 03-03-02 | 03 | 2 | FURN-06,08 | type-check | `npx tsc --noEmit src/components/viewer/FurnitureLayer.tsx` | pending |
| 03-04-01 | 04 | 3 | FURN-04,05 | type-check | `npx tsc --noEmit src/components/viewer/ModeSwitcher.tsx src/components/viewer/FurnitureToolbar.tsx src/components/viewer/FurnitureCameraController.tsx` | pending |
| 03-04-02 | 04 | 3 | FURN-08 | type-check | `npx tsc --noEmit src/components/viewer/GaussianSplatViewer.tsx src/components/viewer/NavigationModes.tsx` | pending |
| 03-05-01 | 05 | 4 | SHARE-01 | type-check | `npx tsc --noEmit src/components/viewer/GaussianSplatViewer.tsx` | pending |
| 03-05-02 | 05 | 4 | SHARE-02,03 | type-check | `npx tsc --noEmit src/app/tour/\\[slug\\]/furnished/\\[id\\]/page.tsx src/components/furnished/FurnishedRoomViewer.tsx src/components/furnished/CostSummaryPanel.tsx` | pending |
| 03-06-01 | 06 | 5 | FURN-01,02 | schema | `npx convex dev --once` | pending |
| 03-06-02 | 06 | 5 | ALL | manual | Plan 06 checkpoint (human-verify) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- TypeScript compiler (`npx tsc --noEmit`) — already configured via tsconfig.json
- Convex CLI (`npx convex dev --once`) — already configured via convex.json
- No additional test framework installation needed for this 3D/WebGL-focused phase

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ghost preview follows cursor over 3D floor | FURN-04 | Requires WebGL Canvas + raycasting interaction | Click catalog item, verify ghost tracks mouse on floor plane |
| Click-to-place snaps to y=0 | FURN-05 | Requires visual 3D scene confirmation | Click floor while ghost active, verify solid item at position |
| Transform controls (rotate/scale) | FURN-06 | Requires mouse interaction with Three.js gizmos | Select placed item, rotate/scale with handles |
| Cost tracker click centers camera | FURN-07 | Requires 3D camera animation verification | Click item in cost list, verify camera smoothly pans to item |
| Read-only shared room view | SHARE-02,03 | Requires visual + link-based E2E | Open share link in incognito, verify no edit controls |
| Mobile bottom sheet catalog | FURN-03 | Requires touch/responsive layout verification | Test on mobile viewport, verify swipe gestures |

All manual verifications are consolidated in the Plan 06 end-to-end checkpoint.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (tsc --noEmit or convex dev --once)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covered — existing infrastructure sufficient (tsc + convex CLI)
- [x] No watch-mode flags
- [x] Feedback latency < 30s (tsc ~5s, convex dev --once ~10s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
