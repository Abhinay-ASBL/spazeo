---
phase: 3
slug: furniture-catalog-placement-and-room-sharing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (if installed) / manual verification |
| **Config file** | none — Wave 0 installs if needed |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FURN-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | FURN-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | FURN-03 | manual | visual inspection | N/A | ⬜ pending |
| 03-02-02 | 02 | 1 | FURN-04 | manual | visual inspection | N/A | ⬜ pending |
| 03-03-01 | 03 | 2 | FURN-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | FURN-06 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | FURN-07 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 2 | FURN-08 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 3 | SHARE-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 3 | SHARE-02 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-05-03 | 05 | 3 | SHARE-03 | manual | link sharing test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install vitest if not present
- [ ] Create test config file
- [ ] Stub test files for FURN-01 through FURN-08, SHARE-01, SHARE-02

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop GLB onto 3D canvas | FURN-03 | Requires visual DOM + WebGL interaction | Drag catalog item, verify it appears at floor level |
| Transform controls (rotate/scale) | FURN-04 | Requires mouse interaction with Three.js gizmos | Select placed item, rotate/scale with handles |
| Read-only shared room view | SHARE-03 | Requires visual + link-based E2E | Open share link in incognito, verify no edit controls |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
