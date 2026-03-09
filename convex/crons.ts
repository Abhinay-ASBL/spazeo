import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Daily analytics rollup at 2:00 AM UTC
crons.daily(
  'analytics rollup',
  { hourUTC: 2, minuteUTC: 0 },
  internal.analytics.rollupDaily,
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

export default crons
