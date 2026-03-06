'use client'

import { MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TableRowProps {
  children: React.ReactNode
  className?: string
  onAction?: () => void
}

export function TableRow({ children, className, onAction }: TableRowProps) {
  return (
    <div
      className={cn(
        'flex items-center h-[52px] px-4 bg-[#12100E] border-b border-[rgba(212,160,23,0.12)] hover:bg-[#1B1916] transition-colors duration-150',
        className
      )}
    >
      {children}
      {onAction && (
        <div className="flex items-center justify-center w-10">
          <button
            onClick={onAction}
            className="text-[#6B6560] hover:text-[#A8A29E] transition-colors duration-150 cursor-pointer"
            aria-label="Row actions"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

interface TableCellProps {
  children: React.ReactNode
  width?: number | string
  className?: string
}

export function TableCell({ children, width, className }: TableCellProps) {
  return (
    <div
      className={cn('flex items-center h-full px-2', !width && 'flex-1', className)}
      style={width ? { width } : undefined}
    >
      {children}
    </div>
  )
}
