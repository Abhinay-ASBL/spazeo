# Sales Mode Tour Viewer — Design

**Date:** 2026-04-16
**Scope:** v1 — Sales-guided tour with customer identity by phone

---

## Goal

Enable salespeople to conduct guided 360° tour walkthroughs for customers on-site. Salesperson enters customer's mobile number, system creates or finds the customer, tracks the entire guided session, and optionally captures post-tour feedback (interest level, notes). Customer identity persists across tours and visits, giving salespeople full context on returning customers.

## Non-goals (v1)

- Customer self-service portal (customers don't log in)
- SMS notifications to customers
- Multi-salesperson handoff mid-session
- Offline/PWA support for poor connectivity sites
- Customer merge/dedup (manual for now)

---

## URL & Auth

- **Sales URL:** `/tour/[slug]/sales` — requires Clerk authentication
- **Customer URL:** `/tour/[slug]` — unchanged, anonymous, existing flow
- Unauthenticated users hitting `/sales` route redirect to sign-in, then back to sales page
- Salesperson must be the tour owner OR a team member with `editor`+ role on that tour's owner account

---

## Data Model

### New table: `customers`

```
customers:
  phone: string           — normalized (digits only, no spaces/dashes/parens)
  name?: string           — captured on first or subsequent visit
  email?: string          — optional, captured if offered
  createdBy: Id<'users'>  — salesperson who first created this customer
  notes?: [{ text: string, createdAt: number }]

  indexes:
    by_phone: ['phone']
    by_createdBy: ['createdBy']
```

Phone normalization: strip all non-digit characters, store raw digits. Lookup always normalizes input before query. No country code enforcement in v1 — salesperson enters local format.

### New table: `salesSessions`

```
salesSessions:
  tourId: Id<'tours'>
  customerId: Id<'customers'>
  salespersonId: Id<'users'>
  sessionId: string          — matches analytics.sessionId for event linkage
  interestLevel?: 'hot' | 'warm' | 'cold'
  postTourNote?: string
  startedAt: number
  endedAt?: number

  indexes:
    by_tourId: ['tourId']
    by_customerId: ['customerId']
    by_salespersonId: ['salespersonId']
    by_sessionId: ['sessionId']
```

### Existing table extensions

**`leads`** — add optional field:
```
  customerId?: Id<'customers'>
```
No new index needed (lookup goes customer → leads via `by_tourId` + filter, or future `by_customerId` index if volume warrants).

**`analytics`** — no schema change. Sales events use existing `metadata` field:
```
metadata: {
  salesMode: true,
  customerId: string,
  salespersonId: string,
}
```

---

## Sales Session Flow

### 1. Phone Input Screen

Salesperson opens `/tour/[slug]/sales`. After auth check:

- Clean screen with tour title + thumbnail at top
- Single phone input field (large, mobile-friendly, numeric keyboard hint)
- "Look Up Customer" button
- Phone normalized on submit → query `customers.by_phone`

### 2. Customer Summary Card

**If returning customer found:**
- Card shows: name (or "Unknown"), phone, total visits count, last visit date, list of tours visited (tour titles)
- "Start Tour" button (primary gold)
- "Edit Name" inline toggle if name missing

**If new customer (phone not found):**
- Card shows: "New customer" badge, phone number
- Optional name input (can skip)
- "Start Tour" button

On "Start Tour":
- If new: `customers.create({ phone, name?, createdBy })` → get `customerId`
- Create `salesSessions.create({ tourId, customerId, salespersonId, sessionId, startedAt })`
- Initialize `useSessionTracker` with `tourId`
- Navigate to tour viewer

### 3. Tour Walkthrough

- Same `PanoramaViewer` component, same scene navigation, same hotspots
- `useSessionTracker` + `usePanoramaTracking` hooks active (reuse from lead tracking feature)
- Events include `metadata: { salesMode: true, customerId, salespersonId }`
- No lead capture form ("Get in Touch" button hidden in sales mode)
- Top bar shows: customer name/phone + "End Tour" button

### 4. Post-Tour Form (on "End Tour")

Overlay appears:
- **Interest level:** 3 pill buttons — Hot (coral), Warm (gold), Cold (grey). Optional, default none.
- **Customer name:** pre-filled if known, editable. If was empty, prompt to fill.
- **Note:** single textarea, optional. Placeholder: "Quick observations about this visit..."
- **"Save & Finish"** button → patches `salesSessions` with `interestLevel`, `postTourNote`, `endedAt`
- **"Skip"** link → just sets `endedAt`, no feedback captured
- Redirect to `/tour/[slug]/sales` (ready for next customer) or dashboard

---

## Backend Functions

### `convex/customers.ts` (new)

| Function | Type | Purpose |
|---|---|---|
| `findByPhone` | query | Normalize phone → lookup by index. Auth required. Returns customer + visit summary (count, last visit, tour titles). |
| `create` | mutation | Create customer with phone + optional name. Auth required. Checks duplicate phone first. |
| `update` | mutation | Update name/email/notes. Auth required. |
| `getWithHistory` | query | Full customer profile: customer doc + all salesSessions + linked leads across all tours. For dashboard view. |

### `convex/salesSessions.ts` (new)

| Function | Type | Purpose |
|---|---|---|
| `create` | mutation | Start session. Auth required, validates salesperson owns/has access to tour. |
| `end` | mutation | Set endedAt + optional interestLevel + postTourNote. |
| `getByTour` | query | All sales sessions for a tour. Auth required (tour owner). |
| `getByCustomer` | query | All sessions for a customer. Auth required. |
| `getBySession` | query | Single session by sessionId. Auth required. |

### `convex/leads.ts` (extend)

- `capture` mutation: if `customerId` provided, store on lead.
- No other changes.

---

## Frontend Components

### New page: `src/app/tour/[slug]/sales/page.tsx`

- Clerk auth gate (redirect if not signed in)
- State machine: `phone_input` → `customer_summary` → `tour_active` → `post_tour`
- Wraps existing `PanoramaViewer` in tour_active state
- Hides lead capture panel
- Shows sales-mode top bar (customer info + end button)

### New components:

**`src/components/sales/PhoneInput.tsx`**
- Large numeric input, country code prefix selector (optional v2), normalize on change
- Submit button

**`src/components/sales/CustomerCard.tsx`**
- Shows customer summary: name, phone, visit count, last visit, tour list
- "Start Tour" button
- Inline name edit

**`src/components/sales/PostTourForm.tsx`**
- Interest level pills, name field, note textarea
- Save & Skip buttons

**`src/components/sales/SalesTopBar.tsx`**
- Customer name/phone display, tour title, "End Tour" button
- Replaces default tour header in sales mode

### Dashboard additions (v1 minimal):

- `/leads` page: if lead has `customerId`, show link to customer
- `/analytics` page: sales sessions filterable in sessions table (salesMode flag in metadata)

---

## Analytics Integration

Reuse existing tracking infrastructure from lead activity tracking feature:

- `useSessionTracker(tourId)` — same hook, same buffer/flush
- `usePanoramaTracking(...)` — same scene/hotspot/yaw tracking
- Only difference: events carry `metadata.salesMode`, `metadata.customerId`, `metadata.salespersonId`
- Existing queries (`getSessionsByTour`, `getBySession`, `getYawHeatmap`) work unchanged — filter by sessionId
- `salesSessions.sessionId` links analytics events to the sales session record

---

## Privacy & Data

- Customer phone stored as digits only
- No SMS sent in v1
- Salesperson responsible for customer consent (verbal, on-site)
- Customer data visible only to tour owner + team members
- Phone not exposed in analytics queries — only via customer profile

---

## Error Handling

- Duplicate phone on create: return existing customer (upsert-like behavior)
- Session end without post-tour: `endedAt` set on `beforeunload` / visibility hidden, feedback skipped
- Network loss during tour: events buffered client-side (existing useSessionTracker behavior), flushed on reconnect
- Auth expired mid-tour: tour continues (PanoramaViewer doesn't need auth), post-tour form fails gracefully with retry

---

## Implementation Phases

1. **Schema + backend** — `customers` + `salesSessions` tables, CRUD functions, `leads.customerId` field
2. **Phone input + customer lookup** — `PhoneInput`, `CustomerCard`, phone normalization, `findByPhone` wiring
3. **Sales tour page** — `/tour/[slug]/sales/page.tsx` state machine, auth gate, PanoramaViewer integration with sales metadata
4. **Post-tour form** — `PostTourForm`, session end mutation, redirect
5. **Sales top bar** — `SalesTopBar` component replacing default header in sales mode
6. **Dashboard integration** — customer links on leads, sales filter on sessions table

Each phase ships independently.
