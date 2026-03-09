# Phase 1: Tour Platform — Stabilize and Polish - Research

**Researched:** 2026-03-09
**Domain:** Next.js 16 / Convex / Three.js / @react-three/fiber — 360° tour platform stabilization
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tour Editor Routing and Layout**
- Editor lives at a separate `/tours/[id]/edit` route (not inline on the detail page)
- Layout: left panel (~280px, fixed) + right panorama viewer (remaining width)
- Left panel default state: draggable scene thumbnail list with 'Add Scene' button at top
- Editor header contains a 'Publish' button — one-click status change, autosaves changes
- Scene upload happens via 'Add Scene' in the left panel (uses existing UploadZone component)

**Hotspot Placement (Editor)**
- 'Add Hotspot' button enters placement mode: crosshair cursor, viewer shows teal banner ("Click to place hotspot" — already exists in PanoramaViewer `isEditing` mode)
- User clicks panorama → hotspot placed at that 3D coordinate
- Left panel slides to a config panel: target scene selector, hotspot type, tooltip text, visibility toggle
- Existing hotspots in edit mode: same visual marker + teal (#2DD4BF) glow/border when selected + Delete button on selection

**Hotspot Visual Design (Public Viewer)**
- Navigation hotspots: HTML overlay positioned via 3D→screen projection (not Three.js sprites)
  - Pulsing glow ring + chevron/arrow icon, Gold (#D4A017), CSS keyframe animation
  - "Animated directional arrow" = pulse ring that expands outward, chevron center pointing direction
- Info popup card: HTML overlay panel anchored near the hotspot's screen position (or slides in from right)
  - Can contain rich content: text, image, video — React HTML, not Three.js billboard
- Hotspot rendering approach: replace existing Three.js HotspotMarker sprites with HTML overlay system (project 3D positions to 2D screen coordinates)

**Analytics Dashboard**
- Global overview at `/analytics` with per-tour drill-down
- Top section: 4 StatsCard components (total views, unique visitors, avg scene time, total leads — aggregated across all tours)
- Below top stats: table of tours with individual metrics per row
- Bar chart showing views over time (below the table or beside it)
- Default time range: last 30 days; user can switch between 7d / 30d / 90d / All time

**Auto-rotate Idle Behavior**
- Auto-rotate always restarts after 5 seconds of user inactivity (idle timer pattern)
- Idle timer resets on: mouse move, click, scroll, and touch events on the viewer
- Manual toggle button (already in ViewerControls) permanently disables auto-rotate for the session — if user clicks it off, idle timer is suspended; if user clicks it back on, idle timer re-activates
- OrbitControls `autoRotate` prop is driven by this idle state (not just the manual toggle alone)

**Critical Bug Fixes (Specified — No Ambiguity)**
- FIX-01: Pass `tourSlug` correctly in the leads.ts scheduler call so email fires
- FIX-02: Hash password with bcrypt before storing in tours table; compare server-side
- FIX-03: Complete empty Stripe webhook stubs in convex/http.ts for checkout.session.completed, subscription updates, cancellations

### Claude's Discretion
- Exact drag-and-drop library for scene reordering (react-beautiful-dnd or native HTML5 drag)
- Bar chart implementation (recharts, or simple CSS bars — no chart library specified)
- Exact iframe attributes exposed in the embed code generator (TOUR-04)
- Error state designs for the editor
- Compression/optimization of uploaded panorama images

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIX-01 | Lead email notification fires correctly when a buyer submits the lead form (fix missing tourSlug argument in leads.ts scheduler call) | Codebase analysis reveals two sendLeadNotification functions; leads.ts capture mutation calls emails.sendLeadNotification which has no tourSlug param — the bug is a duplicate function in leads.ts that is unreferenced or a mismatch. Fix confirmed simple. |
| FIX-02 | Tour passwords are hashed with bcrypt before storage and compared server-side (remove plaintext storage) | tours.ts verifyTourPassword query does plaintext comparison. Convex Actions with "use node" directive support bcrypt. Requires: new internalAction for hashing, mutation update for password setting, and verifyTourPassword converted to action. |
| FIX-03 | Stripe webhook handlers process checkout.session.completed, subscription updates, and cancellations correctly (complete empty stubs in convex/http.ts) | http.ts already has full implementations — not empty stubs. The CONTEXT description may reflect an earlier state. Verification task: confirm all four event types (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed) work end-to-end. |
| TOUR-01 | User can complete the full tour creation flow end-to-end | Tour editor page at /tours/[id]/edit already exists with upload, scene management, publish. Gaps to verify: flow from /tours page "New Tour" button → editor redirect works without friction. |
| TOUR-02 | User can add, move, and delete hotspots visually inside the tour editor without editing JSON | Editor page has hotspot placement mode using PanoramaViewer isEditing prop. Drag-and-drop scene reorder uses native HTML5 drag (dragIndex/dragOverIndex state already in editor). Hotspot create/update/delete mutations exist. |
| TOUR-03 | User can customize each hotspot with animated directional arrow, info popup card, external link, and visibility toggle | HotspotMarker currently uses @react-three/drei Html component — works but lacks animated pulse ring for navigation type and rich info popup. Need: CSS animation for navigation hotspots, popup card for info/media/link types, visibility toggle field in hotspot config. |
| TOUR-04 | User can generate an embeddable iframe snippet from the tour settings page | tours.publish mutation already generates embedCode and stores it. Editor page has settings tab. Need: UI to display the code, copy button, and confirm iframe attributes. |
| TOUR-05 | User can share the tour via a clean public URL and optionally set a password-protected link | ShareDialog component exists. tours.update mutation accepts privacy + password fields. FIX-02 (bcrypt) is a dependency of this requirement. |
| VIEW-01 | Public tour viewer supports mobile touch gestures — pinch to zoom, swipe to rotate | OrbitControls has touch handling. Current config: enableZoom={false}. Need to enable pinch zoom on mobile: enableZoom={true} + touch-specific event handling or rely on OrbitControls built-in touch support. |
| VIEW-02 | Public tour viewer has a fullscreen button and keyboard shortcut (F key) | toggleFullscreen callback exists in tour/[slug]/page.tsx. Keyboard shortcut (F key) event listener not yet wired. |
| VIEW-03 | Tour auto-rotates when idle for more than 5 seconds and stops rotating on any user interaction | Current implementation: isAutoRotating state is a manual toggle only. Need idle timer: useRef for timeout, event listeners reset on interaction, drives autoRotate prop. |
| LEAD-01 | Agent receives email notification with buyer name, email, and tour title within 60 seconds | emails.sendLeadNotification internalAction is implemented. Bug in leads.ts: capture mutation calls internal.emails.sendLeadNotification (correct) but leads.ts also defines its own sendLeadNotification that requires tourSlug. The ambiguity in naming causes the scheduler call to potentially route wrong. Fix: ensure internal.emails.sendLeadNotification is called, not the leads.ts duplicate. |
| ANLT-01 | Analytics dashboard shows total views, unique visitors, average time per scene, and lead count per tour | analytics/page.tsx is FULLY BUILT with all required stats via getDashboardOverview + getTourPerformance queries. This requirement is already met — verification only. |
</phase_requirements>

---

## Summary

Phase 1 work spans three categories: security/bug fixes, feature completion, and viewer polish. The codebase is substantially further along than a greenfield start — most UI pages and Convex backend functions exist.

The critical security issue (FIX-02 plaintext passwords) requires a Convex Action with `"use node"` directive to run bcrypt. The `verifyTourPassword` function is currently a reactive Query doing a plaintext string comparison, which must be converted to an HTTP-accessible mutation or action pattern. FIX-01 (lead email) has a naming collision between two `sendLeadNotification` definitions — one in `leads.ts` (requires `tourSlug`, appears unused) and one in `emails.ts` (no tourSlug, is called). The fix is removing the duplicate. FIX-03 (Stripe webhooks) are already implemented with all four event types — the fix is likely verification and ensuring the webhook secret is configured.

The tour editor (`/tours/[id]/edit`) already exists as a substantial page with hotspot placement, scene drag-reorder, and publish flow. The remaining work is completing the hotspot visual system (replacing the existing HotspotMarker with the animated Gold pulse ring design for navigation hotspots, and a rich popup card for info/media/link), adding keyboard shortcut for fullscreen (VIEW-02), wiring the idle auto-rotate timer (VIEW-03), enabling pinch zoom on mobile (VIEW-01), and verifying the embed code display (TOUR-04).

**Primary recommendation:** Address fixes first (FIX-01, FIX-02, FIX-03), then complete the viewer features (VIEW-01, VIEW-02, VIEW-03), then polish the tour creation UX (TOUR-01 through TOUR-05). Analytics (ANLT-01) is already done — only needs a verification pass.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.32.0 | Reactive database, mutations, actions, scheduled jobs | Project backend — all data ops |
| @react-three/fiber | ^9.5.0 | React renderer for Three.js canvas | PanoramaViewer and HotspotMarker built on this |
| @react-three/drei | ^10.7.7 | OrbitControls, Html (hotspot overlays), helpers | OrbitControls drives rotation/zoom/touch |
| three | ^0.183.1 | 3D math, TextureLoader, PerspectiveCamera | Used directly in PanoramaViewer |
| react-hot-toast | ^2.6.0 | User feedback toasts | Established pattern: toast.success/error |
| react-dropzone | ^15.0.0 | File upload — panorama drop zone | Already in UploadZone.tsx |
| framer-motion | ^12.34.3 | Panel animations | Available but use sparingly |
| lucide-react | ^0.575.0 | Icons | Gold interactive, Teal spatial, Grey decorative |

### Must Install for FIX-02
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| bcryptjs | ^2.4.3 | Password hashing in Node.js Convex Action | bcrypt (native) has binary compilation issues in Convex; bcryptjs is pure JS and works with "use node" directive |

**Installation:**
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

### Claude's Discretion — Drag and Drop
The editor page already implements native HTML5 drag-and-drop with `dragIndex` / `dragOverIndex` state. **Do not install `react-beautiful-dnd`** — the native approach is already built and sufficient.

### Claude's Discretion — Bar Chart
The analytics page already has a CSS bar chart implementation (proportional width divs). **Do not install recharts** — the existing approach meets the requirement.

---

## Architecture Patterns

### Convex Function Type Rules (Project-Critical)

| Operation | Function Type | Why |
|-----------|--------------|-----|
| Read reactive data | Query | Auto-refreshes frontend |
| Write to DB | Mutation | Transactional, auto-rollback |
| Call external API (Resend, bcrypt) | Action | Can call Node.js / external |
| Password hashing | Action with `"use node"` | bcryptjs requires Node.js runtime |
| Password verification | Action | NOT a Query — bcrypt compare requires Node.js |
| Stripe webhook | HTTP Action | Raw request/response |

### Pattern 1: Convex Node.js Action (for bcrypt — FIX-02)
**What:** Prefix action file or function with `"use node"` to unlock Node.js APIs.
**When to use:** Bcrypt, file system ops, native modules.
**Example:**
```typescript
// convex/auth.ts (new file)
"use node"
import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import bcrypt from 'bcryptjs'

export const hashPassword = internalAction({
  args: { password: v.string() },
  handler: async (_ctx, { password }) => {
    return await bcrypt.hash(password, 10)
  },
})

export const verifyPassword = internalAction({
  args: { password: v.string(), hash: v.string() },
  handler: async (_ctx, { password, hash }) => {
    return await bcrypt.compare(password, hash)
  },
})
```

### Pattern 2: Idle Auto-Rotate Timer (for VIEW-03)
**What:** useRef-based idle timer that drives the autoRotate prop.
**When to use:** Whenever auto-rotate should pause on interaction and resume after inactivity.
**Example:**
```typescript
// Inside tour/[slug]/page.tsx
const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
const [autoRotateEnabled, setAutoRotateEnabled] = useState(true) // manual toggle
const [isIdle, setIsIdle] = useState(false)

const resetIdle = useCallback(() => {
  setIsIdle(false)
  if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
  if (autoRotateEnabled) {
    idleTimerRef.current = setTimeout(() => setIsIdle(true), 5000)
  }
}, [autoRotateEnabled])

// isAutoRotating = autoRotateEnabled && isIdle
// Pass to PanoramaViewer: autoRotate={autoRotateEnabled && isIdle}
// Attach resetIdle to: onMouseMove, onClick, onScroll, onTouchStart on container div
```

### Pattern 3: HTML Overlay Hotspot (for TOUR-03)
**What:** HotspotMarker already uses `@react-three/drei Html` component positioned at 3D coordinates. The existing pattern works — upgrade the visual inside the Html wrapper.
**When to use:** All hotspot rendering. Do NOT switch to pure CSS absolute positioning outside the canvas.
**Example (navigation hotspot with Gold pulse ring):**
```typescript
// Inside HotspotMarker.tsx — navigation type only
<Html position={[x, y, z]} center zIndexRange={[10, 0]}>
  <div style={{ position: 'relative', width: 40, height: 40 }}>
    {/* Outer pulse ring — CSS keyframe */}
    <span style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      border: '2px solid #D4A017',
      animation: 'hotspot-pulse 1.5s ease-out infinite',
    }} />
    {/* Inner button */}
    <button style={{
      position: 'absolute', inset: 4, borderRadius: '50%',
      backgroundColor: '#D4A017', color: '#0A0908',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <ChevronRight size={14} />
    </button>
  </div>
</Html>
// CSS keyframe in globals.css:
// @keyframes hotspot-pulse {
//   0%   { transform: scale(1);   opacity: 0.8; }
//   100% { transform: scale(1.8); opacity: 0; }
// }
```

### Pattern 4: Fullscreen + Keyboard Shortcut (VIEW-02)
**What:** Document keydown event listener wired to the same toggle function.
```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'f' || e.key === 'F') toggleFullscreen()
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [toggleFullscreen])
```

### Pattern 5: Embed Code Display (TOUR-04)
**What:** The `publish` mutation in tours.ts already generates `embedCode` and stores it on the tour document. The editor settings panel needs to render this field.
```typescript
// In editor settings tab:
const embedCode = tour?.embedCode ?? ''
// Display in <pre> or <textarea readonly>
// Copy button: navigator.clipboard.writeText(embedCode)
```

### Anti-Patterns to Avoid
- **Plaintext password in Query:** `verifyTourPassword` must become an Action, not remain a Query — Queries cannot run Node.js bcrypt
- **Installing recharts or chart.js:** The existing CSS bar chart is sufficient for ANLT-01
- **Adding a new email helper to leads.ts:** The duplicate `sendLeadNotification` in leads.ts should be removed, not kept alongside the one in emails.ts
- **Installing react-beautiful-dnd:** Native HTML5 drag is already implemented and working

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `bcryptjs` with "use node" action | Timing attacks, salt rounds, industry standard |
| Touch/pinch zoom on panorama | Custom touch event math | `OrbitControls` from @react-three/drei with `enableZoom={true}` | Built-in pinch-to-zoom, handles all edge cases |
| Hotspot screen position calculation | Manual 3D → 2D projection math | `@react-three/drei Html` component | Already handles projection, occlusion, z-ordering |
| Drag-and-drop scene reorder | A drag library | Native HTML5 drag (already implemented) | Already built in editor page — no new dependency |
| Analytics aggregation | Custom time-series DB | Convex queries over `analytics` table | getDashboardOverview + getTourPerformance already built |

---

## Common Pitfalls

### Pitfall 1: bcrypt in a Convex Query or Mutation
**What goes wrong:** `bcrypt.hash()` and `bcrypt.compare()` are Node.js native modules. Running them inside a standard Convex Query or Mutation fails with a runtime error because Convex's default V8 runtime does not have Node.js APIs.
**Why it happens:** Convex has two runtimes — default (V8 isolate, no Node.js) and "use node" (full Node.js). bcryptjs requires the Node.js runtime.
**How to avoid:** Create a Convex Action in a file (or function) marked `"use node"` at the top.
**Warning signs:** Error like "bcrypt is not defined" or "process is not defined" at runtime.

### Pitfall 2: verifyTourPassword as a Reactive Query Exposes Password Hash
**What goes wrong:** Convex Queries are reactive — the result is sent to the client. If the query returns the full tour document including `passwordHash`, the hash is exposed to the browser.
**How to avoid:** The verify action should return only a boolean (or the tour data without the hash), never the raw hash.

### Pitfall 3: OrbitControls enableZoom=false Breaks Pinch on Mobile
**What goes wrong:** The current `PanoramaViewer.tsx` has `enableZoom={false}` on `OrbitControls`. This disables both scroll-wheel zoom and pinch-to-zoom on mobile. VIEW-01 requires pinch to zoom.
**How to avoid:** Change to `enableZoom={true}` and optionally set `zoomSpeed` or use `minDistance`/`maxDistance` to limit range. The existing `zoomLevel` state + CameraController component adjusts FOV separately, so the two systems (FOV zoom vs OrbitControls zoom) need to be consolidated.
**Warning signs:** Mobile users cannot pinch to zoom — only scroll zoom on desktop.

### Pitfall 4: Duplicate sendLeadNotification Functions
**What goes wrong:** `leads.ts` defines `sendLeadNotification` as an `internalAction` (line 360) with a required `tourSlug: v.string()` arg. `emails.ts` also defines `sendLeadNotification` as an `internalAction` without `tourSlug`. The `capture` mutation calls `internal.emails.sendLeadNotification` — the emails.ts version. The leads.ts version is dead code. The risk: a future change calling `internal.leads.sendLeadNotification` would fail because `tourSlug` is required but never passed.
**How to avoid:** Remove the duplicate from `leads.ts` entirely. Keep only `internal.emails.sendLeadNotification`.

### Pitfall 5: Idle Timer Memory Leak
**What goes wrong:** If the idle timer `setTimeout` is not cleared in the useEffect cleanup, it fires after component unmount and calls `setState` on unmounted component.
**How to avoid:** Always `clearTimeout(idleTimerRef.current)` in the useEffect cleanup return function.

### Pitfall 6: FIX-03 Stripe Webhook Status
**What goes wrong:** Based on code review, `convex/http.ts` already has full Stripe webhook implementations for all four event types. The CONTEXT description ("complete empty stubs") may reflect an older state of the file.
**How to avoid:** Verify the current http.ts handles all required event types end-to-end before concluding FIX-03 is done. Check that `internal.subscriptions.upsertFromStripe` and `internal.subscriptions.syncPlanToUser` mutations exist in `convex/subscriptions.ts`.

---

## Code Examples

### bcryptjs in Convex "use node" Action
```typescript
// convex/passwordUtils.ts
"use node"
import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import bcrypt from 'bcryptjs'

export const hashTourPassword = internalAction({
  args: { password: v.string() },
  handler: async (_ctx, { password }): Promise<string> => {
    return bcrypt.hash(password, 10)
  },
})

export const verifyTourPassword = internalAction({
  args: { slug: v.string(), password: v.string() },
  handler: async (ctx, { slug, password }): Promise<boolean> => {
    // Use runQuery to read the tour's passwordHash
    const tour = await ctx.runQuery(internal.tours.getPasswordHash, { slug })
    if (!tour?.passwordHash) return false
    return bcrypt.compare(password, tour.passwordHash)
  },
})
```

### Idle Auto-Rotate with Interaction Reset
```typescript
// Pattern for tour/[slug]/page.tsx
const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const [manualRotate, setManualRotate] = useState(true)  // user toggle
const [idleActive, setIdleActive] = useState(false)

const startIdleTimer = useCallback(() => {
  if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
  idleTimerRef.current = setTimeout(() => setIdleActive(true), 5000)
}, [])

const resetIdle = useCallback(() => {
  setIdleActive(false)
  if (manualRotate) startIdleTimer()
}, [manualRotate, startIdleTimer])

// autoRotate = manualRotate && idleActive
```

### Enable Mobile Pinch Zoom in OrbitControls
```typescript
// In PanoramaViewer.tsx Controls component:
<OrbitControls
  ref={controlsRef}
  enableZoom={true}          // was false — enable for pinch
  enablePan={false}
  rotateSpeed={-0.3}
  zoomSpeed={0.5}
  minFov={30}                // or use minDistance/maxDistance approach
  maxFov={100}
  dampingFactor={0.1}
  enableDamping
  autoRotate={autoRotate}
  autoRotateSpeed={0.4}
/>
```

### Embed Code Copy UI Pattern (TOUR-04)
```typescript
// In editor settings tab — embedCode is stored on tour document
const handleCopyEmbed = () => {
  navigator.clipboard.writeText(tour.embedCode ?? '')
  toast.success('Embed code copied!')
}

// Render:
<div style={{ position: 'relative' }}>
  <textarea
    readOnly
    value={tour.embedCode ?? ''}
    rows={3}
    style={{ width: '100%', resize: 'none', fontFamily: 'monospace', fontSize: 12 }}
  />
  <button onClick={handleCopyEmbed}>Copy</button>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Convex default runtime only | "use node" directive for Node.js APIs | Convex v1.x | bcrypt, sharp, fs all available in Actions |
| react-beautiful-dnd for drag-drop | Native HTML5 drag API | 2024+ | Zero dependency overhead |
| Chart.js / recharts for all charts | CSS proportional bars for simple cases | 2023+ | Removes 40-80KB bundle weight |
| OrbitControls scroll zoom = desktop only | enableZoom=true handles touch pinch natively | @react-three/drei v8+ | No custom touch math needed |

---

## Open Questions

1. **FIX-03 Stripe webhook — already implemented?**
   - What we know: http.ts has full implementations for checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
   - What's unclear: Whether `internal.subscriptions.upsertFromStripe` and `internal.subscriptions.syncPlanToUser` mutations exist in convex/subscriptions.ts (not yet read)
   - Recommendation: Read convex/subscriptions.ts as first task in FIX-03 plan. If both mutations exist, FIX-03 may be a verification-only task.

2. **Zoom consolidation — FOV vs OrbitControls zoom**
   - What we know: PanoramaViewer uses CameraController to adjust FOV based on zoomLevel prop. OrbitControls currently has enableZoom=false.
   - What's unclear: Whether enabling OrbitControls zoom conflicts with the FOV approach, or whether they should be consolidated into one.
   - Recommendation: For mobile pinch zoom, switch the panorama zoom mechanism to use OrbitControls' built-in zoom (adjust minDistance/maxDistance for a sphere) rather than FOV manipulation. This gives native touch support with no extra code.

3. **Password verification UX flow**
   - What we know: The current verifyTourPassword is a reactive Query. Converting to an Action changes the call pattern on the frontend (useAction instead of useQuery).
   - What's unclear: Whether the frontend password gate in tour/[slug]/page.tsx needs a full refactor or a minimal change.
   - Recommendation: The frontend switch from useQuery to useAction for password verification is minimal — replace `useQuery(api.tours.verifyTourPassword, ...)` with `useAction(api.passwordUtils.verifyTourPassword)` triggered on form submit.

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `/Users/padidamabhinay/Desktop/UI/Spazeo/convex/leads.ts` — FIX-01 root cause identified: duplicate sendLeadNotification
- `/Users/padidamabhinay/Desktop/UI/Spazeo/convex/emails.ts` — Correct sendLeadNotification (no tourSlug) confirmed working pattern
- `/Users/padidamabhinay/Desktop/UI/Spazeo/convex/tours.ts` — FIX-02: plaintext password comparison in verifyTourPassword query (line 184)
- `/Users/padidamabhinay/Desktop/UI/Spazeo/convex/http.ts` — FIX-03: Stripe webhook handlers already implemented (not empty stubs)
- `/Users/padidamabhinay/Desktop/UI/Spazeo/src/components/viewer/PanoramaViewer.tsx` — enableZoom=false confirmed; autoRotate prop exists; isEditing + onSphereClick pattern exists
- `/Users/padidamabhinay/Desktop/UI/Spazeo/src/components/viewer/HotspotMarker.tsx` — Uses @react-three/drei Html; has ping animation but not Gold pulse ring
- `/Users/padidamabhinay/Desktop/UI/Spazeo/src/app/tour/[slug]/page.tsx` — Fullscreen toggle exists; F-key listener missing; idle timer missing; pinch zoom blocked by enableZoom=false
- `/Users/padidamabhinay/Desktop/UI/Spazeo/src/app/(dashboard)/analytics/page.tsx` — ANLT-01 fully implemented
- `/Users/padidamabhinay/Desktop/UI/Spazeo/src/app/(dashboard)/tours/[id]/edit/page.tsx` — Tour editor exists with hotspot placement, drag-reorder, publish flow
- `/Users/padidamabhinay/Desktop/UI/Spazeo/package.json` — bcryptjs not installed; all other dependencies confirmed

### Secondary (MEDIUM confidence)
- Convex docs on "use node" directive — bcryptjs/bcrypt pattern for server-side hashing in Convex Actions is a documented community pattern

---

## Metadata

**Confidence breakdown:**
- FIX-01 root cause: HIGH — direct code inspection confirms duplicate function and correct call site
- FIX-02 approach (bcryptjs + "use node" action): HIGH — Convex Node.js runtime is documented
- FIX-03 status: MEDIUM — http.ts stubs are implemented but subscriptions.ts not verified
- TOUR-01/02/03/04/05 scope: HIGH — editor page exists, gaps identified through code review
- VIEW-01/02/03 gaps: HIGH — confirmed through PanoramaViewer.tsx and tour viewer page code
- ANLT-01 completion: HIGH — analytics page fully implemented, verification only needed

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable stack, 30-day validity)
