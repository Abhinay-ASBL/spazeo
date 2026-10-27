---
paths:
  - "middleware.ts"
  - "src/app/layout.tsx"
  - "src/components/providers/**"
  - "src/app/(auth)/**"
  - "convex/auth.config.ts"
  - "convex/users.ts"
---

## Authentication Architecture

### Provider Chain (src/app/layout.tsx)

```
ConvexClientProvider → PostHogProvider → App
  └─ (inside ConvexClientProvider when env vars present)
     ClerkProvider → ConvexProviderWithClerk
```

- **ConvexClientProvider** (`src/components/providers/ConvexClientProvider.tsx`): wraps `ClerkProvider → ConvexProviderWithClerk`. **Renders children directly (passthrough) when `NEXT_PUBLIC_CONVEX_URL` or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are missing/invalid** — this allows the app to render without auth in development.
- **PostHogProvider** (`src/components/providers/PostHogProvider.tsx`): wraps children inside the root layout for analytics.

### Route Protection

- `middleware.ts` uses Clerk's `clerkMiddleware` + `createRouteMatcher`
- Protects `/dashboard/*`, `/tours/*`, `/floor-plans/*`, `/analytics/*`, `/leads/*`, `/settings/*`, `/billing/*`, `/onboarding/*`, `/tour/*/sales*`
- Also protects building dashboard routes: `/buildings` (list), `/buildings/*/exterior*`, `/buildings/*/map*`, `/buildings/legacy-towers/admin*`, `/buildings/legacy-towers/edit-markers*`. `/buildings/:id/view` and `/buildings/legacy-towers/view` stay public, as does `/tour/:slug`
- **Falls back to passthrough (no protection)** when Clerk env vars are missing — same pattern as ConvexClientProvider

### Role-Based Access

Roles: `owner`, `admin`, `editor`, `viewer` — stored in Convex `users` and `teamMembers` tables. Mutations check role before allowing writes.
- `requireAdmin` (`convex/authHelpers.ts`) accepts only `users.role === 'admin'` (not `owner`). Promote a user with the internal mutation `users:setRoleByEmail`.

### Frontend Auth Components

- Clerk: `SignInButton`, `SignUpButton`, `UserButton`, `SignedIn`, `SignedOut`
- Convex: `Authenticated`, `Unauthenticated`, `AuthLoading`
