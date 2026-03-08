# Testing Patterns

**Analysis Date:** 2026-03-09

## Test Framework

**Runner:** Not configured

No test runner (Jest, Vitest, Playwright, Cypress) is installed or configured. The `package.json` contains no test script and no testing dependencies in either `dependencies` or `devDependencies`. No `jest.config.*`, `vitest.config.*`, or `playwright.config.*` files exist.

**Per project documentation (`CLAUDE.md`):**
> "No test runner (vitest/playwright) is configured yet in `package.json`."

**Run Commands:**
```bash
# No test commands available currently
npm run lint   # Only quality check available
```

## Test File Organization

No test files exist in the codebase. A search for `*.test.*` and `*.spec.*` returns no results.

## Test Structure

No tests exist to analyze.

## Mocking

No mocking patterns exist to analyze.

## Fixtures and Factories

No test fixtures or factories exist to analyze.

## Coverage

**Requirements:** Not enforced — no coverage tooling configured

## Test Types

**Unit Tests:** Not implemented
**Integration Tests:** Not implemented
**E2E Tests:** Not implemented

## Recommended Setup (when adding tests)

Based on the existing stack (Next.js 16, TypeScript, Convex, React 19), the appropriate testing setup would be:

**For unit/integration tests:**
- Vitest — compatible with TypeScript, ESM, and the existing build toolchain
- Config file: `vitest.config.ts` at project root
- `@testing-library/react` for component rendering
- `@testing-library/user-event` for interaction simulation

**For E2E tests:**
- Playwright — recommended for Next.js
- Config file: `playwright.config.ts` at project root

**Test file placement convention to adopt:**
- Co-locate test files next to source files: `Button.test.tsx` next to `Button.tsx`
- Or separate `__tests__` directory per module folder

**Key areas needing test coverage (prioritized):**
1. `src/lib/utils.ts` — pure functions (`cn`, `formatDate`, `slugify`, `truncate`, `formatNumber`) are ideal unit test targets
2. `src/lib/constants.ts` — plan limit values used in business logic
3. `convex/tours.ts` — business logic for tour creation, plan limit enforcement, slug generation
4. `src/components/ui/Button.tsx`, `Badge.tsx` — UI components with variant logic
5. Auth passthrough logic in `src/components/providers/ConvexClientProvider.tsx`

**Example Vitest setup (not yet implemented):**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

**Example unit test pattern for utilities:**
```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { slugify, formatNumber, truncate } from '@/lib/utils'

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('My Tour Title')).toBe('my-tour-title')
  })
  it('removes special characters', () => {
    expect(slugify('Tour #1!')).toBe('tour-1')
  })
})
```

---

*Testing analysis: 2026-03-09*
