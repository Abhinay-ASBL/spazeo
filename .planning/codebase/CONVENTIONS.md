# Coding Conventions

**Analysis Date:** 2026-03-09

## Naming Patterns

**Files:**
- React components: `PascalCase.tsx` — e.g., `Button.tsx`, `TourCard.tsx`, `PanoramaViewer.tsx`
- Hooks: `camelCase.ts` with `use` prefix — e.g., `useTour.ts`, `useViewer.ts`, `useBuilding.ts`
- Utilities: `camelCase.ts` — e.g., `utils.ts`, `constants.ts`, `stripe.ts`
- Convex backend functions: `camelCase.ts` — e.g., `tours.ts`, `scenes.ts`, `aiActions.ts`
- Next.js pages/layouts: lowercase convention — `page.tsx`, `layout.tsx`

**Functions:**
- React components: `PascalCase` — `function Button(...)`, `function Navbar()`
- Custom hooks: `camelCase` with `use` prefix — `useTourList`, `useTourMutations`, `useRecentTours`
- Event handlers: `handle` prefix — `handleSignIn`, `handleNavClick`, `handleHotspotClick`, `handleShare`
- Toggle handlers: `toggle` prefix — `toggleFullscreen`
- Convex queries/mutations/actions: camelCase noun-verb pattern — `list`, `getById`, `getBySlug`, `create`, `update`, `publish`, `remove`

**Variables:**
- camelCase throughout — `tourData`, `activeSceneId`, `isFullscreen`, `mobileOpen`
- Boolean state: `is` or descriptive past-tense adjective — `isLoading`, `scrolled`, `mobileOpen`, `leadSubmitting`
- Ref variables: descriptive with `Ref` suffix — `containerRef`, `sessionIdRef`, `viewTrackedRef`

**Types/Interfaces:**
- Type aliases: `PascalCase` — `TourStatus`, `UserPlan`, `ButtonVariant`, `BadgeVariant`
- Interface names: `PascalCase` — `ButtonProps`, `BadgeProps`, `LeadCaptureConfig`, `BrandingConfig`
- Enum-like string unions preferred over TypeScript enums — `type TourStatus = 'draft' | 'published' | 'archived'`

**Constants:**
- `SCREAMING_SNAKE_CASE` for module-level constant objects/arrays — `NAV_LINKS`, `STATUS_FILTERS`, `SORT_OPTIONS`, `TOUR_LIMITS`

## Code Style

**Formatting:**
- No Prettier config present — formatting enforced via ESLint only
- Single quotes for strings in TypeScript/TSX
- 2-space indentation (inferred from files)
- Trailing commas in multi-line arrays/objects

**Linting:**
- ESLint 9 with flat config at `eslint.config.mjs`
- Rules: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- `@next/next/no-img-element` rule present but suppressed with inline `/* eslint-disable */` in viewer page
- TypeScript strict mode enabled in `tsconfig.json` (`"strict": true`)
- `typescript.ignoreBuildErrors: true` in `next.config.ts` to handle Convex generated type circularity

## Import Organization

**Order (observed pattern):**
1. React and framework hooks — `'use client'` directive first if needed, then `import { useState, ... } from 'react'`
2. Next.js imports — `next/link`, `next/navigation`, `next/image`, `next/dynamic`
3. Third-party libraries — `convex/react`, `@clerk/nextjs`, `framer-motion`, `lucide-react`, `react-hot-toast`
4. Internal shared components — `@/components/...`
5. Internal hooks — `@/hooks/...`
6. Internal lib — `@/lib/...`
7. Generated types — `../../../../convex/_generated/api`, `../../../../convex/_generated/dataModel`

**Path Aliases:**
- `@/` maps to `./src/` — configured in `tsconfig.json`
- Exception: Convex generated files use relative paths (`../../../../convex/_generated/api`) because they live outside `src/`

## Error Handling

**Frontend patterns:**
- `try/catch` blocks wrapping async mutation calls, always with `toast.error(...)` in the catch
- `.catch(() => {})` used to silently suppress non-critical failures (analytics tracking, user sync)
- `toast.error('Something went wrong. Please try again.')` as the generic user-facing error message
- Specific error messages surfaced from Convex `Error` throws when available
- `err: unknown` typing enforced for catch variables in some locations (inconsistent — some use untyped `err`)

```typescript
// Standard mutation error handling pattern
try {
  await mutateFn({ ...args })
  toast.success('Action completed.')
} catch (err) {
  toast.error('Something went wrong. Please try again.')
}
```

**Convex backend patterns:**
- Auth guard at top of every mutation/action: `if (!identity) throw new Error('Not authenticated')`
- Resource existence check: `if (!tour) throw new Error('Tour not found')`
- Authorization check: `if (tour.userId !== user._id) throw new Error('Not authorized')`
- Queries return `null` or `[]` (not throw) when unauthenticated — graceful fallback pattern

```typescript
// Standard Convex query auth pattern (returns empty, not throw)
const identity = await ctx.auth.getUserIdentity()
if (!identity) return []

// Standard Convex mutation auth pattern (throws)
const identity = await ctx.auth.getUserIdentity()
if (!identity) throw new Error('Not authenticated')
```

**Error boundary:**
- `AuthErrorBoundary` at `src/components/auth/AuthErrorBoundary.tsx` wraps auth pages
- Logs errors via `console.error('[AuthErrorBoundary]', error)`

## Logging

**Framework:** `console.error` for error logging only (no structured logger)

**Patterns:**
- `console.error('[ComponentName] description:', error)` — namespaced with brackets
- Found in: `src/components/auth/AuthErrorBoundary.tsx`, `src/components/viewer/PanoramaViewer.tsx`
- No `console.log` or `console.warn` calls present in the codebase

## Comments

**When to Comment:**
- Section separators using `// ─── Section Name ───` or `/* ── Section ── */` — used heavily in large files like `tours/page.tsx`
- Inline explanations for non-obvious logic — `// Generate embed code`, `// Cascade delete scenes and hotspots`
- TODO/FIXME: none found in `src/`
- JSDoc: not used — no JSDoc annotations present

## Function Design

**Size:** Components split around 150 lines per the project guidelines; observed files like `tours/page.tsx` exceed this (large page component), but shared components follow the rule
**Parameters:** Destructured object props for components, typed with interfaces
**Return Values:** Components return JSX or `null` for conditional renders; hooks return query results directly; utility functions return typed primitives

## Module Design

**Exports:**
- Named exports preferred for all components — `export function Button(...)`, `export function Badge(...)`
- Default exports used for Next.js page components — `export default function SignInPage()`
- Exception: `Navbar` uses both named export and `export default Navbar` at bottom (inconsistency)
- Convex functions always use named exports — `export const list = query(...)`, `export const create = mutation(...)`

**Barrel Files:** Not used — imports go directly to file paths

## Client vs Server Components

**Pattern:**
- `'use client'` directive added at top of files requiring browser APIs, React hooks, event handlers, or Clerk/Convex hooks
- Server Components are the default for pages that only need data fetching (SSR/ISR)
- Large page-level components (`tours/page.tsx`, `tour/[slug]/page.tsx`) are client components due to Convex reactive queries

## Styling

**Approach:** Tailwind CSS v4 utility classes + inline `style` prop for brand color values
**Theme config:** All custom tokens defined in `src/app/globals.css` via `@theme {}` — no `tailwind.config.ts`
**Conditional classes:** `cn()` helper from `src/lib/utils.ts` (combines `clsx` + `tailwind-merge`)
**Colors:** Mix of Tailwind v4 color utilities and hardcoded hex values in `style` props — hardcoding is common when applying brand-specific values that need to be exact

```typescript
// Conditional class composition pattern
import { cn } from '@/lib/utils'

const classes = cn(
  'base-class other-class',
  condition && 'conditional-class',
  className  // always accept external className override
)
```

**Variant maps:** UI components define `Record<VariantType, string>` maps for variant-to-class lookup
```typescript
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#D4A017] hover:bg-[#E5B120] ...',
  secondary: '...',
}
```

## Convex-Specific Conventions

**Data reading:** Always `useQuery(api.module.functionName, args)` — never fetch manually
**Data writing:** Always `useMutation(api.module.functionName)`, call returned function
**Typed IDs:** `Id<'tableName'>` from `convex/_generated/dataModel` for all document IDs
**Arg validation:** All Convex functions use `v` validators from `convex/values` for args
**Auth helper:** `getAuthUser(ctx)` pattern — shared helper function in files that have multiple mutations
**Activity logging:** All data-modifying mutations call `ctx.runMutation(internal.activity.log, {...})` after the primary operation

---

*Convention analysis: 2026-03-09*
