# Research — Analytics totals (KPI cards)

Scope: `/analytics` top totals only. No implementation. Sources dated 2026-08-26.

---

## 1. Spec — what the dashboard may report

`docs/SPEC-visitor-identity.md` §5 “What the dashboard reports” (L398–408):

> Three numbers, always shown together, never collapsed into one.

| Metric | Definition | Honesty |
|---|---|---|
| **Devices** | distinct `deviceId` | **Floor.** Undercounts people who switch browsers. Fully defensible. |
| **Estimated visitors** | distinct `visitorId` at `confidence >= 70` | **Best estimate.** Label it “estimated” in the UI. |
| **Known contacts** | distinct `visitorId` with a `phoneHash` | **Ceiling on certainty.** These are the ones you can actually call. |

**Rule (quote, L408):**

> Do not print a single “Unique Visitors” figure with no qualifier — with an open tour and no verification, that number is an estimate, and a developer client who later discovers that will not trust anything else on the page. Put the estimation method behind an ⓘ tooltip.

Nothing scores 100 (L396). Phone is unverified (L79–83, L720).

---

## 2. Current implementation

### Top row — `src/app/(dashboard)/analytics/page.tsx`

`stats` (L157–182) → four cards (L294–337), `grid-cols-4`, `borderRadius: 12`, elevated `#1B1916`:

| Label | Value | Trend |
|---|---|---|
| Total Views | `overview.totalViews` | `trends.views` |
| Unique Visitors | `overview.totalUniqueVisitors` | `0` (never shown) |
| Avg. Scene Time | `overview.avgSceneTime` | `0` |
| Total Leads | `overview.totalLeads` | `trends.leads` |

Empty: spinner (L120–136) or “Sign in…” (L139–154). Cards still render `0` / `0s` — no “no views yet” copy.

### Tour-selected identity grid (L706–798)

Only after clicking a tour (`selectedTourId`). Heading **“Unique visitors”** (L721). Four cells: Estimated / Known contacts / Devices / Returning. Hints are always-visible captions (`confidence ≥ 70`, `session-based fallback`, `phone on lead form (unverified)`, `distinct deviceId — floor`, `totalSessions > 1`) — not ⓘ. Colors: teal / gold / muted / coral.

### `convex/analytics.ts` — `getDashboardOverview` (L673–860)

- `totalViews` = sum `tour.viewCount` (**all-time**, L740). Trend uses `currentViews` in the selected period (L735, L852). Period and headline disagree.
- `totalUniqueVisitors = periodSessions` = `Set(tour_view.sessionId)` in the **selected period** (L750–753). Comment: “not people.”
- Backend already computes `summarizeVisitorDocs` → `uniqueVisitorsEstimated`, `knownContacts`, `uniqueDevices`, `hasVisitorIds` (L755–767, L845–849). **The page ignores these** and still labels the session set “Unique Visitors.”
- `avgSceneTime` averages durations over the **2×-period** `allEvents` window (L769–776), not the selected period.
- `totalLeads` = all-time lead rows (L726); `periodLeads` exists (L835) but the card uses `totalLeads`.
- `period: 'all'` on the page passes `undefined` → query defaults to **30d** (`page.tsx` L89–91; query args L675).

### `summarizeVisitorDocs` / `getUniqueVisitorStats`

`summarizeVisitorDocs` (L23–55): estimated = `confidence >= 70`; known contacts = `phoneHash != null`; devices = count of visitor **rows** whose `identityTier` ∈ `{device, fingerprint, identified, verified}` — **not** distinct `deviceId` (spec L404). If no live visitor docs, estimated **falls back to `sessionUniques`** and `hasVisitorIds: false` (L30–38).

`getUniqueVisitorStats` (L1315–1350) is **tour-scoped, all-time** (no period). Same helper. Tour table column “Unique Visitors” is also `Set(sessionId)` (`getTourPerformance` L1023–1047).

---

## 3. Industry — users vs sessions vs views; estimates; KPI count

### Users ≠ sessions ≠ pageviews

- **GA4 users:** Total / Active / New / Returning are **separate** defined metrics — not one unlabeled “uniques.” Active user ≠ total user. [GA4 user metrics](https://support.google.com/analytics/answer/12253918)
- **GA4 session:** “period of time during which a user interacts”; default 30 min idle timeout. Session ID is **not** a person. Join `user_id`/`user_pseudo_id` with `session_id` for a unique visit. [About sessions](https://support.google.com/analytics/answer/9191807)
- **GA4 Views:** “number of … screens or web pages your users saw. **Repeated views** of a single screen or page **are counted**.” [Pages and screens](https://support.google.com/analytics/answer/12926732)
- **Mixpanel:** Insights measurements are separate: **Total Events** (“How many times did my users watch a video?”) vs **Unique Users** (“What’s the count of users who watched a video?”) vs **Sessions with event**. [Insights](https://docs.mixpanel.com/docs/reports/insights). Distinct ID: same `distinct_id` = one user; different IDs = two users. Anonymous = `$device_id`; identified = `$user_id`; merge only when both appear. [ID management](https://docs.mixpanel.com/docs/tracking-methods/id-management), [Simplified ID merge](https://docs.mixpanel.com/docs/tracking-methods/id-management/identifying-users-simplified)
- **Amplitude:** **Event** = action; **User** = individual; **Session** = period the site/app is open (web default 30 min). Unique user = Amplitude ID over device ID + user ID. Device ID dies on cookie clear / private mode. [What is Amplitude](https://amplitude.com/docs/get-started/what-is-amplitude), [Helpful definitions](https://amplitude.com/docs/get-started/helpful-definitions), [Track unique users](https://amplitude.com/docs/data/sources/instrument-track-unique-users)

Spazeo mapping: Views ≈ GA4 Views / Mixpanel Total Events (`tour_view` count). Sessions ≈ distinct `sessionId`. People ≈ Amplitude/Mixpanel unique users — **only** after identity graph; today the headline is sessions.

### Why estimates need labels *and* tooltips

- GA4: “Session and User metrics are calculated through an **estimation**.” HLL++ “estimates exact distinct counts” for Active users and Sessions; reports can differ from BigQuery exact counts. Disclose, compare directionally. [About sessions](https://support.google.com/analytics/answer/9191807), [About data sampling](https://support.google.com/analytics/answer/13331292) (HLL++ even on unsampled reports; typical discrepancy &lt;1%).
- Amplitude: merged IDs change DAU vs raw (~5% observed; higher on web). [Track unique users — Merged users](https://amplitude.com/docs/data/sources/instrument-track-unique-users)
- **NNG tooltips / info tips:** ⓘ is for **supplemental** definitions. **Assume most users never open the tip.** Do not hide the qualifier that changes meaning. Keep tips short, adjacent; no modal. [Why so many info tips are bad](https://www.nngroup.com/articles/info-tips-bad/), [Tooltip guidelines](https://www.nngroup.com/articles/tooltip-guidelines/)
- Spec L405 + L408: word **“estimated” on the label**; method in ⓘ.

### KPI card layout (4–6; primary vs secondary)

NNG does **not** publish a “4–6 cards” quota. What they do publish:

- Dashboards = **single-page at-a-glance**, car-dash metaphor, **not** an expansive data explorer. [Dashboards: preattentive](https://www.nngroup.com/articles/dashboards-preattentive/)
- UX benchmarks: **aim for 2–4 metrics**. [Product UX benchmarks](https://www.nngroup.com/articles/product-ux-benchmarks/)
- Track a **purposeful few**, not dozens. [UX metrics vs goals](https://www.nngroup.com/articles/ux-metrics-goals/)
- Cumulative “total users / page views” without a time frame is a **vanity metric**; add a period; **per-session ≠ per-user** — label which. [Vanity metrics](https://www.nngroup.com/articles/vanity-metrics/)
- GA4 **overview** = a small set of **summary cards**, not a metric dump. [About overview reports](https://support.google.com/analytics/answer/13818312)

Fit for Spazeo: spec’s **three identity numbers are one primary unit** (never split). Plus **Views** and **Leads** (broker KPIs) = **5 headline cards**. Optional 6th: Avg. scene time as **secondary** (engagement, not identity). Returning is Mixpanel/GA4-valid but **not** in the §5 trio — keep off the portfolio totals.

---

## 4. Design system

| Token | Value | Source |
|---|---|---|
| Gold | `#D4A017` | `CLAUDE.md` L283; `BRAND.md` L137 — primary / known contacts |
| Teal | `#2DD4BF` | `CLAUDE.md` L284; `BRAND.md` L146 — spatial / estimated |
| Coral | `#FB7A54` | `CLAUDE.md` L285; `BRAND.md` L153 — **urgent CTAs only**, not a KPI hue |
| Carbon / elevated | `#0A0908` / `#1B1916` | `BRAND.md` L160–162 |
| Headings / numbers | Plus Jakarta Sans `--font-jakarta` | `CLAUDE.md` L337; `BRAND.md` L283 |
| Labels / hints | DM Sans `--font-dmsans` | `CLAUDE.md` L338; `BRAND.md` L284 |
| Grid | 4px (`xs=4 … base=16 … lg=24`) | `CLAUDE.md` L341–344; `BRAND.md` L312–322 |
| Card radius | **8px** cards; **12px** modals/panels | `CLAUDE.md` L347–350. `BRAND.md` L325–327 allows 8–12px cards. **Today’s KPI tiles use 12px** (`page.tsx` L307) — treat as panel, or drop to 8px if they stay compact metric chips. |
| Icons | Lucide; gold interactive, teal spatial, `#6B6560` decorative | `CLAUDE.md` L371–374 |
| Voice | Short, no jargon, **no emojis** | `CLAUDE.md` L611–612; `BRAND.md` L61 |

60-30-10: neutrals 60%, text+teal 30%, gold+coral 10% (`BRAND.md` L193–198). Do not gold-wash all four tiles.

---

## 5. Recommended totals redesign (this section only)

**Always visible. Bind to the period chip. Do not wait for a tour click.**

**Primary (one bonded identity group — three cells, one surface, one ⓘ):**

1. **Devices** — floor. Copy: “Distinct browsers we can count.” Tooltip: spec L404; if implementation still counts `identityTier` rows, do not claim “distinct deviceId” until the query matches.
2. **Estimated visitors** — word **Estimated** in the label (not only in ⓘ). Value = `confidence >= 70` when `hasVisitorIds`; else show the session count with caption **“Sessions until identity is on”** (same as tour fallback L730–732). Tooltip: “Distinct visitors at confidence ≥ 70. Open tour, no OTP. Not a verified headcount.”
3. **Known contacts** — gold. Copy: “Left a phone on the lead form (unverified).” Never “verified.”

**Secondary (same row or a 4px-gap second row — 2–3 cards):**

4. **Views this period** — use `periodViews` + `trends.views`. Caption: “All-time: {totalViews}” so the cumulative number is not the headline ([vanity metrics](https://www.nngroup.com/articles/vanity-metrics/)).
5. **Leads this period** — `periodLeads` + `trends.leads`. Caption all-time `totalLeads`. Optional ratio caption `leads / views` (NNG ratios).
6. Optional: **Avg. scene time** — period-bounded durations, not the 2× window.

**Empty:** if `periodViews === 0` and `periodLeads === 0`, replace numerals with “No tours viewed in this period” (DM Sans 14px, muted `#6B6560`). Keep card shells. Loading stays the existing spinner.

**Typography / chrome:** labels 13px DM Sans `#A8A29E`; values 28px Jakarta `#F5F3EF`; gap 16; padding 16 or 24 (on-grid). Identity group: teal Devices/Estimated, gold Known contacts. Decorative icons `#6B6560`. ⓘ next to “Estimated visitors” (NNG: supplemental method only).

### Do not claim

- A single **Unique Visitors** tile (spec L408; `page.tsx` L165).
- Sessions as people (`totalUniqueVisitors = periodSessions`, L750–753).
- “Verified visitors” (`uniqueVisitorsVerified` is a legacy alias for `phoneHash`, L49).
- All-time views with a period trend (`totalViews` vs `trends.views`).
- Distinct `deviceId` until the query counts device IDs (L43–45 vs spec L404).
- Certainty / 100% identity (spec L396).
- Coral as the Returning/identity accent on totals (coral = CTA; Returning is not in the §5 trio).
- Hiding “estimated” only inside the tooltip (NNG info-tips; spec L405).
