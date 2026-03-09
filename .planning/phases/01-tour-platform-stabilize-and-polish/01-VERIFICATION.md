---
phase: 01-tour-platform-stabilize-and-polish
verified: 2026-03-09T10:00:00Z
status: human_needed
score: 13/13 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 10/13
  gaps_closed:
    - "Navigation hotspot arrow now uses Math.atan2 bearing and applies CSS rotate() transform"
    - "Media hotspot popup now renders YouTube/Vimeo iframe and direct-file <video> element"
    - "Analytics headline cards now show Unique Visitors (overview.totalUniqueVisitors) and Avg. Scene Time (overview.avgSceneTime)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open a published tour at its public URL. Submit the lead capture form with a real name, email, and phone number."
    expected: "Tour owner receives email with buyer name, email address, and tour title within 60 seconds. Verify in both the Resend dashboard (resend.com/logs) and the tour owner inbox."
    why_human: "Email delivery via Resend requires a live Convex deployment with RESEND_API_KEY configured. Static code confirms the trigger path is correct (captureLead -> internal.emails.sendLeadNotification via scheduler.runAfter) but delivery cannot be verified from code analysis."
---

# Phase 01: Tour Platform Stabilize and Polish — Verification Report

**Phase Goal:** The 360° tour platform is production-stable with no live security vulnerabilities, working lead capture revenue flow, complete tour creation end-to-end, and a polished mobile-ready public viewer.
**Verified:** 2026-03-09T10:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (previous score: 10/13, previous status: gaps_found)

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                              | Status      | Evidence                                                                                                    |
|----|------------------------------------------------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------------|
| 1  | Lead email fires via `internal.emails.sendLeadNotification` (no duplicate)         | VERIFIED    | `leads.ts:216` calls `internal.emails.sendLeadNotification` via `ctx.scheduler.runAfter`                   |
| 2  | Tour passwords stored as bcrypt hashes, never plaintext                            | VERIFIED    | `passwordUtils.ts` "use node" + bcryptjs; `tours.ts` `patchTourPassword` writes only `passwordHash`        |
| 3  | Password verification runs bcrypt.compare server-side, returns boolean only        | VERIFIED    | `passwordUtils.ts:14-20` `verifyTourPassword` internalAction calls `bcrypt.compare`; returns boolean        |
| 4  | Public viewer password gate calls bcrypt action, not plaintext query               | VERIFIED    | `tour/[slug]/page.tsx:161` `useAction(api.passwordUtils.verifyTourPassword)`                                |
| 5  | Stripe webhook handles all four event types end-to-end                             | VERIFIED    | `http.ts:80-233` all four cases fully handled with `upsertFromStripe` + `syncPlanToUser`                   |
| 6  | Mobile viewer supports pinch-to-zoom; desktop supports scroll-zoom                | VERIFIED    | `PanoramaViewer.tsx:131` `enableZoom={true}`; container `touchAction:'none'`                               |
| 7  | F key triggers fullscreen; Escape key syncs button icon                            | VERIFIED    | `tour/[slug]/page.tsx:255-266` keydown listener with `'f'/'F'` check + `fullscreenchange` sync              |
| 8  | Auto-rotate activates after 5s idle, stops on any interaction                     | VERIFIED    | `tour/[slug]/page.tsx:152,180-181` `idleTimerRef` with 5000ms + `manualRotate` + `idleActive` pattern      |
| 9  | Navigation hotspot arrow points toward target room (directional bearing)           | VERIFIED    | `HotspotMarker.tsx:45,131` — `Math.atan2(x, -z) * 180/PI` → `rotate(${yawDeg}deg)` on ChevronRight        |
| 10 | Media hotspot popup plays video content (iframe or native video)                   | VERIFIED    | `HotspotMarker.tsx:269-301` — YouTube/Vimeo URL → `<iframe>`; `.mp4/.webm/.ogg` → `<video controls>`       |
| 11 | Analytics headline cards show Unique Visitors and Avg. Scene Time                  | VERIFIED    | `analytics/page.tsx:134-158` stats array: Total Views, Unique Visitors, Avg. Scene Time, Total Leads       |
| 12 | Analytics backend returns `totalUniqueVisitors` and `avgSceneTime`                 | VERIFIED    | `analytics.ts:559,565-568,626-627` — computed from sessionId Set and duration events; returned in query     |
| 13 | Tour creation flow end-to-end (create → editor → publish)                         | VERIFIED    | `tours/page.tsx:741,772` `api.tours.create` mutation + `router.push(\`/tours/${tourId}/edit\`)`            |

**Score:** 13/13 truths verified

---

## Required Artifacts

| Artifact                                          | Expected                                                        | Status      | Details                                                                                   |
|---------------------------------------------------|-----------------------------------------------------------------|-------------|-------------------------------------------------------------------------------------------|
| `convex/passwordUtils.ts`                         | bcrypt hash + verify internalActions, "use node"                | VERIFIED    | "use node" line 1; `hashTourPassword` + `verifyTourPassword` present                     |
| `convex/leads.ts`                                 | capture mutation calls `internal.emails.sendLeadNotification`   | VERIFIED    | Line 216 confirmed; no duplicate path                                                     |
| `convex/tours.ts`                                 | `getPasswordHash`, `setTourPassword`, `getBySlugWithScenes`     | VERIFIED    | All three exported                                                                        |
| `convex/http.ts`                                  | All 4 Stripe webhook event types handled                        | VERIFIED    | Lines 80-233; all four cases present                                                      |
| `convex/analytics.ts`                             | `getDashboardOverview` returns `totalUniqueVisitors` + `avgSceneTime` | VERIFIED | Lines 559, 565-568, 626-627 confirmed                                                 |
| `src/components/viewer/PanoramaViewer.tsx`        | `enableZoom={true}` + `touchAction:none`                        | VERIFIED    | Lines 131, 253                                                                            |
| `src/app/tour/[slug]/page.tsx`                    | `idleTimerRef`, `useAction` for password, F key shortcut        | VERIFIED    | Lines 152, 161, 255-266                                                                   |
| `src/components/viewer/HotspotMarker.tsx`         | Gold pulse ring + popup card + directional arrow + video render | VERIFIED    | Line 45: `Math.atan2` bearing; line 131: `rotate(${yawDeg}deg)`; lines 269-301: video/iframe |
| `src/app/globals.css`                             | `@keyframes hotspot-pulse`                                      | VERIFIED    | Lines 148, 153                                                                            |
| `src/app/(dashboard)/analytics/page.tsx`          | Headline cards: Total Views, Unique Visitors, Avg. Scene Time, Total Leads | VERIFIED | Lines 134-158: stats array confirmed; correct field bindings to `overview.*`   |
| `src/app/(dashboard)/tours/page.tsx`              | `CreateTourDialog` wired to `api.tours.create` + redirect       | VERIFIED    | Lines 741, 772                                                                            |

---

## Key Link Verification

| From                                              | To                                               | Via                              | Status      | Details                                                            |
|---------------------------------------------------|--------------------------------------------------|----------------------------------|-------------|---------------------------------------------------------------------|
| `leads.ts capture mutation`                       | `internal.emails.sendLeadNotification`           | `ctx.scheduler.runAfter`         | WIRED       | Line 216 confirmed                                                  |
| `passwordUtils.ts verifyTourPassword`             | `internal.tours.getPasswordHash`                 | `ctx.runQuery`                   | WIRED       | Line 17 confirmed                                                   |
| `tour/[slug]/page.tsx password submit`            | `api.passwordUtils.verifyTourPassword`           | `useAction` hook                 | WIRED       | Lines 161, 321 confirmed                                            |
| `tour/[slug]/page.tsx after verification`         | `api.tours.getBySlugWithScenes`                  | `useQuery` with skip condition   | WIRED       | Lines 165-166 confirmed                                             |
| `http.ts checkout.session.completed`              | `internal.subscriptions.upsertFromStripe`        | `ctx.runMutation`                | WIRED       | Lines 80-104 confirmed                                              |
| `tours/page.tsx New Tour button`                  | `api.tours.create`                               | `useMutation` + `router.push`    | WIRED       | Lines 741, 772 confirmed                                            |
| `HotspotMarker.tsx nav type position`             | CSS `rotate(${yawDeg}deg)` on ChevronRight       | `Math.atan2` bearing calculation | WIRED       | Line 45: `atan2(x,-z)`; line 131: `style={{ transform: \`rotate(${yawDeg}deg)\` }}` |
| `HotspotMarker.tsx media type popup`              | `<iframe>` or `<video controls>`                 | URL pattern matching             | WIRED       | Lines 272-301: YouTube/Vimeo regex → iframe; `.mp4/.webm/.ogg` regex → video |
| `analytics/page.tsx stats[1]`                     | `overview.totalUniqueVisitors`                   | `useQuery(api.analytics.getDashboardOverview)` | WIRED | Line 143: `value: formatNumber(overview.totalUniqueVisitors)`  |
| `analytics/page.tsx stats[2]`                     | `overview.avgSceneTime`                          | `useQuery(api.analytics.getDashboardOverview)` | WIRED | Line 149: `value: formatDuration(overview.avgSceneTime)`        |

---

## Requirements Coverage

| Requirement | Source Plan | Description                                                                         | Status        | Evidence                                                                                            |
|-------------|-------------|-------------------------------------------------------------------------------------|---------------|------------------------------------------------------------------------------------------------------|
| FIX-01      | 01-01       | Lead email fires correctly — no duplicate sendLeadNotification                      | SATISFIED     | `leads.ts:216` uses `internal.emails.sendLeadNotification` via scheduler                            |
| FIX-02      | 01-01, 01-02 | Tour passwords hashed with bcrypt, compared server-side                            | SATISFIED     | `passwordUtils.ts` + `setTourPassword` action + viewer `useAction`                                  |
| FIX-03      | 01-02       | Stripe webhook handles all four event types                                         | SATISFIED     | `http.ts:80-233` all four cases fully implemented                                                   |
| TOUR-01     | 01-05       | Full tour creation flow end-to-end                                                  | SATISFIED     | `CreateTourDialog` wired to `api.tours.create` + redirect to editor + scene reorder persistence     |
| TOUR-02     | 01-04       | Add, move, delete hotspots visually in editor                                       | SATISFIED     | Editor has full hotspot CRUD with config panel                                                       |
| TOUR-03     | 01-04       | Hotspot with animated directional arrow, info popup (text/image/video), link, toggle | SATISFIED   | Arrow: `Math.atan2` bearing at line 45 + `rotate()` at line 131. Video: iframe + video at lines 269-301 |
| TOUR-04     | 01-05       | Embeddable iframe snippet in tour settings                                          | SATISFIED     | Embed code textarea + copy button at `edit/page.tsx:1904`                                           |
| TOUR-05     | 01-02       | Clean public URL + optional password-protected link                                 | SATISFIED     | bcrypt verification flow end-to-end                                                                  |
| VIEW-01     | 01-03       | Mobile pinch-to-zoom, swipe rotate                                                  | SATISFIED     | `enableZoom=true` + `touchAction:none`                                                              |
| VIEW-02     | 01-03       | Fullscreen button + F key shortcut                                                  | SATISFIED     | F key listener + `fullscreenchange` sync                                                             |
| VIEW-03     | 01-03       | Auto-rotate after 5s idle, stops on interaction                                     | SATISFIED     | `idleTimerRef` (5000ms) + `manualRotate` + `idleActive` pattern                                     |
| LEAD-01     | 01-05       | Email notification with buyer info within 60s of form submission                    | NEEDS HUMAN   | Code path wired; delivery requires live Resend deployment to verify                                  |
| ANLT-01     | 01-05       | Dashboard shows total views, unique visitors, avg scene time, lead count per tour   | SATISFIED     | `analytics/page.tsx:134-158` stats: Total Views, Unique Visitors, Avg. Scene Time, Total Leads as headline cards; `analytics.ts:559,565-568` returns both fields |

---

## Anti-Patterns Found

| File                                             | Line   | Pattern                                                     | Severity | Impact                       |
|--------------------------------------------------|--------|-------------------------------------------------------------|----------|------------------------------|
| `src/app/(dashboard)/tours/[id]/edit/page.tsx`   | 873-874 | `@typescript-eslint/no-explicit-any` on hotspot casts      | Info     | Pre-dates phase; no runtime impact; tracked for future cleanup |

No blocker or warning anti-patterns remain. The static ChevronRight and text-only media content stubs from the previous verification have been resolved.

---

## Human Verification Required

### 1. Lead Email Delivery (LEAD-01)

**Test:** Open a published tour at its public URL. Submit the lead capture form with a real name, email, and phone number.
**Expected:** Tour owner receives email with buyer name, email address, and tour title within 60 seconds. Check both the Resend dashboard (resend.com/logs) and the tour owner's inbox.
**Why human:** Email delivery via Resend requires a live Convex deployment with `RESEND_API_KEY` configured. Static code confirms the trigger path is correct (`captureLead` mutation at `tour/[slug]/page.tsx:144,608` → `internal.emails.sendLeadNotification` via `scheduler.runAfter` at `leads.ts:216`) but delivery cannot be verified from code analysis alone.

---

## Re-verification Summary

Three gaps from the initial verification have been closed:

**Gap 1 — Directional Arrow (TOUR-03) — CLOSED:** `HotspotMarker.tsx` line 45 now computes `yawDeg = Math.round((Math.atan2(hotspot.position.x, -hotspot.position.z) * 180) / Math.PI)` and applies it at line 131 as `style={{ transform: \`rotate(${yawDeg}deg)\` }}` on the ChevronRight icon. The arrow is no longer static.

**Gap 2 — Video in Media Popup (TOUR-03) — CLOSED:** Lines 268-315 of `HotspotMarker.tsx` now branch on `type === 'media'`. YouTube/Vimeo URLs are matched via regex and rendered as `<iframe>` embeds with autoplay permissions. Direct video file URLs (`.mp4`, `.webm`, `.ogg`) are rendered as `<video controls>`. A text fallback remains for unmatched URL patterns.

**Gap 3 — Unique Visitors and Avg. Scene Time as Headline Cards (ANLT-01) — CLOSED:** `convex/analytics.ts:559` computes `totalUniqueVisitors` from a `Set` of `sessionId` values across all view events. Lines 562-568 compute `avgSceneTime` as the mean of events with a `duration` field. Both are returned in the query response (lines 626-627). `analytics/page.tsx:134-158` now defines four stats cards: Total Views, **Unique Visitors**, **Avg. Scene Time**, Total Leads — matching the ANLT-01 specification exactly.

No regressions detected across previously-passing truths (FIX-01, FIX-02, FIX-03, VIEW-01, VIEW-02, VIEW-03, TOUR-01, TOUR-02, TOUR-04, TOUR-05).

---

_Verified: 2026-03-09T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
