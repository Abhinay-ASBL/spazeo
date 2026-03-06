'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'cta' | 'ghost' | 'teal' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  href?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#D4A017] hover:bg-[#E5B120] text-[#0A0908] border-0 font-semibold shadow-[0_0_20px_rgba(212,160,23,0.25)] hover:shadow-[0_0_32px_rgba(212,160,23,0.45)]',
  secondary:
    'bg-transparent border border-[rgba(212,160,23,0.2)] hover:border-[rgba(212,160,23,0.4)] text-[#D4A017] hover:bg-[rgba(212,160,23,0.06)]',
  cta:
    'bg-[#FB7A54] hover:bg-[#F46036] text-white shadow-[0_0_20px_rgba(251,122,84,0.3)] hover:shadow-[0_0_35px_rgba(251,122,84,0.45)]',
  ghost:
    'bg-transparent text-[#A8A29E] hover:text-[#F5F3EF] hover:bg-[rgba(212,160,23,0.06)]',
  teal:
    'bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0A0908] shadow-[0_0_20px_rgba(45,212,191,0.25)] hover:shadow-[0_0_32px_rgba(45,212,191,0.40)]',
  danger:
    'bg-[rgba(248,113,113,0.08)] hover:bg-[rgba(248,113,113,0.15)] text-[#F87171] border border-[rgba(248,113,113,0.2)] hover:border-[rgba(248,113,113,0.35)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-xs rounded-lg font-medium',
  md: 'h-10 px-5 text-sm rounded-xl font-medium',
  lg: 'h-12 px-7 text-base rounded-xl font-semibold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className,
  children,
  onClick,
  type = 'button',
  href,
  ...rest
}: ButtonProps) {
  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer font-medium whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed',
    variantClasses[variant],
    sizeClasses[size],
    isLoading && 'opacity-70',
    className
  )

  const content = (
    <>
      {isLoading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </>
  )

  if (href && !disabled && !isLoading) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...rest}
    >
      {content}
    </button>
  )
}
