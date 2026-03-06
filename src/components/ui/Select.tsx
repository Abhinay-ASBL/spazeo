'use client'

import { forwardRef } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: LucideIcon
  placeholder?: string
  options: { label: string; value: string }[]
  className?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ icon: Icon, placeholder, options, className, ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] pointer-events-none"
          />
        )}
        <select
          ref={ref}
          className={cn(
            'w-full h-10 rounded-lg bg-[#1B1916] border border-[rgba(212,160,23,0.12)] text-[#A8A29E] text-[13px] appearance-none pr-8 focus:outline-none focus:border-[rgba(212,160,23,0.5)] transition-colors duration-200',
            Icon ? 'pl-9' : 'pl-3'
          )}
          style={{ fontFamily: 'var(--font-dmsans)' }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6560] pointer-events-none"
        />
      </div>
    )
  }
)

Select.displayName = 'Select'
