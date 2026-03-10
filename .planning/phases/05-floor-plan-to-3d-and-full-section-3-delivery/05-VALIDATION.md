---
phase: 5
slug: floor-plan-to-3d-and-full-section-3-delivery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No test runner configured (vitest/playwright not in package.json — confirmed in CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | N/A — manual verification only |
| **Full suite command** | N/A — full flow walkthrough (see Sampling Rate) |
| **Estimated runtime** | ~5 minutes (manual end-to-end walkthrough) |

---

## Sampling Rate

- **After every task commit:** Manual verification against the specific requirement addressed by that task
- **After every plan wave:** Full flow walkthrough — upload floor plan → extract → edit 2D → generate 3D → review → finalize → publish → open public link
- **Before `/gsd:verify-work`:** Full suite of manual checks must pass (all 5 FP3D requirements demonstrated)
- **Max feedback latency:** ~5 minutes per wave (manual flow)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | FP3D-01 | manual | Manual: check Convex schema deploys without errors | ❌ no test | ⬜ pending |
| 5-02-01 | 02 | 1 | FP3D-01 | manual | Manual: open /floor-plans/[id]/3d, verify 3D renders | ❌ no test | ⬜ pending |
| 5-02-02 | 02 | 1 | FP3D-02 | manual | Manual: adjust ceiling height slider, verify live update | ❌ no test | ⬜ pending |
| 5-03-01 | 03 | 2 | FP3D-03 | manual | Manual: switch all three nav modes in FloorPlanViewer | ❌ no test | ⬜ pending |
| 5-04-01 | 04 | 2 | FP3D-04 | manual | Manual: drag furniture, check cost tracker, undo | ❌ no test | ⬜ pending |
| 5-05-01 | 05 | 3 | FP3D-05 | manual | Manual: finalize → public link → open in incognito | ❌ no test | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- None — no test framework is planned for this project (CLAUDE.md confirms). All validation is manual.

*Existing infrastructure covers all phase requirements (manual verification only).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wall extrusion generates visible 3D geometry from floor plan coordinates | FP3D-01 | No test runner; Three.js rendering is visual | Open /floor-plans/[id]/3d, verify walls/floors render in 3D with correct proportions |
| Ceiling height slider updates geometry live (< 300ms debounce) | FP3D-02 | Visual/interactive behavior | Adjust slider, verify mesh updates within 300ms; adjust door width input, verify opening changes |
| All three nav modes work: dollhouse, free-roam, hotspot | FP3D-03 | Camera/navigation is visual | Switch modes via ModeSwitcher; verify dollhouse overhead view, click-to-move in free-roam, doorway hotspot transitions |
| Furniture drag, cost tracker, undo work in floor-plan-derived room | FP3D-04 | Interactive drag-and-drop behavior | Open furnish mode, drag item to floor plane, verify cost tracker updates, press Ctrl+Z and verify undo |
| Finalize creates Tour; public /tour/[slug] works without login | FP3D-05 | End-to-end auth + routing | Click Finalize, copy public link, open in incognito/private window, verify viewer loads with no login prompt |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5 minutes per wave (manual)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
