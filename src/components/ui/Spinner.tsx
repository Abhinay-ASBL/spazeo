'use client'

import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap: Record<NonNullable<SpinnerProps['size']>, number> = {
  sm: 16,
  md: 24,
  lg: 32,
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const px = sizeMap[size]

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex items-center justify-center', className)}
    >
      <span
        className="block animate-spin rounded-full border-2 border-[#D4A017] border-t-transparent"
        style={{ width: px, height: px }}
      />
    </span>
  )
}
