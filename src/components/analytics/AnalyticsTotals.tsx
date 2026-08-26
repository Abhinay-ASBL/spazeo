'use client'

import {
  Clock,
  Eye,
  Info,
  Monitor,
  Phone,
  Repeat,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type PeriodLabel = '7D' | '30D' | '90D' | 'All'

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString()
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function trendBadge(value: number) {
  if (value === 0) return null
  const positive = value > 0
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 9999,
        color: positive ? '#34D399' : '#F87171',
        backgroundColor: positive ? 'rgba(52,211,153,0.13)' : 'rgba(248,113,113,0.13)',
      }}
    >
      {positive ? '+' : ''}
      {value}%
    </span>
  )
}

const PEOPLE_METHOD =
  'Devices is the floor: distinct browsers. Estimated is visitor records with confidence of 70 or more. Known contacts typed a phone on the lead form — unverified, not a unique-human count.'

function ScaleBar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max <= 0 ? 0 : Math.max((value / max) * 100, value > 0 ? 4 : 0)
  return (
    <div
      aria-hidden
      style={{
        height: 4,
        borderRadius: 9999,
        backgroundColor: '#12100E',
        overflow: 'hidden',
        marginTop: 12,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          backgroundColor: color,
          borderRadius: 9999,
        }}
      />
    </div>
  )
}

interface PeopleCell {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  color: string
  honesty: string
  method?: string
}

function PeopleReachBand({
  devices,
  estimated,
  knownContacts,
  hasVisitorIds,
  headingId = 'people-reach-heading',
}: {
  devices: number
  estimated: number
  knownContacts: number
  hasVisitorIds: boolean
  headingId?: string
}) {
  const max = Math.max(devices, estimated, knownContacts, 1)
  const cells: PeopleCell[] = [
    {
      label: 'Devices',
      value: devices,
      hint: 'Distinct deviceId. Floor — undercounts people who switch browsers.',
      icon: Monitor,
      color: '#A8A29E',
      honesty: 'Floor',
    },
    {
      label: 'Estimated visitors',
      value: estimated,
      hint: hasVisitorIds
        ? 'Visitor records with confidence ≥ 70. Best estimate, not a census.'
        : 'Identity graph is empty for this window. Sessions are counted separately below.',
      icon: Users,
      color: '#2DD4BF',
      honesty: hasVisitorIds ? 'Estimate' : 'No graph yet',
      method:
        'Estimated visitors = distinct visitor records with confidence of 70 or more. Not verified. Phone from the lead form is unverified and never scored 100.',
    },
    {
      label: 'Known contacts',
      value: knownContacts,
      hint: 'Phone on the lead form. Unverified. People you can actually call.',
      icon: Phone,
      color: '#D4A017',
      honesty: 'Call list',
    },
  ]

  return (
    <section aria-labelledby={headingId}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            id={headingId}
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#A8A29E',
              fontFamily: 'var(--font-dmsans)',
              margin: 0,
            }}
          >
            People
          </h2>
          <p
            style={{
              fontSize: 12,
              color: '#6B6560',
              margin: '4px 0 0',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Three readings of the same crowd. Never one “unique visitors” number.
          </p>
        </div>
        <button
          type="button"
          aria-label={PEOPLE_METHOD}
          title={PEOPLE_METHOD}
          className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
          style={{
            color: '#6B6560',
            backgroundColor: 'transparent',
            border: '1px solid rgba(212,160,23,0.12)',
          }}
        >
          <Info size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[rgba(212,160,23,0.12)]"
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(212,160,23,0.16)',
          backgroundColor: '#1B1916',
        }}
      >
        {cells.map((cell) => {
          const Icon = cell.icon
          return (
            <div
              key={cell.label}
              style={{
                padding: '20px 24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: cell.color,
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {cell.honesty}
                </span>
                <Icon size={16} style={{ color: cell.color }} strokeWidth={1.5} />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#A8A29E',
                  fontFamily: 'var(--font-dmsans)',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {cell.label}
                {cell.method ? (
                  <button
                    type="button"
                    aria-label={cell.method}
                    title={cell.method}
                    className="inline-flex items-center justify-center rounded-sm min-w-[24px] min-h-[24px]"
                    style={{
                      color: '#6B6560',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                    }}
                  >
                    <Info size={12} strokeWidth={1.5} />
                  </button>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                  lineHeight: 1.1,
                }}
              >
                {formatNumber(cell.value)}
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: '#6B6560',
                  margin: '8px 0 0',
                  lineHeight: 1.4,
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {cell.hint}
              </p>
              <ScaleBar value={cell.value} max={max} color={cell.color} />
            </div>
          )
        })}
      </div>
    </section>
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
    <div
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.12)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}>
            {label}
          </span>
          {trend !== undefined ? trendBadge(trend) : null}
        </div>
        <Icon size={16} style={{ color: '#6B6560' }} strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#F5F3EF',
          fontFamily: 'var(--font-jakarta)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <p
        style={{
          fontSize: 11,
          color: '#6B6560',
          margin: '8px 0 0',
          fontFamily: 'var(--font-dmsans)',
        }}
      >
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
  leadsTrend: number
  avgSceneTime: number
  conversionRate: number
  allTimeViews: number
  allTimeLeads: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 24 }}>
      <PeopleReachBand
        devices={devices}
        estimated={estimated}
        knownContacts={knownContacts}
        hasVisitorIds={hasVisitorIds}
      />

      <section aria-labelledby="period-activity-heading">
        <h2
          id="period-activity-heading"
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#A8A29E',
            fontFamily: 'var(--font-dmsans)',
            margin: '0 0 12px',
          }}
        >
          This period · {periodLabel}
        </h2>
        {periodViews === 0 && periodLeads === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: '#6B6560',
              fontFamily: 'var(--font-dmsans)',
              margin: '0 0 12px',
            }}
          >
            No tours viewed in this period.
          </p>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
          <ActivityCard
            label="Views"
            value={formatNumber(periodViews)}
            hint={`Tour opens in ${periodLabel}. All-time ${formatNumber(allTimeViews)}.`}
            icon={Eye}
            trend={viewsTrend}
          />
          <ActivityCard
            label="Sessions"
            value={formatNumber(periodSessions)}
            hint="Distinct tabs. A refresh in the same tab is one session."
            icon={Repeat}
          />
          <ActivityCard
            label="Leads"
            value={formatNumber(periodLeads)}
            hint={`New enquiries in ${periodLabel}. All-time ${formatNumber(allTimeLeads)}.`}
            icon={UserPlus}
            trend={leadsTrend}
          />
          <ActivityCard
            label="Avg. scene time"
            value={formatDuration(avgSceneTime)}
            hint={`${conversionRate}% of views became a lead this period.`}
            icon={Clock}
          />
        </div>
      </section>
    </div>
  )
}

export function TourPeopleReach({
  devices,
  estimated,
  knownContacts,
  returning,
  hasVisitorIds,
}: {
  devices: number
  estimated: number
  knownContacts: number
  returning: number
  hasVisitorIds: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PeopleReachBand
        devices={devices}
        estimated={estimated}
        knownContacts={knownContacts}
        hasVisitorIds={hasVisitorIds}
        headingId="tour-people-reach-heading"
      />
      <p
        style={{
          fontSize: 12,
          color: '#6B6560',
          fontFamily: 'var(--font-dmsans)',
          margin: 0,
        }}
      >
        Returning this tour:{' '}
        <span style={{ color: '#F5F3EF', fontWeight: 600 }}>{formatNumber(returning)}</span>
        {' · '}
        visitors with more than one session
      </p>
    </div>
  )
}
