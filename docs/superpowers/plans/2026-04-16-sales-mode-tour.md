# Sales Mode Tour Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable salespeople to conduct auth-gated guided tour walkthroughs at `/tour/[slug]/sales`, identifying customers by phone number, tracking sessions with full analytics, and capturing post-tour interest/notes.

**Architecture:** Two new Convex tables (`customers`, `salesSessions`) + new Next.js page at `/tour/[slug]/sales/page.tsx` with a 4-state machine (phone_input → customer_summary → tour_active → post_tour). Reuses existing `PanoramaViewer`, `useSessionTracker`, `usePanoramaTracking`. Events tagged with `salesMode: true` metadata for filtering.

**Tech Stack:** Convex (schema, queries, mutations), Next.js 16 App Router, Clerk auth, React 19, Tailwind v4, existing panorama tracking hooks.

**Spec:** `docs/superpowers/specs/2026-04-16-sales-mode-tour-design.md`

---

## File Structure

**Backend (Convex)**
- Modify: `convex/schema.ts` — add `customers` + `salesSessions` tables, add `leads.customerId`
- Create: `convex/customers.ts` — CRUD + phone lookup + history
- Create: `convex/salesSessions.ts` — session lifecycle + queries
- Modify: `convex/leads.ts` — accept optional `customerId` in `capture`

**Frontend**
- Create: `src/app/tour/[slug]/sales/page.tsx` — sales mode page (state machine)
- Create: `src/components/sales/PhoneInput.tsx` — phone input with normalization
- Create: `src/components/sales/CustomerCard.tsx` — returning/new customer summary
- Create: `src/components/sales/PostTourForm.tsx` — interest + note capture
- Create: `src/components/sales/SalesTopBar.tsx` — in-tour header bar
- Create: `src/lib/phone.ts` — phone normalization utility

**No test runner configured. Verification = `npx convex dev --once` + `npm run lint` + manual.**

---

## Task 1: Phone normalization utility

**Files:**
- Create: `src/lib/phone.ts`

- [ ] **Step 1: Create phone utility**

Create `src/lib/phone.ts`:

```ts
/**
 * Normalize phone number to digits only.
 * Strips spaces, dashes, parens, dots, plus sign.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

/**
 * Format phone for display: add spaces every 3-4 digits.
 * Input must be digits-only (from normalizePhone).
 */
export function formatPhone(digits: string): string {
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 10)
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  // 11+ digits (with country code)
  return `+${digits.slice(0, digits.length - 10)} ${digits.slice(-10, -7)} ${digits.slice(-7, -4)} ${digits.slice(-4)}`
}

/**
 * Validate phone has minimum digits.
 */
export function isValidPhone(digits: string): boolean {
  return digits.length >= 7 && digits.length <= 15
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/lib/phone.ts
git commit -m "feat(lib): add phone normalization utility"
```

---

## Task 2: Schema — `customers` + `salesSessions` tables + `leads.customerId`

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add `customers` table**

In `convex/schema.ts`, after the `dailyAnalytics` table definition (around line 311), add:

```ts
  customers: defineTable({
    phone: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    createdBy: v.id('users'),
    notes: v.optional(
      v.array(v.object({ text: v.string(), createdAt: v.number() }))
    ),
  })
    .index('by_phone', ['phone'])
    .index('by_createdBy', ['createdBy']),

  salesSessions: defineTable({
    tourId: v.id('tours'),
    customerId: v.id('customers'),
    salespersonId: v.id('users'),
    sessionId: v.string(),
    interestLevel: v.optional(
      v.union(v.literal('hot'), v.literal('warm'), v.literal('cold'))
    ),
    postTourNote: v.optional(v.string()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index('by_tourId', ['tourId'])
    .index('by_customerId', ['customerId'])
    .index('by_salespersonId', ['salespersonId'])
    .index('by_sessionId', ['sessionId']),
```

- [ ] **Step 2: Add `customerId` to `leads` table**

In the `leads` table definition (around line 233), after the `sessionId` field, add:

```ts
    customerId: v.optional(v.id('customers')),
```

No new index needed for v1.

- [ ] **Step 3: Push + commit**

```bash
npx convex dev --once
git add convex/schema.ts convex/_generated
git commit -m "feat(schema): add customers + salesSessions tables, leads.customerId"
```

---

## Task 3: Backend — `convex/customers.ts`

**Files:**
- Create: `convex/customers.ts`

- [ ] **Step 1: Create the file**

Create `convex/customers.ts`:

```ts
import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

export const findByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const digits = normalizePhone(args.phone)
    if (digits.length < 7) return null

    const customer = await ctx.db
      .query('customers')
      .withIndex('by_phone', (q) => q.eq('phone', digits))
      .unique()

    if (!customer) return null

    // Build visit summary
    const sessions = await ctx.db
      .query('salesSessions')
      .withIndex('by_customerId', (q) => q.eq('customerId', customer._id))
      .collect()

    const tourIds = [...new Set(sessions.map((s) => s.tourId))]
    const tours: Array<{ id: string; title: string }> = []
    for (const tid of tourIds) {
      const t = await ctx.db.get(tid)
      if (t) tours.push({ id: t._id, title: t.title })
    }

    const lastSession = sessions.length > 0
      ? sessions.sort((a, b) => b.startedAt - a.startedAt)[0]
      : null

    return {
      customer,
      visitCount: sessions.length,
      lastVisitAt: lastSession?.startedAt ?? null,
      toursVisited: tours,
    }
  },
})

export const create = mutation({
  args: {
    phone: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const digits = normalizePhone(args.phone)
    if (digits.length < 7) throw new Error('Invalid phone number')

    // Check for existing customer with this phone
    const existing = await ctx.db
      .query('customers')
      .withIndex('by_phone', (q) => q.eq('phone', digits))
      .unique()

    if (existing) {
      // Update name if provided and currently missing
      if (args.name && !existing.name) {
        await ctx.db.patch(existing._id, { name: args.name })
      }
      return existing._id
    }

    return await ctx.db.insert('customers', {
      phone: digits,
      name: args.name,
      email: args.email,
      createdBy: user._id,
    })
  },
})

export const update = mutation({
  args: {
    customerId: v.id('customers'),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const customer = await ctx.db.get(args.customerId)
    if (!customer) throw new Error('Customer not found')

    const patch: Record<string, string> = {}
    if (args.name !== undefined) patch.name = args.name
    if (args.email !== undefined) patch.email = args.email

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.customerId, patch)
    }
  },
})

export const getWithHistory = query({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    const customer = await ctx.db.get(args.customerId)
    if (!customer) return null

    const sessions = await ctx.db
      .query('salesSessions')
      .withIndex('by_customerId', (q) => q.eq('customerId', customer._id))
      .collect()

    // Enrich sessions with tour titles
    const enriched = []
    for (const s of sessions) {
      const tour = await ctx.db.get(s.tourId)
      enriched.push({
        ...s,
        tourTitle: tour?.title ?? 'Unknown tour',
        tourSlug: tour?.slug ?? '',
      })
    }

    return {
      customer,
      sessions: enriched.sort((a, b) => b.startedAt - a.startedAt),
      totalVisits: sessions.length,
    }
  },
})
```

- [ ] **Step 2: Push + lint + commit**

```bash
npx convex dev --once
npm run lint
git add convex/customers.ts convex/_generated
git commit -m "feat(customers): CRUD + phone lookup + history"
```

---

## Task 4: Backend — `convex/salesSessions.ts`

**Files:**
- Create: `convex/salesSessions.ts`

- [ ] **Step 1: Create the file**

Create `convex/salesSessions.ts`:

```ts
import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const create = mutation({
  args: {
    tourId: v.id('tours'),
    customerId: v.id('customers'),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    // Verify salesperson has access to tour
    const tour = await ctx.db.get(args.tourId)
    if (!tour) throw new Error('Tour not found')
    if (tour.userId !== user._id) throw new Error('Not authorized')

    return await ctx.db.insert('salesSessions', {
      tourId: args.tourId,
      customerId: args.customerId,
      salespersonId: user._id,
      sessionId: args.sessionId,
      startedAt: Date.now(),
    })
  },
})

export const end = mutation({
  args: {
    salesSessionId: v.id('salesSessions'),
    interestLevel: v.optional(
      v.union(v.literal('hot'), v.literal('warm'), v.literal('cold'))
    ),
    postTourNote: v.optional(v.string()),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.salesSessionId)
    if (!session) throw new Error('Session not found')

    await ctx.db.patch(args.salesSessionId, {
      endedAt: Date.now(),
      interestLevel: args.interestLevel,
      postTourNote: args.postTourNote,
    })

    // Update customer name if provided
    if (args.customerName) {
      const customer = await ctx.db.get(session.customerId)
      if (customer && !customer.name) {
        await ctx.db.patch(session.customerId, { name: args.customerName })
      }
    }
  },
})

export const getByTour = query({
  args: { tourId: v.id('tours') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const tour = await ctx.db.get(args.tourId)
    if (!tour || tour.userId !== user._id) return []

    const sessions = await ctx.db
      .query('salesSessions')
      .withIndex('by_tourId', (q) => q.eq('tourId', args.tourId))
      .collect()

    const enriched = []
    for (const s of sessions) {
      const customer = await ctx.db.get(s.customerId)
      enriched.push({
        ...s,
        customerName: customer?.name ?? 'Unknown',
        customerPhone: customer?.phone ?? '',
      })
    }

    return enriched.sort((a, b) => b.startedAt - a.startedAt)
  },
})

export const getByCustomer = query({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return []

    const sessions = await ctx.db
      .query('salesSessions')
      .withIndex('by_customerId', (q) => q.eq('customerId', args.customerId))
      .collect()

    const enriched = []
    for (const s of sessions) {
      const tour = await ctx.db.get(s.tourId)
      enriched.push({
        ...s,
        tourTitle: tour?.title ?? 'Unknown',
        tourSlug: tour?.slug ?? '',
      })
    }

    return enriched.sort((a, b) => b.startedAt - a.startedAt)
  },
})

export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null)
    if (!identity) return null

    return await ctx.db
      .query('salesSessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .unique()
  },
})
```

- [ ] **Step 2: Push + lint + commit**

```bash
npx convex dev --once
npm run lint
git add convex/salesSessions.ts convex/_generated
git commit -m "feat(salesSessions): session lifecycle + queries"
```

---

## Task 5: Backend — extend `leads.capture` with `customerId`

**Files:**
- Modify: `convex/leads.ts`

- [ ] **Step 1: Add `customerId` to `capture` args**

In `convex/leads.ts`, locate the `capture` mutation's args (around line 162-186). After `sessionId: v.optional(v.string())`, add:

```ts
    customerId: v.optional(v.id('customers')),
```

The handler uses `...args` spread into `ctx.db.insert('leads', { ...args, status: 'new' })`, so the new field passes through automatically.

- [ ] **Step 2: Push + commit**

```bash
npx convex dev --once
git add convex/leads.ts convex/_generated
git commit -m "feat(leads): accept optional customerId on capture"
```

---

## Task 6: `PhoneInput` component

**Files:**
- Create: `src/components/sales/PhoneInput.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { Phone, ArrowRight, Loader2 } from 'lucide-react'
import { normalizePhone, isValidPhone } from '@/lib/phone'

interface Props {
  onSubmit: (phone: string) => void
  loading?: boolean
}

export function PhoneInput({ onSubmit, loading = false }: Props) {
  const [raw, setRaw] = useState('')

  const digits = normalizePhone(raw)
  const valid = isValidPhone(digits)

  const handleSubmit = () => {
    if (!valid || loading) return
    onSubmit(digits)
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
      >
        <Phone size={28} style={{ color: '#D4A017' }} />
      </div>

      <div className="text-center">
        <h2
          className="text-lg font-bold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
        >
          Customer phone number
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#A8A29E' }}>
          Enter mobile number to start guided tour
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <input
          type="tel"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Enter mobile number"
          className="w-full h-12 px-4 rounded-lg text-base outline-none text-center tracking-wider"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            color: '#F5F3EF',
            fontFamily: 'var(--font-dmsans)',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
          autoFocus
        />

        <button
          disabled={!valid || loading}
          onClick={handleSubmit}
          className="w-full h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Look Up Customer
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Lint + commit**

```bash
mkdir -p src/components/sales
npm run lint
git add src/components/sales/PhoneInput.tsx
git commit -m "feat(sales): add PhoneInput component"
```

---

## Task 7: `CustomerCard` component

**Files:**
- Create: `src/components/sales/CustomerCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { User, MapPin, Clock, Play, Edit3 } from 'lucide-react'
import { formatPhone } from '@/lib/phone'

interface CustomerData {
  customer: {
    _id: string
    phone: string
    name?: string
    email?: string
  }
  visitCount: number
  lastVisitAt: number | null
  toursVisited: Array<{ id: string; title: string }>
}

interface Props {
  data: CustomerData | null
  phone: string
  onStartTour: (customerId: string, customerName?: string) => void
  onBack: () => void
  isNew: boolean
}

export function CustomerCard({ data, phone, onStartTour, onBack, isNew }: Props) {
  const [name, setName] = useState(data?.customer.name ?? '')

  const handleStart = () => {
    if (isNew) {
      onStartTour('', name.trim() || undefined)
    } else if (data) {
      onStartTour(data.customer._id, name.trim() || undefined)
    }
  }

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
      style={{
        backgroundColor: '#12100E',
        border: '1px solid rgba(212,160,23,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: isNew ? 'rgba(45,212,191,0.12)' : 'rgba(212,160,23,0.12)' }}
        >
          <User size={22} style={{ color: isNew ? '#2DD4BF' : '#D4A017' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}>
            {isNew ? 'New customer' : (data?.customer.name ?? 'Returning customer')}
          </p>
          <p className="text-xs" style={{ color: '#A8A29E' }}>{formatPhone(phone)}</p>
        </div>
        {isNew && (
          <span
            className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(45,212,191,0.15)', color: '#2DD4BF' }}
          >
            NEW
          </span>
        )}
      </div>

      {/* Name input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs flex items-center gap-1" style={{ color: '#A8A29E' }}>
          <Edit3 size={12} />
          {isNew ? 'Customer name (optional)' : 'Name'}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
          className="w-full h-10 px-3 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            color: '#F5F3EF',
            fontFamily: 'var(--font-dmsans)',
          }}
        />
      </div>

      {/* Visit history (returning only) */}
      {!isNew && data && data.visitCount > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 text-xs" style={{ color: '#A8A29E' }}>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {data.visitCount} visit{data.visitCount !== 1 ? 's' : ''}
            </span>
            {data.lastVisitAt && (
              <span>Last: {new Date(data.lastVisitAt).toLocaleDateString()}</span>
            )}
          </div>
          {data.toursVisited.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.toursVisited.map((t) => (
                <span
                  key={t.id}
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(212,160,23,0.08)',
                    color: '#A8A29E',
                    border: '1px solid rgba(212,160,23,0.1)',
                  }}
                >
                  <MapPin size={10} className="inline mr-0.5" style={{ verticalAlign: '-1px' }} />
                  {t.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-1">
        <button
          onClick={onBack}
          className="flex-1 h-11 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'transparent',
            border: '1.5px solid rgba(212,160,23,0.3)',
            color: '#D4A017',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          Back
        </button>
        <button
          onClick={handleStart}
          className="flex-[2] h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <Play size={16} />
          Start Tour
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/sales/CustomerCard.tsx
git commit -m "feat(sales): add CustomerCard summary component"
```

---

## Task 8: `PostTourForm` component

**Files:**
- Create: `src/components/sales/PostTourForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { Flame, Sun, Snowflake, Loader2 } from 'lucide-react'

type InterestLevel = 'hot' | 'warm' | 'cold'

interface Props {
  customerName?: string
  onSave: (data: {
    interestLevel?: InterestLevel
    postTourNote?: string
    customerName?: string
  }) => void
  onSkip: () => void
  saving?: boolean
}

const LEVELS: Array<{
  value: InterestLevel
  label: string
  icon: typeof Flame
  color: string
  bg: string
}> = [
  { value: 'hot', label: 'Hot', icon: Flame, color: '#FB7A54', bg: 'rgba(251,122,84,0.15)' },
  { value: 'warm', label: 'Warm', icon: Sun, color: '#D4A017', bg: 'rgba(212,160,23,0.15)' },
  { value: 'cold', label: 'Cold', icon: Snowflake, color: '#A8A29E', bg: 'rgba(168,162,158,0.15)' },
]

export function PostTourForm({ customerName, onSave, onSkip, saving = false }: Props) {
  const [interest, setInterest] = useState<InterestLevel | undefined>(undefined)
  const [name, setName] = useState(customerName ?? '')
  const [note, setNote] = useState('')

  const handleSave = () => {
    if (saving) return
    onSave({
      interestLevel: interest,
      postTourNote: note.trim() || undefined,
      customerName: name.trim() || undefined,
    })
  }

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
      style={{
        backgroundColor: '#12100E',
        border: '1px solid rgba(212,160,23,0.15)',
      }}
    >
      <div className="text-center">
        <h2
          className="text-lg font-bold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
        >
          Tour complete
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#A8A29E' }}>
          Quick notes about this visit (optional)
        </p>
      </div>

      {/* Interest level */}
      <div className="flex flex-col gap-2">
        <label className="text-xs" style={{ color: '#A8A29E' }}>Interest level</label>
        <div className="flex gap-2">
          {LEVELS.map((l) => {
            const Icon = l.icon
            const active = interest === l.value
            return (
              <button
                key={l.value}
                onClick={() => setInterest(active ? undefined : l.value)}
                className="flex-1 h-10 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                style={{
                  backgroundColor: active ? l.bg : 'transparent',
                  border: active ? `1.5px solid ${l.color}` : '1px solid rgba(212,160,23,0.12)',
                  color: active ? l.color : '#6B6560',
                }}
              >
                <Icon size={14} />
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Customer name */}
      {!customerName && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs" style={{ color: '#A8A29E' }}>Customer name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            className="w-full h-10 px-3 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: '#1B1916',
              border: '1px solid rgba(212,160,23,0.12)',
              color: '#F5F3EF',
              fontFamily: 'var(--font-dmsans)',
            }}
          />
        </div>
      )}

      {/* Note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs" style={{ color: '#A8A29E' }}>Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Quick observations about this visit..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            color: '#F5F3EF',
            fontFamily: 'var(--font-dmsans)',
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save & Finish'}
        </button>
        <button
          onClick={onSkip}
          disabled={saving}
          className="w-full h-9 text-xs"
          style={{ color: '#6B6560' }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/sales/PostTourForm.tsx
git commit -m "feat(sales): add PostTourForm component"
```

---

## Task 9: `SalesTopBar` component

**Files:**
- Create: `src/components/sales/SalesTopBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { Phone, X } from 'lucide-react'
import { formatPhone } from '@/lib/phone'

interface Props {
  customerName?: string
  customerPhone: string
  tourTitle: string
  onEndTour: () => void
}

export function SalesTopBar({ customerName, customerPhone, tourTitle, onEndTour }: Props) {
  return (
    <div
      className="absolute top-0 left-0 w-full h-14 z-20 flex items-center justify-between px-4"
      style={{
        background: 'linear-gradient(to bottom, rgba(10,9,8,0.85), rgba(10,9,8,0.4))',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(212,160,23,0.15)' }}
        >
          <Phone size={14} style={{ color: '#D4A017' }} />
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}>
            {customerName || formatPhone(customerPhone)}
          </p>
          <p className="text-[10px]" style={{ color: '#6B6560' }}>{tourTitle}</p>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-2"
          style={{ backgroundColor: 'rgba(212,160,23,0.15)', color: '#D4A017' }}
        >
          SALES MODE
        </span>
      </div>

      <button
        onClick={onEndTour}
        className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium"
        style={{
          backgroundColor: 'rgba(248,113,113,0.15)',
          color: '#F87171',
          border: '1px solid rgba(248,113,113,0.3)',
        }}
      >
        <X size={14} />
        End Tour
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/sales/SalesTopBar.tsx
git commit -m "feat(sales): add SalesTopBar component"
```

---

## Task 10: Sales mode page — `/tour/[slug]/sales/page.tsx`

**Files:**
- Create: `src/app/tour/[slug]/sales/page.tsx`

This is the central page. It has a 4-state machine: `phone_input` → `customer_summary` → `tour_active` → `post_tour`.

- [ ] **Step 1: Create the page**

```tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useQuery, useMutation } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSessionTracker } from '@/hooks/useSessionTracker'
import { usePanoramaTracking } from '@/hooks/usePanoramaTracking'
import { useViewerStore } from '@/hooks/useViewerStore'
import { PhoneInput } from '@/components/sales/PhoneInput'
import { CustomerCard } from '@/components/sales/CustomerCard'
import { PostTourForm } from '@/components/sales/PostTourForm'
import { SalesTopBar } from '@/components/sales/SalesTopBar'
import { HotspotInfoPanel } from '@/components/viewer/HotspotInfoPanel'
import { HotspotVideoModal } from '@/components/viewer/HotspotVideoModal'

const PanoramaViewer = dynamic(
  () => import('@/components/viewer/PanoramaViewer').then((m) => m.PanoramaViewer),
  { ssr: false }
)

type ViewState = 'phone_input' | 'customer_summary' | 'tour_active' | 'post_tour'

export default function SalesModePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, isLoaded: clerkLoaded } = useUser()

  const tourData = useQuery(api.tours.getBySlugWithScenes, { slug })
  const findCustomer = useQuery(api.customers.findByPhone, 
    phoneDigits ? { phone: phoneDigits } : 'skip'
  )

  // State machine
  const [viewState, setViewState] = useState<ViewState>('phone_input')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [customerResult, setCustomerResult] = useState<any>(null)
  const [customerId, setCustomerId] = useState<Id<'customers'> | null>(null)
  const [salesSessionId, setSalesSessionId] = useState<Id<'salesSessions'> | null>(null)
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeHotspotId = useViewerStore((s) => s.activeHotspotId)
  const setActiveHotspot = useViewerStore((s) => s.setActiveHotspot)
  const videoModalUrl = useViewerStore((s) => s.videoModalUrl)
  const videoModalTitle = useViewerStore((s) => s.videoModalTitle)
  const closeVideoModal = useViewerStore((s) => s.closeVideoModal)

  const createCustomer = useMutation(api.customers.create)
  const updateCustomer = useMutation(api.customers.update)
  const createSalesSession = useMutation(api.salesSessions.create)
  const endSalesSession = useMutation(api.salesSessions.end)

  const tourId = tourData && '_id' in tourData ? (tourData._id as Id<'tours'>) : null
  const tour = tourData
  const scenes = tour?.scenes ?? []
  const activeScene = scenes.find((s: { _id: string }) => s._id === activeSceneId) ?? scenes[0] ?? null
  const activeHotspots = (activeScene as any)?.hotspots ?? []
  const activeHotspot = activeHotspotId
    ? (activeHotspots.find((h: { _id: string }) => h._id === activeHotspotId) ?? null)
    : null

  // Tracking — only active during tour
  const trackingTourId = viewState === 'tour_active' ? tourId : null
  const { sessionId, trackEvent } = useSessionTracker(trackingTourId)

  const viewDirectionGetterRef = useRef<
    null | (() => { yaw: number; pitch: number; zoom?: number } | null)
  >(null)
  const getViewDirection = useCallback(
    () => (viewDirectionGetterRef.current ? viewDirectionGetterRef.current() : null),
    []
  )
  const { onDragStart: panoOnDragStart, onDragEnd: panoOnDragEnd } = usePanoramaTracking({
    sceneId: viewState === 'tour_active' ? (activeSceneId as Id<'scenes'> | null) : null,
    sceneOrder: typeof activeScene?.order === 'number' ? activeScene.order : undefined,
    getViewDirection,
    trackEvent,
  })

  /* ── Phone lookup ── */
  const handlePhoneLookup = useCallback(
    async (digits: string) => {
      setPhoneDigits(digits)
      setLookingUp(true)
      // findByPhone query will reactively update; just wait briefly
      // Actually, since findCustomer is a reactive query keyed on phoneDigits,
      // we set the state and let React re-render with the query result.
      // Move to customer_summary after a tick.
      setTimeout(() => {
        setViewState('customer_summary')
        setLookingUp(false)
      }, 500)
    },
    []
  )

  /* ── Start tour ── */
  const handleStartTour = useCallback(
    async (existingCustomerId: string, customerName?: string) => {
      if (!tourId) return
      try {
        let cid: Id<'customers'>
        if (existingCustomerId) {
          cid = existingCustomerId as Id<'customers'>
          if (customerName) {
            await updateCustomer({ customerId: cid, name: customerName })
          }
        } else {
          cid = await createCustomer({ phone: phoneDigits, name: customerName })
        }
        setCustomerId(cid)

        const ssId = await createSalesSession({
          tourId,
          customerId: cid,
          sessionId,
        })
        setSalesSessionId(ssId)

        // Set first scene
        if (scenes.length > 0) {
          setActiveSceneId(scenes[0]._id)
        }

        setViewState('tour_active')

        // Track tour_view with sales metadata
        trackEvent({
          event: 'tour_view',
          metadata: {
            salesMode: true,
            customerId: cid,
            referrer: 'sales_mode',
          },
        })
      } catch (err) {
        toast.error('Failed to start tour session')
        console.error(err)
      }
    },
    [tourId, phoneDigits, sessionId, scenes, createCustomer, updateCustomer, createSalesSession, trackEvent]
  )

  /* ── End tour ── */
  const handleEndTour = useCallback(() => {
    setViewState('post_tour')
  }, [])

  /* ── Post-tour save ── */
  const handlePostTourSave = useCallback(
    async (data: {
      interestLevel?: 'hot' | 'warm' | 'cold'
      postTourNote?: string
      customerName?: string
    }) => {
      if (!salesSessionId) return
      setSaving(true)
      try {
        await endSalesSession({
          salesSessionId,
          interestLevel: data.interestLevel,
          postTourNote: data.postTourNote,
          customerName: data.customerName,
        })
        toast.success('Session saved!')
        // Reset for next customer
        setViewState('phone_input')
        setPhoneDigits('')
        setCustomerId(null)
        setSalesSessionId(null)
        setActiveSceneId(null)
      } catch {
        toast.error('Failed to save session')
      } finally {
        setSaving(false)
      }
    },
    [salesSessionId, endSalesSession]
  )

  const handlePostTourSkip = useCallback(async () => {
    if (salesSessionId) {
      await endSalesSession({ salesSessionId }).catch(() => {})
    }
    setViewState('phone_input')
    setPhoneDigits('')
    setCustomerId(null)
    setSalesSessionId(null)
    setActiveSceneId(null)
  }, [salesSessionId, endSalesSession])

  /* ── Hotspot click ── */
  const handleHotspotClick = useCallback(
    (hotspot: { type: string; targetSceneId?: string; _id?: string; content?: string; videoUrl?: string; title?: string }) => {
      trackEvent({
        event: 'hotspot_click',
        sceneId: activeSceneId as Id<'scenes'> | undefined,
        metadata: {
          hotspotId: hotspot._id,
          hotspotType: hotspot.type,
          targetSceneId: hotspot.targetSceneId,
          salesMode: true,
        },
      })

      if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
        const hasInfo = !!(hotspot.title || (hotspot as any).description)
        if (hasInfo && hotspot._id) {
          setActiveHotspot(hotspot._id)
        } else {
          setActiveSceneId(hotspot.targetSceneId)
        }
        return
      }
      if (hotspot.type === 'media') {
        const videoSrc = (hotspot as any).videoUrl || hotspot.content
        if (videoSrc) {
          useViewerStore.getState().openVideoModal(videoSrc, hotspot.title)
          return
        }
      }
      if (hotspot._id) setActiveHotspot(hotspot._id)
    },
    [setActiveHotspot, trackEvent, activeSceneId]
  )

  /* ── Auth + loading gates ── */
  if (!clerkLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0A0908' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    )
  }

  if (!user) {
    // Redirect to sign-in (Clerk middleware handles this, but as fallback)
    router.push(`/sign-in?redirect_url=/tour/${slug}/sales`)
    return null
  }

  if (tourData === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0A0908' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    )
  }

  if (tourData === null) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#0A0908' }}>
        <p className="text-lg font-semibold" style={{ color: '#F5F3EF' }}>Tour not found</p>
      </div>
    )
  }

  /* ── Render by state ── */
  if (viewState === 'phone_input') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <div className="flex flex-col items-center gap-8 px-6">
          <p className="text-xs font-medium" style={{ color: '#6B6560' }}>
            {tourData.title}
          </p>
          <PhoneInput onSubmit={handlePhoneLookup} loading={lookingUp} />
        </div>
      </div>
    )
  }

  if (viewState === 'customer_summary') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <CustomerCard
          data={findCustomer ?? null}
          phone={phoneDigits}
          isNew={!findCustomer}
          onStartTour={handleStartTour}
          onBack={() => {
            setViewState('phone_input')
            setPhoneDigits('')
          }}
        />
      </div>
    )
  }

  if (viewState === 'post_tour') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <PostTourForm
          customerName={findCustomer?.customer.name}
          onSave={handlePostTourSave}
          onSkip={handlePostTourSkip}
          saving={saving}
        />
      </div>
    )
  }

  /* ── tour_active ── */
  const proxyUrl = (url: string) => url

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#0A0908' }}>
      <SalesTopBar
        customerName={findCustomer?.customer.name}
        customerPhone={phoneDigits}
        tourTitle={tourData.title}
        onEndTour={handleEndTour}
      />

      {activeScene?.imageUrl ? (
        <PanoramaViewer
          imageUrl={proxyUrl(activeScene.imageUrl as string) ?? ''}
          height="100vh"
          hotspots={activeHotspots as any[]}
          onHotspotClick={handleHotspotClick as any}
          autoRotate={false}
          zoomLevel={1}
          onViewDirectionReady={(getter) => {
            viewDirectionGetterRef.current = getter
          }}
          onDragStart={panoOnDragStart}
          onDragEnd={panoOnDragEnd}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <p style={{ color: '#6B6560' }}>No scenes available</p>
        </div>
      )}

      {/* Scene navigator */}
      {scenes.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 px-3 py-2 rounded-full"
          style={{ backgroundColor: 'rgba(10,9,8,0.7)', backdropFilter: 'blur(8px)' }}
        >
          {scenes.map((s: { _id: string; title: string }, i: number) => (
            <button
              key={s._id}
              onClick={() => setActiveSceneId(s._id)}
              className="w-8 h-8 rounded-full text-[10px] font-medium flex items-center justify-center"
              title={s.title}
              style={{
                backgroundColor: s._id === activeSceneId ? '#D4A017' : 'rgba(255,255,255,0.1)',
                color: s._id === activeSceneId ? '#0A0908' : '#A8A29E',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Hotspot info panel */}
      {activeHotspot && (
        <HotspotInfoPanel
          hotspot={activeHotspot}
          onClose={() => setActiveHotspot(null)}
          onNavigate={(targetSceneId: string) => {
            setActiveSceneId(targetSceneId)
            setActiveHotspot(null)
          }}
        />
      )}

      {/* Video modal */}
      {videoModalUrl && (
        <HotspotVideoModal
          url={videoModalUrl}
          title={videoModalTitle}
          onClose={closeVideoModal}
        />
      )}
    </div>
  )
}
```

**IMPORTANT:** The `findCustomer` query at the top references `phoneDigits` before it's declared as state. Fix: move the query below the state declarations, or make it conditional:

```ts
const [phoneDigits, setPhoneDigits] = useState('')
// ... other state ...
const findCustomer = useQuery(
  api.customers.findByPhone,
  phoneDigits.length >= 7 ? { phone: phoneDigits } : 'skip'
)
```

Ensure `phoneDigits` state is declared BEFORE the `useQuery` call.

- [ ] **Step 2: Add `/tour/[slug]/sales` to middleware protected routes**

In `/Users/padidamabhinay/Desktop/UI/Spazeo/middleware.ts`, the `createRouteMatcher` array does not include `/tour/*/sales`. The `/tour/[slug]` route is public (for customers). Add a specific match for the sales sub-route. Find the `isProtectedRoute` block and add the sales route:

```ts
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/tours(.*)',
  '/floor-plans(.*)',
  '/analytics(.*)',
  '/leads(.*)',
  '/settings(.*)',
  '/billing(.*)',
  '/onboarding(.*)',
  '/tour/.*/sales(.*)',
])
```

- [ ] **Step 3: Lint + commit**

```bash
npm run lint
npx convex dev --once
git add src/app/tour/\[slug\]/sales/page.tsx middleware.ts
git commit -m "feat(sales): sales mode tour page with 4-state machine + auth gate"
```

---

## Task 11: Manual E2E verification

- [ ] **Step 1: Start dev servers**

Terminal 1: `npx convex dev`
Terminal 2: `npm run dev`

- [ ] **Step 2: Test full flow**

1. Sign in as tour owner
2. Open `/tour/<published-slug>/sales`
3. Enter test phone number (e.g. `9876543210`)
4. Verify "New customer" card appears
5. Enter name → click "Start Tour"
6. Navigate scenes, click hotspots, wait 10s (yaw samples)
7. Click "End Tour" → post-tour form appears
8. Select "Hot" interest, type note → "Save & Finish"
9. Verify redirect back to phone input
10. Re-enter same phone → verify "Returning customer" with 1 visit shown

- [ ] **Step 3: Verify analytics**

Check Convex dashboard:
- `customers` table has new row with normalized phone
- `salesSessions` table has row with interestLevel, postTourNote, endedAt
- `analytics` table has events with `metadata.salesMode: true`

- [ ] **Step 4: Test auth gate**

Open `/tour/<slug>/sales` in incognito (not signed in). Should redirect to sign-in.

- [ ] **Step 5: Commit verification note**

```bash
git add docs/superpowers/specs/2026-04-16-sales-mode-tour-design.md
git commit -m "chore(docs): record E2E verification for sales mode"
```

---

## Spec Coverage Check

| Spec item | Task |
|---|---|
| `/tour/[slug]/sales` URL | Task 10 |
| Clerk auth gate + middleware | Task 10 step 2 |
| `customers` table + indexes | Task 2 |
| `salesSessions` table + indexes | Task 2 |
| `leads.customerId` field | Task 2 + Task 5 |
| Phone normalization | Task 1 |
| `customers.findByPhone` + visit summary | Task 3 |
| `customers.create` (upsert-like) | Task 3 |
| `customers.update` | Task 3 |
| `customers.getWithHistory` | Task 3 |
| `salesSessions.create` | Task 4 |
| `salesSessions.end` (interest + note + name) | Task 4 |
| `salesSessions.getByTour` | Task 4 |
| `salesSessions.getByCustomer` | Task 4 |
| `salesSessions.getBySessionId` | Task 4 |
| PhoneInput screen | Task 6 |
| CustomerCard (new + returning) | Task 7 |
| PostTourForm (interest pills + note + name) | Task 8 |
| SalesTopBar (customer info + end button) | Task 9 |
| 4-state page (phone → card → tour → post) | Task 10 |
| Reuse useSessionTracker + usePanoramaTracking | Task 10 |
| Events tagged salesMode metadata | Task 10 |
| Lead form hidden in sales mode | Task 10 (no lead panel rendered) |
| Duplicate phone = return existing customer | Task 3 (create returns existing) |
| Privacy: phone digits only | Task 1 + 3 |
| Dashboard: customer link on leads | **Deferred** (minimal v1 per spec phase 6) |
| Dashboard: sales filter on sessions | **Deferred** (minimal v1 per spec phase 6) |
