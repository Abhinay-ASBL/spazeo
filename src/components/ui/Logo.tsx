'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  href?: string
  className?: string
}

export function Logo({ href = '/', className }: LogoProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span
        className="text-xl font-black tracking-[2px] text-[#F5F3EF]"
        style={{ fontFamily: 'var(--font-jakarta)' }}
      >
        SPAZE
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A017] shrink-0" />
      <span
        className="text-xl font-black tracking-[2px] text-[#F5F3EF]"
        style={{ fontFamily: 'var(--font-jakarta)' }}
      >
        O
      </span>
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Spazeo home"
        className="hover:opacity-80 transition-opacity duration-200"
      >
        {content}
      </Link>
    )
  }

  return content
}
