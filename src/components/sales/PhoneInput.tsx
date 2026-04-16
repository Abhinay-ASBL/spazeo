'use client'

import { useState } from 'react'
import { Phone, ArrowRight, Loader2 } from 'lucide-react'
import { normalizePhone, isValidPhone } from '@/lib/phone'

interface Props {
  onSubmit: (phone: string) => void
  loading?: boolean
}

export function PhoneInput({ onSubmit, loading = false }: Props) {
  const [raw, setRaw] = useState('')

  const digits = normalizePhone(raw)
  const valid = isValidPhone(digits)

  const handleSubmit = () => {
    if (!valid || loading) return
    onSubmit(digits)
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
      >
        <Phone size={28} style={{ color: '#D4A017' }} />
      </div>

      <div className="text-center">
        <h2
          className="text-lg font-bold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
        >
          Customer phone number
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#A8A29E' }}>
          Enter mobile number to start guided tour
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <input
          type="tel"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Enter mobile number"
          className="w-full h-12 px-4 rounded-lg text-base outline-none text-center tracking-wider"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            color: '#F5F3EF',
            fontFamily: 'var(--font-dmsans)',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
          autoFocus
        />

        <button
          disabled={!valid || loading}
          onClick={handleSubmit}
          className="w-full h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Look Up Customer
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
