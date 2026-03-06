'use client'

import { forwardRef } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  shortcut?: string
  className?: string
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ shortcut = '\u2318K', className, placeholder = 'Search tours...', ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex items-center gap-2 h-10 rounded-lg bg-[#1B1916] border border-[rgba(212,160,23,0.12)] px-3',
          className
        )}
      >
        <Search size={16} className="text-[#6B6560] shrink-0" />
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-[13px] text-[#F5F3EF] placeholder:text-[#5A5248] focus:outline-none"
          style={{ fontFamily: 'var(--font-dmsans)' }}
          {...props}
        />
        {shortcut && (
          <span
            className="flex items-center justify-center h-[22px] px-1.5 rounded bg-[#2E2A24] text-[10px] font-medium text-[#6B6560] shrink-0"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            {shortcut}
          </span>
        )}
      </div>
    )
  }
)

SearchBar.displayName = 'SearchBar'
