'use client'

import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-[#D4A017]' : 'bg-[#2E2A24]',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200',
          checked
            ? 'translate-x-[22px] bg-white'
            : 'translate-x-0.5 bg-[#A8A29E]'
        )}
        style={{ marginTop: 2 }}
      />
    </button>
  )
}
