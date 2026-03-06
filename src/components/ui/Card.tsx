'use client'

import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  gradient?: boolean
  hover?: boolean
}

export function Card({ children, className, gradient = false, hover = false }: CardProps) {
  if (gradient) {
    return (
      <div
        className={cn(
          'relative rounded-2xl p-[1px]',
          hover && 'hover:-translate-y-1 transition-all duration-300 cursor-pointer',
          className
        )}
        style={{
          background: 'linear-gradient(135deg, rgba(212,160,23,0.4) 0%, rgba(45,212,191,0.15) 60%, rgba(255,255,255,0.04) 100%)',
        }}
      >
        <div
          className="rounded-[15px] p-6 h-full"
          style={{ backgroundColor: '#12100E' }}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all duration-300',
        hover && 'hover:-translate-y-1 cursor-pointer',
        className
      )}
      style={{
        backgroundColor: '#12100E',
        border: '1px solid rgba(212, 160, 23, 0.12)',
      }}
      onMouseEnter={
        hover
          ? (e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(212, 160, 23, 0.25)'
              el.style.boxShadow = '0 0 30px rgba(212,160,23,0.08)'
            }
          : undefined
      }
      onMouseLeave={
        hover
          ? (e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(212, 160, 23, 0.12)'
              el.style.boxShadow = 'none'
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}
