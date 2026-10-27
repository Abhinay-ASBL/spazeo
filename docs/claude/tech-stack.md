# Spazeo — Tech Stack

> Moved verbatim from `AGENTS.md`/`CLAUDE.md` to keep startup context small.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | Next.js 16 (App Router) | Server/client components, routing, SSR, ISR, Turbopack |
| Language | TypeScript | Type safety across frontend and Convex backend |
| Styling | Tailwind CSS v4 + Radix UI | Utility-first CSS, accessible component primitives |
| Backend Platform | Convex | Reactive database, serverless functions, file storage, cron jobs, vector search |
| Authentication | Clerk + Convex Auth | User management, JWT tokens, social login, role-based access |
| Panorama Viewer | @photo-sphere-viewer (core, autorotate-plugin, markers-plugin) | 360° equirectangular panorama viewer, hotspot markers |
| 3D Building Viewer | Three.js via @react-three/fiber + drei | Interactive 3D building models, exterior views, floor/unit navigation |
| AI — Vision | Alibaba DashScope qwen3.5-plus | Scene analysis, object detection, room classification (OpenAI-compatible API) |
| AI — Image Edit | Alibaba DashScope qwen-image-edit-max | Virtual staging, style transfer, inpainting (DashScope native API) |
| AI — Image Gen | Alibaba DashScope qwen-image-2.0-pro | Image enhancement, 2K photorealistic output (DashScope native API) |
| AI — 3D | Gaussian Splatting pipeline | Point cloud to 3D scene, spark.js viewer |
| AI — NLP | Alibaba DashScope qwen3.5-plus | Tour descriptions, chatbot, marketing copy (OpenAI-compatible API) |
| AI — Floor Plans | CubiCasa API / Custom model | 2D panorama to floor plan generation |
| Payments | Stripe | Subscription billing, usage metering, webhooks via Convex HTTP Actions |
| Email | Resend (via Convex component) | Transactional emails, lead notifications, tour sharing |
| Hosting — Frontend | Vercel | Edge network, automatic deploys from Git |
| Hosting — Backend | Convex Cloud | Managed infrastructure, automatic scaling, real-time sync |
| Analytics | PostHog + Convex aggregates | Product analytics, tour view tracking, funnel analysis |
| Monitoring | Sentry | Error tracking, performance monitoring |
| Icons | Lucide React | UI icons |
| Animation | Framer Motion | Page transitions, micro-interactions |
| State (client) | Zustand | Client-side ephemeral state (viewer controls, UI toggles) |

## Reference

- Technical Architecture Doc: `Spazeo_Technical_Architecture.docx`
- Brand Guidelines: `BRAND.md`
- Lucide Icons: https://lucide.dev
- Convex Docs: https://docs.convex.dev
- Clerk Docs: https://clerk.com/docs
- Radix UI: https://www.radix-ui.com
