'use client'

import { Info, Monitor, Phone, Users, type LucideIcon } from 'lucide-react'
import { formatCount } from '@/components/analytics/analyticsFormat'

const ESTIMATED_METHOD =
  'Estimated visitors = distinct visitor records with confidence of 70 or more. Not a census. Phone from the lead form is unverified and never scored 100.'

function ScaleBar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max <= 0 ? 0 : Math.max((value / max) * 100, value > 0 ? 4 : 0)
  return (
    <div
      aria-hidden
      className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--bg-surface)]"
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  )
}

interface Cell {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  color: string
  method?: string
}

export function PeopleReachBand({
  devices,
  estimated,
  knownContacts,
  headingId = 'people-reach-heading',
}: {
  devices: number
  estimated: number
  knownContacts: number
  hasVisitorIds?: boolean
  headingId?: string
}) {
  const max = Math.max(devices, estimated, knownContacts, 1)
  const cells: Cell[] = [
    {
      label: 'Devices',
      value: devices,
      hint: 'this browser',
      icon: Monitor,
      color: 'var(--text-secondary)',
    },
    {
      label: 'Estimated visitors',
      value: estimated,
      hint: 'confidence ≥ 70',
      icon: Users,
      color: 'var(--teal-primary)',
      method: ESTIMATED_METHOD,
    },
    {
      label: 'Known contacts',
      value: knownContacts,
      hint: 'phone on form',
      icon: Phone,
      color: 'var(--gold-primary)',
    },
  ]

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="m-0 font-[family-name:var(--font-dmsans)] text-[15px] font-semibold text-[var(--text-primary)]"
      >
        People (estimated)
      </h2>
      <p className="mt-1 mb-3 font-[family-name:var(--font-dmsans)] text-xs text-[var(--text-muted)]">
        Three numbers, always together — never one Unique Visitors figure. Phone is
        unverified.
      </p>
      <div className="grid grid-cols-1 divide-y divide-[var(--border-visible)] overflow-hidden rounded-xl border border-[var(--border-gold)] bg-[var(--bg-elevated)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {cells.map((cell) => {
          const Icon = cell.icon
          return (
            <div key={cell.label} className="px-6 py-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-[family-name:var(--font-dmsans)] text-[13px] text-[var(--text-secondary)]">
                  {cell.label}
                  {cell.method ? (
                    <button
                      type="button"
                      aria-label={cell.method}
                      title={cell.method}
                      className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm text-[var(--text-muted)]"
                    >
                      <Info size={12} strokeWidth={1.5} />
                    </button>
                  ) : null}
                </span>
                <Icon size={16} style={{ color: cell.color }} strokeWidth={1.5} />
              </div>
              <div className="font-[family-name:var(--font-jakarta)] text-[28px] font-bold leading-tight text-[var(--text-primary)]">
                {formatCount(cell.value)}
              </div>
              <p className="mt-2 mb-0 font-[family-name:var(--font-dmsans)] text-xs text-[var(--text-muted)]">
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
    <div className="flex flex-col gap-3">
      <PeopleReachBand
        devices={devices}
        estimated={estimated}
        knownContacts={knownContacts}
        hasVisitorIds={hasVisitorIds}
        headingId="tour-people-reach-heading"
      />
      <p className="m-0 font-[family-name:var(--font-dmsans)] text-xs text-[var(--text-muted)]">
        Returning this tour:{' '}
        <span className="font-semibold text-[var(--text-primary)]">
          {formatCount(returning)}
        </span>
        {' · '}
        visitors with more than one session
      </p>
    </div>
  )
}
