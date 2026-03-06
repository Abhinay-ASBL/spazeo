'use client'

import { cn } from '@/lib/utils'

interface TableColumn {
  key: string
  label: string
  width?: number | string
}

interface TableHeaderProps {
  columns: TableColumn[]
  hasActions?: boolean
  className?: string
}

export function TableHeader({ columns, hasActions = true, className }: TableHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center h-10 px-4 rounded-t-lg bg-[#1B1916] border-b border-[rgba(212,160,23,0.12)]',
        className
      )}
    >
      {columns.map((col) => (
        <div
          key={col.key}
          className={cn('flex items-center h-full px-2', !col.width && 'flex-1')}
          style={col.width ? { width: col.width } : undefined}
        >
          <span
            className="text-[11px] font-semibold tracking-[0.5px] uppercase text-[#6B6560]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            {col.label}
          </span>
        </div>
      ))}
      {hasActions && (
        <div className="flex items-center justify-center h-full w-10" />
      )}
    </div>
  )
}
