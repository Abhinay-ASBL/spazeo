'use client'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-8 rounded-xl',
        className
      )}
      style={{
        backgroundColor: '#12100E',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl"
        style={{
          backgroundColor: 'rgba(212, 160, 23, 0.08)',
          border: '1px solid rgba(212, 160, 23, 0.2)',
          color: '#D4A017',
        }}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-semibold" style={{ color: '#F5F3EF' }}>{title}</h3>
      <p className="mt-2 text-sm max-w-sm" style={{ color: '#6B6560' }}>{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
