import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Daily analytics rollup at 00:05 UTC — right after the UTC day closes, so
// yesterday is never missing from both the rollup and the live "today" scan.
crons.daily(
  'analytics rollup',
  { hourUTC: 0, minuteUTC: 5 },
  internal.analytics.rollupDaily,
  {},
)

// Monthly AI credit reset on 1st of each month at 0:00 UTC
crons.monthly(
  'monthly credit reset',
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.users.resetMonthlyCredits,
)

// Poll for stale reconstruction jobs every 10 minutes (missed webhooks / timed-out jobs)
crons.interval(
  'poll stale reconstruction jobs',
  { minutes: 10 },
  internal.reconstructionActions.pollStaleReconstructionJobs
)

// Purge rate-limit buckets older than 24h (public mutation abuse control)
crons.daily(
  'purge rate limit buckets',
  { hourUTC: 3, minuteUTC: 0 },
  internal.analytics.purgeRateLimitBuckets,
)


export default crons
