'use client'

import {
  Clock,
  Eye,
  Repeat,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { PeopleReachBand } from '@/components/analytics/PeopleReachBand'
import {
  formatCompact,
  formatCount,
  formatDuration,
  formatRate,
} from '@/components/analytics/analyticsFormat'

export type PeriodLabel = '7D' | '30D' | '90D' | 'All'
export { TourPeopleReach } from '@/components/analytics/PeopleReachBand'

function trendBadge(value: number) {
  if (value === 0) return null
  const positive = value > 0
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
      style={{
        color: positive ? 'var(--success)' : 'var(--error)',
        backgroundColor: positive ? 'var(--success-bg)' : 'var(--error-bg)',
      }}
    >
      {positive ? '+' : ''}
      {value}%
    </span>
  )
}

function ActivityCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  trend?: number
}) {
  return (
    <div className="rounded-xl border border-[var(--border-visible)] bg-[var(--bg-elevated)] px-6 py-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-dmsans)] text-[13px] text-[var(--text-secondary)]">
            {label}
          </span>
          {trend !== undefined ? trendBadge(trend) : null}
        </div>
        <Icon size={16} className="text-[var(--text-muted)]" strokeWidth={1.5} />
      </div>
      <div className="font-[family-name:var(--font-jakarta)] text-[28px] font-bold leading-tight text-[var(--text-primary)]">
        {value}
      </div>
      <p className="mt-2 mb-0 font-[family-name:var(--font-dmsans)] text-xs text-[var(--text-muted)]">
        {hint}
      </p>
    </div>
  )
}

export function AnalyticsTotals({
  periodLabel,
  devices,
  estimated,
  knownContacts,
  hasVisitorIds,
  periodViews,
  periodSessions,
  periodLeads,
  viewsTrend,
  sessionsTrend,
  leadsTrend,
  avgSceneTime,
  conversionRate,
  allTimeViews,
  allTimeLeads,
}: {
  periodLabel: PeriodLabel
  devices: number
  estimated: number
  knownContacts: number
  hasVisitorIds: boolean
  periodViews: number
  periodSessions: number
  periodLeads: number
  viewsTrend: number
  sessionsTrend: number
  leadsTrend: number
  avgSceneTime: number
  conversionRate: number
  allTimeViews: number
  allTimeLeads: number
}) {
  return (
    <div className="mb-6 flex flex-col gap-6">
      <PeopleReachBand
        devices={devices}
        estimated={estimated}
        knownContacts={knownContacts}
        hasVisitorIds={hasVisitorIds}
      />

      <section aria-labelledby="period-activity-heading">
        <h2
          id="period-activity-heading"
          className="mb-3 font-[family-name:var(--font-dmsans)] text-[15px] font-semibold text-[var(--text-primary)]"
        >
          This period · {periodLabel}
        </h2>
        {periodViews === 0 && periodLeads === 0 ? (
          <p className="mb-3 font-[family-name:var(--font-dmsans)] text-[13px] text-[var(--text-muted)]">
            No tours viewed in this period.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActivityCard
            label="Views"
            value={formatCount(periodViews)}
            hint={`Tour opens in ${periodLabel}. All-time ${formatCompact(allTimeViews)}.`}
            icon={Eye}
            trend={viewsTrend}
          />
          <ActivityCard
            label="Sessions"
            value={formatCount(periodSessions)}
            hint="Distinct tabs. A refresh in the same tab is one session."
            icon={Repeat}
            trend={sessionsTrend}
          />
          <ActivityCard
            label="Leads"
            value={formatCount(periodLeads)}
            hint={`New enquiries in ${periodLabel}. All-time ${formatCompact(allTimeLeads)}.`}
            icon={UserPlus}
            trend={leadsTrend}
          />
          <ActivityCard
            label="Avg. scene time"
            value={formatDuration(avgSceneTime)}
            hint={`${formatRate(conversionRate)}% of views became a lead this period.`}
            icon={Clock}
          />
        </div>
      </section>
    </div>
  )
}
