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
- Protects `/dashboard/*`, `/tours/*`, `/analytics/*`, `/leads/*`, `/settings/*`, `/billing/*`, `/onboarding/*`
- **Falls back to passthrough (no protection)** when Clerk env vars are missing — same pattern as ConvexClientProvider

### Role-Based Access

Roles: `owner`, `admin`, `editor`, `viewer` — stored in Convex `users` and `teamMembers` tables. Mutations check role before allowing writes.

### Frontend Auth Components

- Clerk: `SignInButton`, `SignUpButton`, `UserButton`, `SignedIn`, `SignedOut`
- Convex: `Authenticated`, `Unauthenticated`, `AuthLoading`
