# Spec — Unique Visitor Identity & Variant Tracking

> Status: **Approved** · Author: Claude · Date: 2026-08-26 · Approved: 2026-08-26
> Scope: Feature 16 (Visitor Identity) + Feature 17 (Scene Variants & Time-of-Day Tracking)
> Depends on: Feature 05 (Lead Capture), Feature 08 (Analytics Dashboard), Feature 13 (3D Building Viewer)

---

## 0. The one-paragraph version

Today Spazeo counts a "unique visitor" as `crypto.randomUUID()` generated in React state. Refresh the page and you are a new person. Every number in the analytics dashboard is a page-load count wearing a visitor costume.

This spec replaces that with a **layered identity**: five signals of decreasing reliability, resolved into one `visitorId`. The key design decision is that **no single signal is the identity** — IP is too coarse (families share it), browser is too fine (one person, three browsers), device is too coarse (families share it), and phone is the only signal genuinely 1:1 with a human. So phone is the anchor where we have it, and every other signal exists to *link anonymous activity back to that anchor*.

**The tour stays open.** No OTP, no verification gate, no blocking modal — a QR scan lands straight in the tour. Phone numbers arrive only when a visitor volunteers one in the existing lead form. That is a deliberate trade: identity becomes probabilistic rather than certain, and "unique visitors" becomes a well-founded estimate rather than a verified count. §5 is explicit about which numbers are defensible and which are inferred.

Second half of the spec covers time-of-day panorama variants (morning / afternoon / evening / sunset / night), which are currently modelled in the schema, written by nothing, read by nothing, tracked by nothing, and silently overwritten by a de-duplication bug.

---

## 1. Why the obvious approaches each fail

This is the reasoning you walked through, written down with the failure mode named.

| Signal | Fails because | Cardinality error |
|---|---|---|
| **IP address** | A family of four on one home Wi-Fi is one IP. On Jio/Airtel, CGNAT puts *thousands* of unrelated subscribers behind one IP. | Too coarse — merges different people |
| **Browser / cookie / localStorage** | The same person opening the tour in Chrome, then in the WhatsApp in-app browser, then in Safari, is three IDs. Incognito and "clear data" reset it. | Too fine — splits one person |
| **Device fingerprint** | Survives incognito and cache clear, but a father and son sharing an iPad produce the identical fingerprint. Also: two identical iPhone 15s on the same iOS version fingerprint nearly identically. | Too coarse — merges household members |
| **Phone number** | Genuinely 1:1 with a person in India — but unverified, so it carries typos, and one person may enter a spouse's number. You only get it from the minority who fill in the lead form. | Correct, but sparse and imperfect |

**Conclusion:** build a graph, not a key. And because the tour is open, that graph must produce a useful answer from device + fingerprint alone, with phone as an upgrade when it arrives rather than a prerequisite.

```
                         ┌──────────────────┐
                         │  visitors        │  ← the person
                         │  (phoneHash)     │
                         └────────┬─────────┘
                                  │ 1:N
                    ┌─────────────┴─────────────┐
                    │   visitorIdentities        │  ← the evidence
                    │   kind: device|fp|network  │
                    └─────────────┬─────────────┘
                                  │ N:1
                         ┌────────┴─────────┐
                         │   households     │  ← the cluster
                         │   (networkKey)   │
                         └──────────────────┘
```

---

## 2. The five signal tiers

Ordered by reliability. Each tier is collected only when the previous one is insufficient, and only after consent (§7).

### Tier 0 — `sessionId` — one visit
- **Source:** `crypto.randomUUID()`, persisted to `sessionStorage` (currently only React state — this is the bug).
- **Lifetime:** until the tab closes.
- **Fix required:** `useSessionTracker.ts:29` — read from `sessionStorage['spz_sid']` before generating.

### Tier 1 — `deviceId` — one browser profile
- **Source:** UUID v4, triple-written to first-party cookie (`spz_did`, 400 days, `SameSite=Lax`, `Secure`), `localStorage`, and IndexedDB. Read back from whichever survives.
- **Survives:** refresh, tab close, cache clear (partially — IndexedDB often outlives localStorage).
- **Dies on:** incognito, different browser, "clear all site data", new device.
- **Cost:** zero.

### Tier 2 — `fingerprintHash` — one browser build on one machine
- **Source:** [FingerprintJS OSS v5](https://github.com/fingerprintjs/fingerprintjs) (MIT, `npm i @fingerprintjs/fingerprintjs`, ~28k stars).
- **Survives:** incognito, cache clear, cookie wipe. *This is the whole point of it.*
- **Dies on:** different browser on the same device, browser major upgrade, OS update (font/canvas changes).
- **Accuracy caveat — read this:** the OSS library's own README states accuracy is *"significantly lower than in the commercial version"* and that client-generated fingerprints are *"vulnerable to spoofing and reverse engineering."* Realistically expect **~60–75% stability over 30 days**, not the 99.5% Fingerprint Pro advertises. Two identical stock Android phones can collide.
- **Therefore:** never treat a fingerprint match alone as identity. It is a *link hint* worth 70 confidence points (§5).
- **Upgrade path:** Fingerprint Pro (`fingerprint.com`) does server-side processing + network signals, ~99.5% accuracy, from ~$200/mo. Deferred — revisit if fingerprint-only match rate is measurably hurting attribution after 3 months of data.

**Loader note:** the `openfpcdn.io` CDN import in their docs is blocked by ad blockers and by Brave/Firefox shields. Use the npm package, bundled.

### Tier 3 — `phoneHash` — one person, unverified ★
- **Source:** the **existing lead form** (`tour/[slug]/page.tsx:807-811` already collects Name / Email / Phone). No OTP, no verification step, no gate.
- **Store:** `sha256(normalizedE164 + PEPPER)`. Never the raw number in the analytics path — the raw number lives only on the `leads` / `customers` row the tour owner is entitled to see.
- **Survives:** everything. New browser, new device, new country.
- **Coverage:** only visitors who choose to submit the form. Expect a single-digit-to-low-double-digit percentage of tour views. **Most visitors will never have a Tier 3 identity** — the system must work well without it.
- **Unverified means:** typos produce phantom identities; a person may enter a spouse's or agent's number; a competitor can enter anything. Normalise to E.164 and reject invalid numbers before hashing, but do not assume truth.
- **This is still the best anchor available** — just worth 90 points, not 100 (§5), and it merges only with corroboration (§4).

### Tier 4 — `networkKey` — one household or one carrier gateway
- **Source:** `sha256(clientIP + ASN + PEPPER)`, computed **server-side in the Next.js layer on Vercel**, never client-side.
- **Use:** cluster visitors into a probable household. Surface in the CRM as *"3 people from this network viewed this tour"*.
- **Never** merges identities. On Indian mobile networks a `networkKey` can cover 10,000 strangers behind one CGNAT gateway.
- **Hard rule:** if `visitorsWithNetworkKey > 8`, mark the household `type: 'carrier_gateway'` and stop clustering on it entirely.

---

## 3. Schema additions (Convex)

All new tables. No breaking changes to existing tables — new columns are `v.optional()` so existing rows validate.

```ts
// convex/schema.ts

// ── The person ────────────────────────────────────────────────
visitors: defineTable({
  // Anchor. Present once a phone is volunteered in the lead form.
  // UNVERIFIED — no OTP. Treat as strong evidence, not proof.
  phoneHash: v.optional(v.string()),
  phoneFirstSeenAt: v.optional(v.number()),
  phoneSubmitCount: v.optional(v.number()),   // same number re-submitted = more trust
  phoneCountryCode: v.optional(v.string()),   // '+91'

  // Denormalised convenience
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  totalSessions: v.number(),
  totalToursViewed: v.number(),
  totalSecondsViewed: v.number(),

  // Confidence in this row being ONE human (0-100, see §5)
  confidence: v.number(),
  identityTier: v.union(
    v.literal('session'),     // 0 — ephemeral, not persisted as a visitor
    v.literal('device'),      // 1
    v.literal('fingerprint'), // 2
    v.literal('identified')   // 3 — phone-anchored, unverified
  ),

  // Merge chain. When two visitors turn out to be one person,
  // the loser gets mergedInto set and is never written to again.
  mergedInto: v.optional(v.id('visitors')),
  mergedAt: v.optional(v.number()),

  householdId: v.optional(v.id('households')),

  // Derived market (see §4)
  micromarket: v.optional(v.string()),
  micromarketSource: v.optional(v.union(
    v.literal('declared'),   // they told us
    v.literal('qr_campaign'),// encoded in the QR URL
    v.literal('tour_intent'),// inferred from what they viewed
    v.literal('geolocation'),// browser GPS, consented
    v.literal('ip')          // last resort, low trust
  )),
  city: v.optional(v.string()),
  countryCode: v.optional(v.string()),
})
  .index('by_phoneHash', ['phoneHash'])
  .index('by_householdId', ['householdId'])
  .index('by_lastSeenAt', ['lastSeenAt'])
  .index('by_mergedInto', ['mergedInto']),

// ── The evidence ──────────────────────────────────────────────
visitorIdentities: defineTable({
  visitorId: v.id('visitors'),
  kind: v.union(
    v.literal('device'),      // deviceId UUID
    v.literal('fingerprint'), // FingerprintJS visitorId
    v.literal('network'),     // hashed IP+ASN
    v.literal('phone')        // phoneHash
  ),
  value: v.string(),          // already hashed where sensitive
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  seenCount: v.number(),
  // FingerprintJS returns its own 0-1 confidence; keep it.
  sourceConfidence: v.optional(v.number()),
})
  .index('by_visitorId', ['visitorId'])
  .index('by_kind_value', ['kind', 'value'])   // ← the lookup index
  .index('by_value', ['value']),

// ── The cluster ───────────────────────────────────────────────
households: defineTable({
  networkKey: v.string(),
  type: v.union(
    v.literal('residential'),     // ≤8 visitors — probably a real family
    v.literal('carrier_gateway')  // >8 — CGNAT, do not cluster
    // 'office' deferred — no assignment rule yet
  ),
  visitorCount: v.number(),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  city: v.optional(v.string()),
  asn: v.optional(v.string()),
  isp: v.optional(v.string()),
}).index('by_networkKey', ['networkKey']),

// ── Merge audit (unverified phone merges must be reversible) ──
visitorMerges: defineTable({
  winnerId: v.id('visitors'),
  loserId: v.id('visitors'),
  reason: v.union(
    v.literal('phone_match_corroborated'),
    v.literal('manual')
  ),
  corroboratedBy: v.optional(v.union(v.literal('device'), v.literal('fingerprint'))),
  // Counts moved, so an unmerge can subtract exactly what was added.
  movedIdentities: v.number(),
  movedAnalytics: v.number(),
  movedLeads: v.number(),
  mergedAt: v.number(),
  revertedAt: v.optional(v.number()),
})
  .index('by_winnerId', ['winnerId'])
  .index('by_loserId', ['loserId']),

// ── Anonymous consent (the existing `consents` table requires a userId) ──
visitorConsents: defineTable({
  visitorId: v.optional(v.id('visitors')),
  sessionId: v.string(),
  deviceId: v.optional(v.string()),
  purpose: v.union(
    v.literal('essential'),
    v.literal('analytics'),
    v.literal('fingerprinting'),
    v.literal('geolocation'),
    v.literal('marketing')
  ),
  granted: v.boolean(),
  policyVersion: v.string(),
  grantedAt: v.number(),
  withdrawnAt: v.optional(v.number()),
  ipHash: v.optional(v.string()),
  userAgent: v.optional(v.string()),
})
  .index('by_sessionId', ['sessionId'])
  .index('by_visitorId', ['visitorId'])
  .index('by_visitorId_purpose', ['visitorId', 'purpose']),
```

### Columns added to existing tables

```ts
// analytics — add:
visitorId: v.optional(v.id('visitors')),
variantKey: v.optional(v.string()),        // §6
timeOfDay: v.optional(timeOfDayUnion),     // §6
// new index:
.index('by_visitorId', ['visitorId'])
.index('by_tourId_visitorId', ['tourId', 'visitorId'])

// leads — add:
visitorId: v.optional(v.id('visitors')),
phoneNormalized: v.optional(v.string()),   // E.164, for dedupe
micromarket: v.optional(v.string()),
.index('by_visitorId', ['visitorId'])
.index('by_phoneNormalized', ['phoneNormalized'])  // no phone index exists today

// dailyAnalytics — add:
uniqueVisitorsIdentified: v.optional(v.number()),  // phone-anchored (unverified)
uniqueVisitorsEstimated: v.optional(v.number()),   // confidence >= 70
uniqueDevices: v.optional(v.number()),             // the floor — always defensible
returningVisitors: v.optional(v.number()),

// buildingAnalytics — add (it currently has NO metadata escape hatch):
visitorId: v.optional(v.id('visitors')),
timeOfDay: v.optional(timeOfDayUnion),
metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))),
```

---

## 4. The resolution algorithm

Runs in a Convex mutation `visitors.resolve`, called once per page load *after* consent.

```
resolve({ deviceId?, fingerprintHash?, fpConfidence?, networkKey?, sessionId })

  candidates = []

  # 1. Deterministic lookups, strongest first
  if deviceId:
      v = lookup(visitorIdentities, kind='device', value=deviceId)
      if v: candidates.push({ visitor: v, weight: 60, reason: 'device' })

  if fingerprintHash:
      v = lookup(visitorIdentities, kind='fingerprint', value=fingerprintHash)
      if v: candidates.push({ visitor: v, weight: 70, reason: 'fingerprint' })

  # 2. Score
  if candidates is empty:
      visitor = create(visitors, { identityTier: 'device', confidence: 55 })

  elif all candidates point to the same visitor:
      visitor = that visitor
      # Both device AND fingerprint agreed → strong
      confidence = (device && fingerprint) ? 85 : max(weights)

  else:
      # Device says A, fingerprint says B. Two people share a browser
      # profile, OR one person cleared cookies and got a new deviceId.
      # Prefer the FINGERPRINT (survives cookie clears), attach the
      # deviceId to it as new evidence, and DO NOT merge A into B —
      # a shared-family-device is a real possibility.
      visitor = fingerprintCandidate
      confidence = 65
      flagForReview(A, B, 'signal_conflict')

  # 3. Record the evidence (upsert, bump seenCount + lastSeenAt)
  for each of (deviceId, fingerprintHash, networkKey):
      upsertIdentity(visitor, kind, value)

  # 4. Household — clustering only, never merging
  if networkKey:
      hh = upsertHousehold(networkKey)
      if hh.visitorCount > 8: hh.type = 'carrier_gateway'
      if hh.type != 'carrier_gateway': visitor.householdId = hh._id

  # 5. Never return a merged-away visitor
  return resolveChain(visitor)   # follow mergedInto until null
```

### Attaching a phone, on lead-form submit

There is no OTP step, so this runs inside the existing `leads.capture` mutation.

```
attachPhone({ phone, sessionId, currentVisitorId })

  e164 = toE164(phone)                     # libphonenumber; reject if invalid
  phoneHash = sha256(e164 + PEPPER)

  existing = lookup(visitors, by_phoneHash, phoneHash)

  # ── Case 1: number never seen before ─────────────────────────
  if existing is null:
      patch(currentVisitor, {
        phoneHash, phoneFirstSeenAt: now, phoneSubmitCount: 1,
        identityTier: 'identified', confidence: 90
      })
      addIdentity(currentVisitor, 'phone', phoneHash)
      return currentVisitor

  if existing._id == currentVisitorId:
      bump(existing.phoneSubmitCount)      # same person, same number again
      return existing

  # ── Case 2: number seen before, on a DIFFERENT visitor row ───
  # Either a returning visitor on a new device (merge), or a typo /
  # a shared number (do not merge). Decide on corroboration.

  corroboration = null
  if shareIdentity(currentVisitor, existing, kind='fingerprint'):
      corroboration = 'fingerprint'
  elif shareIdentity(currentVisitor, existing, kind='device'):
      corroboration = 'device'

  if corroboration is null:
      # Phone alone. NOT enough — unverified numbers carry typos and
      # shared/agent numbers. Record a SOFT LINK and move on; the two
      # rows stay separate and both keep their own history.
      addIdentity(currentVisitor, 'phone', phoneHash)
      patch(currentVisitor, { identityTier: 'identified', confidence: 90 })
      flagForReview(currentVisitor, existing, 'phone_match_uncorroborated')
      return currentVisitor

  # Phone + a device or fingerprint in common. Merge, and log enough
  # to reverse it.
  merge(loser=currentVisitor, winner=existing, corroboration):
     - reassign all visitorIdentities.visitorId  → winner
     - reassign all analytics.visitorId          → winner
     - reassign all leads.visitorId              → winner
     - winner.totalSessions      += loser.totalSessions
     - winner.totalSecondsViewed += loser.totalSecondsViewed
     - winner.firstSeenAt = min(both)
     - winner.confidence = 95
     - loser.mergedInto = winner._id ; loser.mergedAt = now
     - insert visitorMerges { winnerId, loserId, corroboratedBy,
                              movedIdentities, movedAnalytics, movedLeads }
  return existing
```

**Merge rules — hard constraints:**
1. Merge **only** on a phone match **plus** a shared device or fingerprint. Never on phone alone, never on fingerprint alone, never on device alone, never on network.
2. Never merge two visitors that already hold *different* `phoneHash` values. Two numbers = two people. Log `dual_phone_conflict`, leave both alone.
3. **Every merge is reversible.** Because the phone is unverified, mis-merges will happen — a typo that lands on a real customer's number silently welds two strangers together. `visitorMerges` records exactly what moved so an unmerge can put it back. Build `visitors.unmerge` in the same phase as the merge, not later.
4. A merge chain resolves on read, not on write. Follow `mergedInto` (cap 10 hops) in `resolveChain()`; never rewrite pointers transitively.
5. Cap it: if one `phoneHash` attracts more than 5 distinct visitor rows, stop merging on it and flag it — that is a broker's number, an office landline, or a bot.

---

## 5. Confidence scoring

Stored on `visitors.confidence`, surfaced in the CRM so a sales rep knows how much to trust a "returning visitor" badge.

| Evidence | Score | Tier | UI label |
|---|---|---|---|
| Phone + device/fingerprint corroboration | **95** | identified | Known contact |
| Phone submitted (unverified, uncorroborated) | **90** | identified | Known contact |
| Device + fingerprint agree | **85** | fingerprint | Very likely same person |
| Fingerprint only | **70** | fingerprint | Likely same person |
| Device + fingerprint disagree | **65** | fingerprint | Likely — shared device? |
| Device only | **60** | device | Same browser |
| New, no prior match | **55** | device | New visitor |
| Network only | **25** | — | *Never an identity.* Household hint only |

Nothing scores 100 any more. Without verification there is no certainty in this system, and the dashboard should not imply otherwise.

### What the dashboard reports

Three numbers, always shown together, never collapsed into one:

| Metric | Definition | Honesty |
|---|---|---|
| **Devices** | distinct `deviceId` | **Floor.** Undercounts people who switch browsers. Fully defensible. |
| **Estimated visitors** | distinct `visitorId` at `confidence >= 70` | **Best estimate.** Label it "estimated" in the UI. |
| **Known contacts** | distinct `visitorId` with a `phoneHash` | **Ceiling on certainty.** These are the ones you can actually call. |

Do not print a single "Unique Visitors" figure with no qualifier — with an open tour and no verification, that number is an estimate, and a developer client who later discovers that will not trust anything else on the page. Put the estimation method behind an ⓘ tooltip.

---

## 6. Phone capture — open tour, no OTP

**Decision (2026-08-26): the tour stays open.** No verification gate, no blocking modal, no SMS. A QR scan lands straight in the panorama.

> **Archived:** the previous draft of this section specified an OTP gate (Firebase Phone Auth → MSG91, TRAI DLT registration, `otpChallenges` table, preview-then-gate modal). **Dropped — do not build.** An OTP sender on a public, unauthenticated, `CORS: *` endpoint is an SMS-spend attack surface, and gating an open tour costs scans. Full text in git history.

Dropping it removes Firebase, MSG91, DLT registration, the WhatsApp BSP, the `otpChallenges` table, the per-message spend, and a 7–21 day regulatory wait. The price is that identity is now probabilistic — §5 says exactly which numbers stay defensible.

### What replaces it

Nothing new to build for capture — **`leads.capture` already collects Name / Email / Phone** (`tour/[slug]/page.tsx:807-811`). The work is to make the number an identity signal rather than just a CRM field:

1. Normalise to E.164 with libphonenumber; reject invalid numbers.
2. Hash to `phoneHash` and run `attachPhone()` (§4).
3. Store `phoneNormalized` on the lead and index it — `leads` has **no phone index at all** today, so the same person enquiring twice creates two unrelated leads.

### Making the form worth filling in

Nothing forces a number now, so conversion is entirely a function of the offer. This matters more than any code in this spec:

- **Ask at the moment of intent**, not on a timer — after a hotspot click, on the third scene, or when someone lingers on one room past ~45 seconds.
- **Trade something concrete:** the floor plan PDF, the price sheet, a site-visit slot — or the night view. §8 hands you that lever for free: day views open, night and sunset variants behind the form.
- **One field first.** Phone alone; reveal name and email after. Every removed field lifts completion.
- **`leadCaptureConfig.gateBehavior` already exists and is wired to nothing** (`schema.ts:100-111`). Implement `'after_delay'` and `'optional_sidebar'`, add `'after_scenes'`, and leave `'before_tour'` in the union unused.

### Recognising a returning visitor without a login

This is where the fingerprint earns its place. Someone who filled the form last week and returns on the same browser is matched on `deviceId` / `fingerprintHash`, with their `phoneHash` already attached — so:

- Pre-fill the form; let them submit with one tap instead of retyping.
- Show *"Welcome back"* and resume at their last scene.
- Tell the tour owner *"this lead has visited 4 times and spent 22 minutes"* — the number a broker actually acts on.

None of that needs verification. It needs the identity graph in §2–§4 to work.

### Abuse controls (still required)

`analytics.track`, `analytics.trackBatch` and `leads.capture` are **unauthenticated public mutations behind `Access-Control-Allow-Origin: *`**. Dropping OTP removes the SMS-spend risk, not the risk of poisoned analytics or a flooded CRM.

- Rate-limit `leads.capture`: max **3 submissions per sessionId per hour**, **10 per ipHash per hour**.
- Rate-limit `trackBatch` per sessionId; cap events per batch and batches per minute.
- Reject invalid E.164 numbers and disposable-domain emails before insert.
- Honeypot field + minimum time-to-submit on the form. No CAPTCHA — it costs more conversion than it saves here.
- Cap `visitors` creation per `networkKey` per hour to blunt fingerprint-spoofing floods.

---

## 7. Micromarket derivation

**The research finding that decides this section:** MaxMind's own published accuracy for India is **42% exact city and 4% exact postal code**. On Jio/Airtel, CGNAT resolves subscribers to Mumbai/Delhi carrier gateways regardless of where they physically are. Micromarket ("Gachibowli", "Whitefield") is *finer* than a postal code.

**IP → micromarket in India does not work.** It will be wrong ~96% of the time on exactly the mobile networks most of your QR traffic uses. Do not build it, do not surface it to a sales rep, do not score leads on it.

### The waterfall — first hit wins

| Priority | Source | Accuracy | How |
|---|---|---|---|
| **1** | **QR campaign parameter** | 100% for the poster's location | Encode placement in the QR URL — §7.1 |
| **2** | **Declared** | ~100% | An optional "Which area are you looking in?" typeahead in the lead form |
| **3** | **Tour intent** | 100% for *intent* | The property's own location. Someone viewing a Gachibowli 3BHK **is** a Gachibowli-intent lead. This is already in `tours.address` / `buildings.location` — the micromarket is sitting in your database already. |
| **4** | Browser Geolocation | 5–15m on mobile when granted | Ask *after* a lead-form submit, with a stated reason ("show me tours near me"). One shot only — a dismissed prompt never re-shows. |
| **5** | IP geo | 42% city / 4% postal | **City pre-fill and VPN flag only.** Never a lead attribute. |

Note that #3 is what Indian portals actually do — Housing.com and Square Yards model micromarket from *search and listing behaviour*, not visitor IP. Intent market beats residence market commercially anyway: someone in Pune looking at Hyderabad properties is a Hyderabad lead.

### 7.1 QR URL scheme — do this before printing anything

This is the highest-value, lowest-effort item in the whole spec, and it is a **hard deadline**: every QR code printed without these parameters is permanently unattributable. Once a hoarding is up, you cannot retrofit it.

```
https://spazeo.io/tour/prestige-lakeside-3bhk
  ?src=qr
  &qr=hyd-gachibowli-hoarding-01     ← unique per physical placement
  &mm=gachibowli                      ← micromarket of the placement
  &camp=q3-launch
  &utm_source=qr&utm_medium=offline&utm_campaign=q3-launch
```

- Capture on first load into `sessionStorage`, persist to the `visitors` row and onto the `leads` row.
- `useUTMCapture.ts` **already exists** and already does this — it is just never called on `/tour/[slug]` and `getStoredUTMParams()` has zero call sites. Wire it up.
- Generate the QR + parameters from the dashboard (Feature 14, Embed Code Generator) so nobody hand-types them.
- Report per placement: scans, scan→engaged rate (reached scene 2), engaged→enquiry rate. With no gate in the funnel these are the only conversion steps you have, which makes them the ones to instrument properly. That is offline attribution, and no competitor of yours has it.

### 7.2 Reading the IP correctly

**Convex mutations cannot see the client IP** — there is no `ctx.request.ip`, and the feature request for one ([get-convex/convex-backend#130](https://github.com/get-convex/convex-backend/issues/130)) closed without an API.

Correct pattern:
1. Read geo in the **Next.js layer on Vercel**, where `x-vercel-forwarded-for` is set by Vercel's own infrastructure and cannot be spoofed. `geolocation(request)` from `@vercel/functions` returns `{ city, country, countryRegion, latitude, longitude, postalCode }` and is **free on all plans including Hobby**.
2. Hash it there into `networkKey`.
3. Pass only the *derived* values (networkKey, city, countryCode) into Convex as explicit mutation args.

Never trust an IP header arriving at a Convex HTTP action from an untrusted caller — with `CORS: *`, anyone can forge it.

---

## 8. Time-of-day & scene variants

You asked: *"we have night view and also morning and evening view — we should track all, how many scenes we have."*

### 8.1 What actually exists today

| Thing | Reality |
|---|---|
| `timeOfDay` field | Exists on `exteriorPanoramas` only. Values: `morning \| afternoon \| sunset \| night`. **`'evening'` and `'dusk'` are not valid values.** |
| `timeOfDay` on `scenes` | **Does not exist.** Interior tour panoramas have no time dimension at all. |
| Variant grouping | **Does not exist.** Zero matches for `variantOf`/`parentSceneId`/`variantType` anywhere in the repo. Day and night versions of one room can only be unrelated sibling `scenes` rows with nothing linking them. |
| Any UI to switch time of day | **Does not exist.** `ViewerControls` = zoom/rotate/fullscreen. `SceneNavigator` = flat thumbnail strip. |
| The whole `exteriorPanoramas` read/write path | **Orphaned.** `savePanorama`, `create`, `getByViewPosition` are surfaced through `useBuilding.ts:95-109`, which **no component imports.** No admin screen can set a timeOfDay. |
| `TIME_OF_DAY_OPTIONS` in `constants.ts` | Dead code — imported by zero files. |
| Any analytics event recording timeOfDay | **None.** `TrackedEvent` has no slot for it. |
| `buildingAnalytics.track` | **Never called from the frontend.** The entire 3D building viewer emits zero telemetry. It is also the one table with **no `metadata` escape hatch**, so it structurally cannot carry a variant without a migration. |

### 8.2 🔴 Data-loss bug — fix before adding any variant

`convex/legacyTowersConfig.ts:585-592` de-duplicates panoramas on `towerId | cornerId | heightM` — **excluding `timeOfDay`**:

```ts
const filtered = existing.panoramas.filter(
  (p) => !(p.towerId    === args.panorama.towerId &&
           p.cornerId   === args.panorama.cornerId &&
           p.heightM    === args.panorama.heightM)   // ← timeOfDay missing
)
```

**Uploading a night panorama deletes the existing day panorama for that view.** The same broken key appears in `addPanoramaAdmin` (`:559`), `removePanorama` (`:617`), the dedupe migration (`:669`), and the admin lookup map (`admin/page.tsx:1169`). The admin UI even states the assumption out loud: *"One 360° image per unit per floor section."*

Fix: extend the key to `towerId|cornerId|heightM|timeOfDay` in all five places, defaulting `timeOfDay` to `'afternoon'` for existing rows.

### 8.3 The variant model

Add to `scenes`:

```ts
// A stable key shared by every variant of the same physical space.
// e.g. 'living-room' — day, night and staged versions all carry it.
variantKey: v.optional(v.string()),

variantType: v.optional(v.union(
  v.literal('default'),
  v.literal('timeOfDay'),
  v.literal('staged'),      // uses the existing, currently-unrendered stagedImageStorageId
  v.literal('seasonal')
)),

timeOfDay: v.optional(v.union(
  v.literal('morning'),
  v.literal('afternoon'),
  v.literal('evening'),     // ← NEW, you asked for it
  v.literal('sunset'),      // ← existing, keep for migration safety
  v.literal('night')
)),

isPrimaryVariant: v.optional(v.boolean()),   // the one shown by default
```
New index: `.index('by_tourId_variantKey', ['tourId', 'variantKey'])`

Apply the same `timeOfDay` union to `exteriorPanoramas` (add `'evening'`), and add a composite index `by_viewPositionId_timeOfDay` so "give me the night panorama for this vantage point" is one indexed read instead of a full collect-and-filter-in-JS.

### 8.4 🔴 Consequence you must decide on: scene counts and plan limits

Scene count is **computed at read time everywhere** — there is no `sceneCount` on the tour doc. Plan limits are enforced per tour in `convex/scenes.ts:12-18`:

```
free: 10 · starter: 25 · professional: 50 · business/enterprise: unlimited
```

If day + evening + night variants are separate `scenes` rows, **a 10-room tour becomes 30 scenes** and instantly breaks the Free and Starter tiers. Three options:

| Option | Effect |
|---|---|
| **A. Count variant groups, not rows** ⭐ | `countDistinct(variantKey)` for both display and plan limits. A 10-room tour is 10 scenes whether or not it has night views. Variants become a *quality* feature, not a *quota* feature — which is the right commercial framing. |
| B. Count rows, raise the limits | Simple, but punishes the customers who use the feature most. |
| C. Meter variants separately | New limit type (`variantsPerScene`), more billing surface, more code. |

**Recommend A.** It also makes `{scenes.length} Scenes` in the viewer header (`tour/[slug]/page.tsx:616`) correct instead of confusing.

Also fix while in here: `convex/subscriptions.ts:72-80` does an **N+1 scan over every tour's scenes on every dashboard load**. Denormalise a `sceneCount` + `variantCount` onto the tour doc, maintained by the scenes mutations.

### 8.5 Analytics additions

Add to `TrackedEvent` in `useSessionTracker.ts` and to the `analytics` table as **first-class optional columns** (not just `metadata`) — because the CSV export at `convex/analytics.ts:817-827` drops `metadata` entirely, so anything hidden in there is unexportable:

```ts
variantKey?: string
timeOfDay?: 'morning'|'afternoon'|'evening'|'sunset'|'night'
```

New events:

| Event | Fires when | Payload |
|---|---|---|
| `variant_switch` | User toggles day→night | `{ variantKey, from, to, sceneId }` |
| `variant_view` | A non-default variant is displayed | `{ variantKey, timeOfDay, sceneId }` |
| `variant_dwell` | On leaving a variant | `{ variantKey, timeOfDay, duration }` |

New dashboard answers this unlocks — these are genuinely sellable to a developer client:
- *"68% of visitors switched to the night view, and they spent 2.4× longer there."*
- *"Sunset views drive 3× the enquiry rate on west-facing units."*
- *"Nobody ever opens the morning variant — stop paying to render it."*

### 8.6 Time-of-day switcher UI

New component `src/components/viewer/TimeOfDaySwitcher.tsx`, rendered next to `ViewerControls`, visible only when the current scene's `variantKey` has more than one variant.

- Segmented pill control, icons from Lucide: `Sunrise` / `Sun` / `Sunset` / `Moon`.
- Teal `#2DD4BF` for the active segment (spatial/navigation per the design system), gold `#D4A017` reserved for primary CTAs.
- Crossfade between panoramas rather than a hard swap — `@photo-sphere-viewer` supports a fade transition on `setPanorama`.
- Preload the adjacent variant on hover so the switch feels instant.
- Fires `variant_switch` on every change.

---

## 9. Bugs found during the audit

Independent of the features above. Ranked.

| # | Severity | Issue | Location |
|---|---|---|---|
| 1 | 🔴 | Panorama de-dupe key omits `timeOfDay` — uploading a night view **deletes** the day view | `legacyTowersConfig.ts:559,585,617,669`; `admin/page.tsx:1169` |
| 2 | 🔴 | `sessionId` is React state — every refresh is a new "unique visitor". All unique-visitor metrics are wrong | `useSessionTracker.ts:29` |
| 3 | 🔴 | `analytics.track` / `trackBatch` / `leads.capture` are unauthenticated public mutations with `CORS: *` and no rate limiting | `convex/analytics.ts`, `convex/leads.ts`, `convex/http.ts:10-14` |
| 4 | 🟠 | `buildingAnalytics.track` has **zero frontend callers** — the 3D building viewer emits no telemetry at all | `convex/buildingAnalytics.ts:4` |
| 5 | 🟠 | `analytics.country` / `city` and `leads.locationInfo` are declared everywhere and **never populated**. `getGeography` always returns empty | `useSessionTracker.ts` never sends them |
| 6 | 🟠 | The whole `exteriorPanoramas` read/write path is orphaned — `useBuilding.ts:95-109` hooks are imported by nothing | `convex/exteriorPanoramas.ts` |
| 7 | 🟠 | `leadCaptureConfig.gateBehavior` / `fields` / `delaySeconds` are in the schema, **written nowhere, read nowhere**, and there is no admin UI for them | `schema.ts:100-111` |
| 8 | 🟠 | `subscriptions.getUsage` N+1 scans every tour's scenes on every dashboard load | `convex/subscriptions.ts:72-80` |
| 9 | 🟡 | `useUTMCapture` runs on the landing page only; `getStoredUTMParams()` has zero call sites. UTM data is captured then discarded | `src/hooks/useUTMCapture.ts` |
| 10 | 🟡 | `CookieConsent.tsx` writes to localStorage only and never reaches Convex. No auditable consent record exists | `src/components/.../CookieConsent.tsx` |
| 11 | 🟡 | `consents.userId` is a required `v.id('users')` — anonymous visitors structurally cannot consent | `schema.ts:820` |
| 12 | 🟡 | `getSceneHeatmap` is dead code — defined, never called | `convex/analytics.ts:169` |
| 13 | 🟡 | `stagedImageStorageId` is written by the AI staging pipeline and **rendered by nothing** — zero `/src` matches | `convex/aiActions.ts:409` |
| 14 | 🟡 | The furnished-room viewer uses neither tracking hook — furnished sessions produce no analytics | `FurnishedRoomViewer` |
| 15 | 🟡 | `clerk-webhook` has **no signature verification** (svix not used) | `convex/http.ts` |
| 16 | ⚪ | `scene_exit` on unmount drops its `order` metadata that the switch branch includes | `usePanoramaTracking.ts:45-54` |
| 17 | ⚪ | `scenes.create` arg union omits `'floor_plan'` though the schema allows it | `convex/scenes.ts:95-97` |
| 18 | ⚪ | CSV export drops `metadata` — yaw/pitch/order/variant unexportable | `convex/analytics.ts:817` |

---

## 10. Privacy — DPDP & GDPR

### Where the law stands (verified Aug 2026)

- **DPDP Rules 2025 were notified 14 November 2025.**
- **13 Nov 2026** — Consent Manager registration deadline; the Data Protection Board can inquire and levy penalties.
- **13 May 2027** — notice, consent, data-principal rights, retention, breach obligations apply **in full, with no grace period**.
- Penalties: up to **₹250 crore** for a security-safeguards failure, **₹50 crore** residual for any other breach of the Act or Rules.

### Does fingerprinting need consent? Yes.

DPDP has no fingerprinting-specific clause, but the chain is unambiguous: "personal data" covers indirect and online identifiers including IP addresses, device identifiers and cookies; **a hashed fingerprint is still personal data** where re-identification is possible — and for a fingerprint you deliberately use to recognise returning visitors, it is by construction; behavioural analytics is **not** among DPDP's listed legitimate uses; therefore **consent is required, and pre-ticked boxes are explicitly non-compliant.**

The EU is stricter still. **EDPB Guidelines 2/2023** (v2.0, Oct 2024) explicitly bring device fingerprinting, tracking pixels and IP-based identification within ePrivacy Art. 5(3) — and Art. 5(3) is **not limited to personal data**, it protects the terminal equipment itself. "We only store a hash" is not a defence in the EU.

**Build to the EU standard once and India is covered.**

### What this means concretely

1. **Nothing but `sessionId` before consent.** No fingerprint computed, no cookie written, no `deviceId` generated. The FingerprintJS agent must not even be `load()`ed until "Accept".
2. **Granular purposes**, separately consentable: `essential`, `analytics`, `fingerprinting`, `geolocation`, `marketing`. Fingerprinting is its own toggle, not folded into "analytics".
3. **Auditable consent log** — the `visitorConsents` table above, append-only, with policy version. Note the irony: the consent record itself contains an IP hash and a device ID, so it is personal data you must protect and retain-limit.
4. **Withdrawal as easy as granting.** A persistent "Privacy" link in the tour viewer footer.
5. **Degrade gracefully.** An unconsented visitor is still counted — at `identityTier: 'session'`, `confidence: 55`, no persistence. You lose precision, not the funnel.
6. **Retention:** purge `visitorIdentities` untouched for 400 days; anonymise `analytics` rows older than 24 months by nulling `visitorId`.
7. **The phone number is the sensitive asset.** `phoneHash` in the analytics path; raw number only on `leads`/`customers`, visible only to the tour owner. Never log a raw number.
8. **Unverified numbers may not belong to the submitter.** Without OTP, someone can enter a spouse's, colleague's or stranger's number — that is personal data about a third party who never visited your site and never consented. Two consequences: (a) never send anything to a number that was merely submitted, beyond the enquiry the tour owner initiates; (b) an erasure request must be satisfiable by `phoneNormalized` lookup, which is another reason to index it. Add a one-line notice under the field: *"We'll share this with the property owner so they can contact you."*

**Spazeo is a Data Fiduciary, not a Consent Manager** — no registration needed. You must be able to *accept* consent signals from registered Consent Managers.

⚠️ **This section is engineering analysis, not legal advice.** Get Indian privacy counsel to review the consent notice text and the retention schedule before the May 2027 deadline.

---

## 11. Build order

| Phase | Work | Est. | Unblocks |
|---|---|---|---|
| **0** | 🔴 Fix the panorama de-dupe key (bug #1) | 2h | Any variant work at all |
| **0** | 🔴 Persist `sessionId` to sessionStorage (bug #2) | 1h | Every metric downstream |
| **0** | 🔴 Rate-limit the public mutations (bug #3) | 4h | Junk leads / poisoned analytics |
| **0** | **QR URL scheme + wire up `useUTMCapture` on the tour route** | 4h | **Blocks printing. Do this first.** |
| **1** | Consent banner → `visitorConsents` table, granular purposes | 1d | Legally required before fingerprinting |
| **1** | `deviceId` triple-write + `visitors` / `visitorIdentities` / `households` schema | 1.5d | Identity |
| **1** | FingerprintJS OSS integration + `visitors.resolve` | 1.5d | Identity |
| **1** | Vercel geo → `networkKey` in the Next.js layer | 0.5d | Household clustering |
| **2** | ~~Phone gate + OTP~~ **DROPPED** — public abuse risk | — | — |
| **2** | Wire optional lead sidebar; implement `gateBehavior` `after_delay`/`after_scenes`/`optional_sidebar` (bug #7) | 1d | Lead capture at intent |
| **2** | E.164 normalise + `phoneNormalized` index + `attachPhone()` in `leads.capture` | 1d | Phone as identity signal |
| **2** | `visitorMerges` + `visitors.merge` **and** `visitors.unmerge` (§4) | 1d | Reversible — unverified phone will mis-merge |
| **2** | Returning-visitor prefill + "Welcome back" resume | 0.5d | The payoff visitors feel |
| **3** | `scenes.variantKey` / `variantType` / `timeOfDay` + migration | 1d | Variants |
| **3** | Scene counting by variant group + denormalise count (§8.4, bug #8) | 1d | Plan limits stay sane |
| **3** | `TimeOfDaySwitcher` component + crossfade | 1.5d | The feature you asked for |
| **3** | `variant_switch` / `variant_view` events + analytics columns | 1d | Measurement |
| **4** | Dashboard: devices / estimated visitors / known contacts (§5) + household view | 2d | Value delivery |
| **4** | Variant engagement report | 1d | Sellable insight |
| **4** | Fix `buildingAnalytics` (bugs #4, #6) — wire the building viewer | 1.5d | Building telemetry |
| **5** | Micromarket waterfall + QR placement attribution report | 2d | The commercial payoff |

**Critical path ≈ 4 weeks.** Phase 0 is ~11 hours and should ship this week — three of those four items are live bugs corrupting data right now, and the fourth has a hard printing deadline.

---

## 12. Decisions (locked 2026-08-26)

> **Update 2026-08-26 evening:** **OTP / phone gate DROPPED.** Public OTP on an open tour is abusable (SMS toll fraud). No Firebase/MSG91/Clerk phone OTP. Identity max = device + fingerprint. Lead phone stays optional and unverified.

1. **OTP / phone gate: DROPPED.** Too open on public tours (SMS abuse). No phone OTP. Persistent identity = device + fingerprint; phone attaches on top when volunteered in the lead form, unverified, capped at 90–95 confidence. **Nothing scores 100 any more** — see §5 for what the dashboard may and may not claim.
2. **Gate default:** No phone gate. Optional lead sidebar only. `gateBehavior` remains in schema unused for OTP.
3. **Scene counting:** Option A — `countDistinct(variantKey)` for display and plan limits.
4. **sunset vs evening:** Keep both. UI maps `sunset` → Evening chip; no data migration.
5. **WhatsApp OTP:** N/A — dropped with all other OTP. No BSP, no SMS provider, no DLT registration.
6. **Household in CRM:** Broker/internal only ("N people from this network"). Never on public tour UI. Auto-hide when `type === 'carrier_gateway'`.
7. **Fingerprint Pro:** Revisit after 3 months of OSS data if fingerprint-only revisit attribution is &lt; ~40% or reps distrust "likely same person."

---

## Sources

Research current as of 2026-08-26.

- [FingerprintJS OSS](https://github.com/fingerprintjs/fingerprintjs) — MIT, accuracy and spoofing caveats from the project readme
- [MaxMind GeoIP accuracy, India](https://www.maxmind.com/en/geoip-accuracy-comparison?country=IN) — 42% city / 4% postal
- [CGNAT and mobile IP geolocation](https://ipregistry.co/blog/mobile-ip-geolocation-cgnat)
- [Vercel IP geolocation, all plans](https://vercel.com/changelog/ip-geolocation-now-available-for-all-plans) · [request headers](https://vercel.com/docs/headers/request-headers)
- [Convex: no client IP API](https://github.com/get-convex/convex-backend/issues/130) · [HTTP Actions](https://docs.convex.dev/functions/http-actions)
- [DPDP compliance timeline](https://www.india-briefing.com/news/india-dpdp-compliance-timeline-enforcement-2026-27-44740.html/) · [DPDP Schedule / penalties](https://www.dpdpa.com/theschedule.html)
- [EDPB Guidelines 2/2023 on ePrivacy Art. 5(3)](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)

*OTP-provider research (MSG91, Twilio Verify, Plivo, Firebase Phone Auth, WhatsApp BSPs, TRAI DLT registration) and the 99acres gating precedent are retained in git history at the commit that introduced this spec. Not needed unless the OTP decision is revisited.*
