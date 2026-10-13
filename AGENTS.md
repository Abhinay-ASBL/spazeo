# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

# Spazeo — Codex Instructions

> AI coding assistant context for the Spazeo project.
> Read this before making any changes.

---

## Project Overview

**Spazeo** is an AI-powered 360° virtual tour platform for real estate professionals.
It converts panorama photos into immersive, walkable 3D experiences using
Gaussian Splatting, AI staging, depth estimation, and smart search.

- **Tagline:** "Step Inside Any Space"
- **Domain:** spazeo.io
- **Pronunciation:** spa·ZAY·oh
- **Architecture Philosophy:** Reactive, real-time, serverless, AI-native

---
## Tech Stack (summary)

Next.js 16 App Router + TypeScript · Tailwind v4 + Radix UI · Convex (DB, functions, storage, crons, vector search) · Clerk auth · @photo-sphere-viewer panoramas · Three.js (R3F + drei) building viewer · Alibaba DashScope Qwen models · Stripe · Resend · Vercel · PostHog · Sentry · Lucide · Framer Motion · Zustand. Full table: `docs/claude/tech-stack.md`.

---

## Convex Backend (key rules)

Convex is the entire backend — database, API server, file storage, and job scheduler. Queries: pure reads, no side effects/external APIs. Mutations: transactional DB writes, cannot call external APIs. Actions: external APIs, not transactional, use `runQuery`/`runMutation` for DB. Every function checks `ctx.auth.getUserIdentity()`. Function-type table, frontend hooks, 3-step file upload, AI job queue: `.claude/rules/convex-patterns.md`.

---

## What NOT to Do

- Do not add colors outside the palette without explicit instruction
- Do not use decorative or script fonts — only Plus Jakarta Sans and DM Sans
- Do not use emojis in UI copy or error messages
- Do not hardcode spacing values outside the 4px grid
- Do not skip heading levels (H1 → H2 → H3 in order)
- Do not create files unless strictly necessary
- Do not over-engineer — minimum complexity for the task
- Do not commit `.env.local` or any secrets
- Do not auto-push or auto-commit without user confirmation
- Do not edit files in `convex/_generated/` — those are auto-generated

---

## Development Commands

```bash
# Start both servers simultaneously (run in separate terminals)
npx convex dev          # Convex dev server (watches convex/, syncs schema, deploys functions)
npm run dev             # Next.js dev server with Turbopack on localhost:3000

# Linting
npm run lint            # ESLint (eslint-config-next)

# Production deploy
npx convex deploy       # Deploy Convex backend
# Vercel auto-deploys on git push to main
```

> **Note:** `next.config.ts` sets `typescript.ignoreBuildErrors: true` because Convex-generated `api.d.ts` creates circular type references that break the Next.js build checker. The Convex CLI handles type-checking for `convex/` files separately via `npx convex dev`.

> **Note:** No test runner (vitest/playwright) is configured yet in `package.json`.

---

## Where the rest lives

- Project structure (full tree): `docs/claude/project-structure.md`
- Database schema (all Convex tables, fields, indexes): `docs/claude/schema.md`
- Environment variables: `docs/claude/env.md`
- Key data flows (tour creation/viewing, AI staging, billing): `docs/claude/data-flows.md`
- Notion workflow + feature/screen page IDs (use when asked to "build Feature NN", "fix the X page", or "what next"): `docs/claude/notion-workflow.md`
- Auth architecture (provider chain, route protection, roles): `.claude/rules/auth.md`
- 360° / 3D building viewer architecture: `.claude/rules/viewer.md`
- Design system (colors, type, spacing, radius, shadows, buttons, icons) + brand voice in UI copy: `.claude/rules/design-system.md`
- Coding conventions (general, data patterns, Tailwind, a11y, file naming): `.claude/rules/coding-conventions.md`
- Reference links (`Spazeo_Technical_Architecture.docx`, `BRAND.md`, Lucide/Convex/Clerk/Radix docs): `docs/claude/tech-stack.md`

---

## Imported Claude Cowork project instructions
