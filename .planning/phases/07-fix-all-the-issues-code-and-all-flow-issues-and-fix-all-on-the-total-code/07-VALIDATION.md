---
phase: 7
slug: fix-all-the-issues-code-and-all-flow-issues-and-fix-all-on-the-total-code
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual / ESLint + TypeScript type check |
| **Config file** | tsconfig.json, .eslintrc |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run lint && npx tsc --noEmit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run lint && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | code-fixes | lint | `npm run lint` | ✅ | ⬜ pending |
| 7-01-02 | 01 | 1 | info-panel | lint | `npm run lint` | ✅ | ⬜ pending |
| 7-02-01 | 02 | 2 | nav-goto | lint | `npm run lint` | ✅ | ⬜ pending |
| 7-02-02 | 02 | 2 | editor-form + code-fixes | lint | `npm run lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework installation needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Navigation hotspot icon replaces arrow | navStyle/icon UX | No test runner; visual rendering | Open tour viewer, create nav hotspot with icon, confirm arrow replaced |
| Info panel opens first on nav hotspot with title | Info panel UX | Requires live viewer | Set title on nav hotspot, click in viewer, confirm panel opens before transition |
| "Go to [scene] →" button triggers scene transition | Navigation UX | Requires live viewer | Click "Go to" button in panel, confirm scene changes |
| navStyle ring/arrow/dot renders correctly | Visual style | Visual rendering | Create nav hotspot with each style, confirm correct appearance |
| accentColor applies to navigation hotspot | Color customization | Visual rendering | Set accentColor on nav hotspot, confirm color applied |
| Editor shows icon/style/color pickers for navigation type | Editor UX | Requires browser | Open hotspot edit form, confirm pickers visible for navigation type only |
| No CSP errors in browser console when loading building exterior viewer | CODE-CSP | Requires browser | Open building exterior viewer, check DevTools console for CSP errors |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify sub-tag
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infra sufficient)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
