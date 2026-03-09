---
phase: 02-3d-capture-pipeline-and-splat-viewer
plan: 05
subsystem: infra
tags: [runpod, gpu, webhook, cron, reconstruction, gaussian-splatting]

requires:
  - phase: 02-01
    provides: "reconstructionJobs schema, create/complete/fail mutations, notification system"
  - phase: 02-03
    provides: "CaptureUpload UI that creates reconstruction jobs"
  - phase: 02-04
    provides: "ReconstructionProgress UI and result acceptance flow"
provides:
  - "submitToRunPod action that sends jobs to RunPod serverless GPU endpoint"
  - "/gpu-callback HTTP endpoint for RunPod webhook delivery"
  - "pollStaleReconstructionJobs cron for missed webhook fallback"
  - "Three-layer reliability pattern: fire-and-forget + webhook + cron"
affects: [02-06, viewer, reconstruction]

tech-stack:
  added: []
  patterns: ["RunPod serverless API integration", "webhook + cron fallback for job reliability", "internalAction for external API calls"]

key-files:
  created:
    - convex/reconstructionActions.ts
  modified:
    - convex/reconstructionJobs.ts
    - convex/http.ts
    - convex/crons.ts

key-decisions:
  - "failById uses Convex job ID directly; fail uses runpodJobId lookup — both needed for different callers"
  - "getStaleJobs filters by startedAt < 30min cutoff in-memory after collecting by status index"
  - "RUNPOD_WEBHOOK_SECRET is optional — webhook handler skips verification when unset for dev convenience"

patterns-established:
  - "Three-layer job reliability: scheduler (fire-and-forget) + webhook callback + cron polling"
  - "HTTP action webhook pattern: verify shared secret, parse body, call internal mutations"

requirements-completed: [CAP-03, CAP-04]

duration: 4m
completed: 2026-03-09
---

# Phase 02 Plan 05: RunPod GPU Pipeline Integration Summary

**RunPod serverless GPU integration with webhook callback endpoint, auto-submission on job creation, and 10-minute stale job polling cron for three-layer reliability**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T13:15:33Z
- **Completed:** 2026-03-09T13:19:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- submitToRunPod action calls RunPod /run API with input URLs, webhook callback, and SPZ output format
- /gpu-callback HTTP endpoint processes COMPLETED (downloads SPZ, stores in Convex), FAILED, and IN_PROGRESS statuses
- Stale job polling cron runs every 10 minutes, catches missed webhooks, force-fails jobs older than 2 hours
- create mutation auto-schedules GPU submission via ctx.scheduler.runAfter(0, ...)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create submitToRunPod action and wire into reconstruction flow** - `d3ba9fc` (feat)
2. **Task 2: Add /gpu-callback HTTP endpoint and stale job polling cron** - `de069b9` (feat)

## Files Created/Modified
- `convex/reconstructionActions.ts` - submitToRunPod action and pollStaleReconstructionJobs cron action
- `convex/reconstructionJobs.ts` - Added getById, getStaleJobs, findByRunpodJobId queries and failById mutation; wired scheduler in create
- `convex/http.ts` - /gpu-callback POST endpoint with webhook secret verification and CORS preflight
- `convex/crons.ts` - Registered 10-minute stale job polling cron

## Decisions Made
- failById uses Convex job ID directly while fail uses runpodJobId lookup -- both needed since submitToRunPod has the Convex ID before runpodJobId exists, while webhook only knows runpodJobId
- getStaleJobs collects all jobs by status index then filters in-memory by startedAt cutoff -- acceptable since active jobs are always a small set
- RUNPOD_WEBHOOK_SECRET verification is optional in the callback handler -- when unset, any POST is accepted for dev/testing convenience
- findByRunpodJobId added as separate internalQuery for IN_PROGRESS webhook updates that need jobId for updateStatus

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added findByRunpodJobId internal query**
- **Found during:** Task 2 (gpu-callback IN_PROGRESS handler)
- **Issue:** IN_PROGRESS webhook needs the Convex jobId to call updateStatus, but only has runpodJobId from the webhook body
- **Fix:** Added findByRunpodJobId internalQuery that scans jobs by runpodJobId
- **Files modified:** convex/reconstructionJobs.ts
- **Committed in:** de069b9

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for IN_PROGRESS webhook handling. No scope creep.

## Issues Encountered
None

## User Setup Required

External services require manual configuration:
- `RUNPOD_API_KEY` - RunPod Console -> Settings -> API Keys
- `RUNPOD_ENDPOINT_ID` - RunPod Console -> Serverless -> Endpoints
- `RUNPOD_WEBHOOK_SECRET` - Generate via `openssl rand -hex 32`
- `CONVEX_SITE_URL` - The Convex HTTP actions base URL (e.g., `https://xxx.convex.site`)

Set via: `npx convex env set VARIABLE_NAME value`

## Next Phase Readiness
- Full RunPod pipeline wired: upload -> submit -> webhook/poll -> complete/fail
- Plan 06 (quality review and viewer integration) can consume completed reconstructions
- UI from Plans 03-04 auto-updates reactively as job status changes

---
*Phase: 02-3d-capture-pipeline-and-splat-viewer*
*Completed: 2026-03-09*
