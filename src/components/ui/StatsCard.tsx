'use client'

import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: number | string
  change?: number
  icon?: React.ReactNode
  className?: string
}

export function StatsCard({ label, value, change, icon, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl bg-[#1B1916] border border-[rgba(212,160,23,0.12)] p-5 px-6',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-[#6B6560]">{icon}</span>
          )}
          <span
            className="text-[13px] text-[#A8A29E]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            {label}
          </span>
        </div>
        {change !== undefined && (
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-semibold',
              change >= 0
                ? 'bg-[rgba(52,211,153,0.13)] text-[#34D399]'
                : 'bg-[rgba(248,113,113,0.13)] text-[#F87171]'
            )}
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <span
        className="text-[32px] font-bold text-[#F5F3EF]"
        style={{ fontFamily: 'var(--font-jakarta)' }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}
