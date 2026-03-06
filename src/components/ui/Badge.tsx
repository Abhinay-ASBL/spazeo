'use client'

import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'published'
  | 'draft'
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'pro'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'default'
  | 'gold'
  | 'teal'
  | 'muted'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  published:  'bg-[rgba(45,212,191,0.13)] text-[#2DD4BF]',
  draft:      'bg-[#2E2A24] text-[#6B6560]',
  new:        'bg-[rgba(45,212,191,0.13)] text-[#2DD4BF]',
  contacted:  'bg-[rgba(212,160,23,0.13)] text-[#D4A017]',
  qualified:  'bg-[rgba(52,211,153,0.13)] text-[#34D399]',
  pro:        'bg-[rgba(212,160,23,0.13)] text-[#D4A017] text-[10px] font-bold tracking-[1px] rounded px-1.5 py-0.5',
  error:      'bg-[rgba(248,113,113,0.13)] text-[#F87171]',
  success:    'bg-[rgba(52,211,153,0.13)] text-[#34D399]',
  warning:    'bg-[rgba(251,191,36,0.13)] text-[#FBBF24]',
  info:       'bg-[rgba(45,212,191,0.13)] text-[#2DD4BF]',
  gold:       'bg-[rgba(212,160,23,0.13)] text-[#D4A017]',
  teal:       'bg-[rgba(45,212,191,0.13)] text-[#2DD4BF]',
  default:    'bg-[rgba(212,160,23,0.06)] text-[#A8A29E]',
  muted:      'bg-[#2E2A24] text-[#6B6560]',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const isPro = variant === 'pro'

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold',
        isPro
          ? 'rounded px-1.5 py-0.5 text-[10px] font-bold tracking-[1px]'
          : 'rounded-md px-2.5 py-1 text-[11px]',
        variantClasses[variant],
        className
      )}
      style={{ fontFamily: 'var(--font-dmsans)' }}
    >
      {children}
    </span>
  )
}
