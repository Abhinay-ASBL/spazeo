'use client'

import { cn } from '@/lib/utils'

type AvatarSize = 'sm' | 'md' | 'lg'
type AvatarColor = 'teal' | 'gold'

interface UserAvatarProps {
  initials: string
  name?: string
  size?: AvatarSize
  color?: AvatarColor
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 rounded-[14px] text-[11px]',
  md: 'w-9 h-9 rounded-[18px] text-[13px]',
  lg: 'w-16 h-16 rounded-[32px] text-xl',
}

const colorMap: Record<AvatarColor, { bg: string; text: string }> = {
  teal: {
    bg: 'bg-[rgba(45,212,191,0.19)]',
    text: 'text-[#2DD4BF]',
  },
  gold: {
    bg: 'bg-[rgba(212,160,23,0.13)]',
    text: 'text-[#D4A017]',
  },
}

export function UserAvatar({
  initials,
  name,
  size = 'md',
  color = 'teal',
  className,
}: UserAvatarProps) {
  const colors = colorMap[color]

  const avatar = (
    <div
      className={cn(
        'flex items-center justify-center font-semibold shrink-0',
        sizeClasses[size],
        colors.bg,
        colors.text,
        className
      )}
      style={{
        fontFamily: size === 'lg' ? 'var(--font-jakarta)' : 'var(--font-dmsans)',
      }}
    >
      {initials}
    </div>
  )

  if (name) {
    return (
      <div className="flex items-center gap-3">
        {avatar}
        <span
          className="text-[13px] font-medium text-[#F5F3EF]"
          style={{ fontFamily: 'var(--font-dmsans)' }}
        >
          {name}
        </span>
      </div>
    )
  }

  return avatar
}
