---
paths:
  - "src/**"
  - "convex/**"
---

## Coding Conventions

### General
- TypeScript strict mode — no `any`
- Prefer named exports over default exports for components
- Use `@/` path aliases for all internal imports
- Server Components by default; add `'use client'` only when needed
- Keep components small and focused — split at 150 lines

### Data Patterns
- **Always** use `useQuery()` for reading data — never fetch manually. Components re-render reactively.
- `useMutation()` handles optimistic updates automatically
- Use the Convex `api.*` references (from `convex/_generated/api`) for fully typed function calls
- Never pass file data through mutations — use the 3-step upload pattern
- AI features always use the job queue pattern (create job → schedule action → process → update)

### Tailwind
- Tailwind v4: all theme config in `src/app/globals.css` via `@theme {}` — NO tailwind.config.ts
- Use the 4px spacing scale: `p-1 p-2 p-3 p-4 p-6 p-8 p-12 p-16`
- Use `clsx` + `tailwind-merge` for conditional class composition

### Accessibility
- All interactive elements must have accessible labels
- All images need `alt` text
- Color combinations must meet WCAG AA (4.5:1 body, 3:1 large text)
- Never use red/green alone to convey meaning
- Maintain focus-visible outlines

### File Naming
- Components: `PascalCase.tsx`
- Utilities/hooks: `camelCase.ts`
- Pages/layouts: `page.tsx`, `layout.tsx` (Next.js convention)
- Convex functions: `camelCase.ts` (tours.ts, scenes.ts, etc.)
