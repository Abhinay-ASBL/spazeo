---
phase: 4
slug: floor-plan-extraction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (if installed) or manual verification |
| **Config file** | none — Wave 0 installs if needed |
| **Quick run command** | `npx convex dev --once && npm run lint` |
| **Full suite command** | `npx convex dev --once && npm run lint && npm run build` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx convex dev --once && npm run lint`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | FP-01 | integration | `npx convex dev --once` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | FP-01 | manual | Upload PDF/JPG/sketch | N/A | ⬜ pending |
| 4-02-01 | 02 | 1 | FP-02 | integration | `npx convex dev --once` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | FP-02 | manual | Verify JSON payload structure | N/A | ⬜ pending |
| 4-03-01 | 03 | 2 | FP-03 | manual | Render diagram, edit walls/rooms | N/A | ⬜ pending |
| 4-03-02 | 03 | 2 | FP-03 | build | `npm run build` | N/A | ⬜ pending |
| 4-04-01 | 04 | 2 | FP-04 | integration | `npx convex dev --once` | ❌ W0 | ⬜ pending |
| 4-04-02 | 04 | 2 | FP-04 | manual | Save and reload corrected geometry | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Convex schema additions compile without error (`npx convex dev --once`)
- [ ] New routes render without error (`npm run build`)
- [ ] react-konva and react-pdf packages installed and importable

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF/JPG/sketch upload accepted | FP-01 | Requires browser file picker + drag-drop | Upload each format, verify preview renders |
| AI returns structured JSON | FP-02 | Requires DashScope API call with real image | Upload floor plan, verify extraction result has walls/rooms/dimensions |
| 2D diagram is editable | FP-03 | Visual interaction (drag walls, rename rooms) | Load extracted plan, drag a wall, rename a room, verify changes persist |
| Corrected geometry saves to Convex | FP-04 | End-to-end data flow | Edit diagram, save, reload page, verify data matches edits |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
