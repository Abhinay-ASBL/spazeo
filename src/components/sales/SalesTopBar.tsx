'use client'

import { Phone, X } from 'lucide-react'
import { formatPhone } from '@/lib/phone'

interface Props {
  customerName?: string
  customerPhone: string
  tourTitle: string
  onEndTour: () => void
}

export function SalesTopBar({ customerName, customerPhone, tourTitle, onEndTour }: Props) {
  return (
    <div
      className="absolute top-0 left-0 w-full h-14 z-20 flex items-center justify-between px-4"
      style={{
        background: 'linear-gradient(to bottom, rgba(10,9,8,0.85), rgba(10,9,8,0.4))',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(212,160,23,0.15)' }}
        >
          <Phone size={14} style={{ color: '#D4A017' }} />
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}>
            {customerName || formatPhone(customerPhone)}
          </p>
          <p className="text-[10px]" style={{ color: '#6B6560' }}>{tourTitle}</p>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-2"
          style={{ backgroundColor: 'rgba(212,160,23,0.15)', color: '#D4A017' }}
        >
          SALES MODE
        </span>
      </div>

      <button
        onClick={onEndTour}
        className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium"
        style={{
          backgroundColor: 'rgba(248,113,113,0.15)',
          color: '#F87171',
          border: '1px solid rgba(248,113,113,0.3)',
        }}
      >
        <X size={14} />
        End Tour
      </button>
    </div>
  )
}
