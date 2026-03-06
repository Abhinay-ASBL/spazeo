'use client'

import { forwardRef } from 'react'
import { AlertCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: LucideIcon
  className?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon: Icon, className, id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[#A8A29E]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'flex items-center gap-2 rounded-lg bg-[#12100E] px-3.5 py-2.5 transition-all duration-200',
            error
              ? 'border border-[rgba(248,113,113,0.5)]'
              : 'border border-[rgba(212,160,23,0.12)] focus-within:border-[rgba(212,160,23,0.5)] focus-within:shadow-[0_0_0_3px_rgba(212,160,23,0.08)]'
          )}
        >
          {Icon && (
            <Icon size={16} className="text-[#6B6560] shrink-0" />
          )}
          <input
            ref={ref}
            id={inputId}
            className="w-full bg-transparent text-sm text-[#F5F3EF] placeholder:text-[#5A5248] focus:outline-none"
            style={{ fontFamily: 'var(--font-dmsans)' }}
            {...props}
          />
        </div>

        {error && (
          <p className="flex items-center gap-1 text-[11px] text-[#F87171]">
            <AlertCircle size={12} aria-hidden="true" />
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            className="text-[11px] text-[#5A5248]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
