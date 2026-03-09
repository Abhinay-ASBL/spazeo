---
phase: 01-tour-platform-stabilize-and-polish
plan: "01"
subsystem: backend-security
tags: [security, convex, bcrypt, leads, password-hashing]
dependency_graph:
  requires: []
  provides: [bcrypt-password-hashing, clean-lead-notification-path]
  affects: [convex/leads.ts, convex/passwordUtils.ts, convex/tours.ts, convex/schema.ts]
tech_stack:
  added: [bcryptjs@3.0.3, "@types/bcryptjs"]
  patterns: [convex-action-hashing, internal-query-hash-isolation, no-plaintext-password-storage]
key_files:
  created:
    - convex/passwordUtils.ts
  modified:
    - convex/leads.ts
    - convex/tours.ts
    - convex/schema.ts
    - package.json
decisions:
  - "Used bcryptjs (pure JS) over native bcrypt — Convex Node runtime has no native binaries"
  - "setTourPassword is an action (not mutation) so it can call bcrypt and internal mutations in one transaction"
  - "verifyTourPassword query now returns false only — real verification delegates to passwordUtils.verifyTourPassword internalAction (Plan 02 will wire the viewer)"
  - "password field kept in schema and update mutation args for backward compat but excluded from writes"
metrics:
  duration: "4m"
  completed_date: "2026-03-09"
  tasks_completed: 2
  files_modified: 5
---

# Phase 1 Plan 1: Security Bugs — Duplicate Lead Notification and Plaintext Password Summary

Removed dead `sendLeadNotification` duplicate from leads.ts and introduced bcryptjs server-side password hashing via a new `convex/passwordUtils.ts` action module.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Remove duplicate sendLeadNotification from leads.ts | 1e05d93 | convex/leads.ts |
| 2 | Add bcrypt password actions and update tours.ts | 0b9e1de | convex/passwordUtils.ts, convex/tours.ts, convex/schema.ts, package.json |

## What Was Built

### Task 1: Remove duplicate sendLeadNotification

`leads.ts` contained a duplicate `sendLeadNotification` internalAction (lines 360–426) that was never called. The `capture` mutation correctly called `internal.emails.sendLeadNotification` from `emails.ts`. The dead code in `leads.ts` included an extra `tourSlug` arg that differed from the real implementation — a future refactor could have accidentally pointed to this broken version and silently dropped lead notifications.

Removed the entire dead export and its now-unused `internalAction` import.

### Task 2: bcrypt password hashing

**convex/passwordUtils.ts** — new file with `"use node"` directive:
- `hashTourPassword` internalAction: wraps `bcrypt.hash(password, 10)`
- `verifyTourPassword` internalAction: runs `ctx.runQuery(internal.tours.getPasswordHash)` then `bcrypt.compare()`

**convex/tours.ts** additions:
- `getPasswordHash` internalQuery: returns only `{ passwordHash }` — never the full tour
- `getTourForOwner` internalQuery: ownership check for `setTourPassword`
- `patchTourPassword` internalMutation: writes `passwordHash` field only
- `setTourPassword` action: public API that hashes then stores via `runAction + runMutation`
- `update` mutation: `password` field is received but explicitly excluded (`_ignoredPassword`) so it can never be written as plaintext
- `verifyTourPassword` query: plaintext comparison removed, returns `false` — viewer will be updated in Plan 02 to use the action

**convex/schema.ts**: added `passwordHash: v.optional(v.string())` to tours table (alongside existing `password` field for backward compat).

## Deviations from Plan

None — plan executed exactly as written.

## Auth Gates

None.

## Self-Check

Files created/modified:
- convex/passwordUtils.ts: FOUND
- convex/leads.ts: FOUND
- convex/tours.ts: FOUND
- convex/schema.ts: FOUND

Commits:
- 1e05d93: fix(01-01): remove duplicate sendLeadNotification from leads.ts — FOUND
- 0b9e1de: feat(01-01): add bcrypt password hashing for tour password protection — FOUND

Verification assertions:
- `grep -r "password !== args.password" convex/` — zero matches: PASS
- `grep -r "internal.leads.sendLeadNotification" convex/` — zero matches: PASS
- `npm ls bcryptjs` — bcryptjs@3.0.3: PASS
- `convex/passwordUtils.ts` exports hashTourPassword and verifyTourPassword: PASS

## Self-Check: PASSED
