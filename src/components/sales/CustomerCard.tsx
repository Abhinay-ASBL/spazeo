'use client'

import { useState } from 'react'
import { User, MapPin, Clock, Play, Edit3 } from 'lucide-react'
import { formatPhone } from '@/lib/phone'

interface CustomerData {
  customer: {
    _id: string
    phone: string
    name?: string
    email?: string
  }
  visitCount: number
  lastVisitAt: number | null
  toursVisited: Array<{ id: string; title: string }>
}

interface Props {
  data: CustomerData | null
  phone: string
  onStartTour: (customerId: string, customerName?: string) => void
  onBack: () => void
  isNew: boolean
}

export function CustomerCard({ data, phone, onStartTour, onBack, isNew }: Props) {
  const [name, setName] = useState(data?.customer.name ?? '')

  const handleStart = () => {
    if (isNew) {
      onStartTour('', name.trim() || undefined)
    } else if (data) {
      onStartTour(data.customer._id, name.trim() || undefined)
    }
  }

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
      style={{
        backgroundColor: '#12100E',
        border: '1px solid rgba(212,160,23,0.15)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: isNew ? 'rgba(45,212,191,0.12)' : 'rgba(212,160,23,0.12)' }}
        >
          <User size={22} style={{ color: isNew ? '#2DD4BF' : '#D4A017' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}>
            {isNew ? 'New customer' : (data?.customer.name ?? 'Returning customer')}
          </p>
          <p className="text-xs" style={{ color: '#A8A29E' }}>{formatPhone(phone)}</p>
        </div>
        {isNew && (
          <span
            className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(45,212,191,0.15)', color: '#2DD4BF' }}
          >
            NEW
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs flex items-center gap-1" style={{ color: '#A8A29E' }}>
          <Edit3 size={12} />
          {isNew ? 'Customer name (optional)' : 'Name'}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
          className="w-full h-10 px-3 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            color: '#F5F3EF',
            fontFamily: 'var(--font-dmsans)',
          }}
        />
      </div>

      {!isNew && data && data.visitCount > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 text-xs" style={{ color: '#A8A29E' }}>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {data.visitCount} visit{data.visitCount !== 1 ? 's' : ''}
            </span>
            {data.lastVisitAt && (
              <span>Last: {new Date(data.lastVisitAt).toLocaleDateString()}</span>
            )}
          </div>
          {data.toursVisited.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.toursVisited.map((t) => (
                <span
                  key={t.id}
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(212,160,23,0.08)',
                    color: '#A8A29E',
                    border: '1px solid rgba(212,160,23,0.1)',
                  }}
                >
                  <MapPin size={10} className="inline mr-0.5" style={{ verticalAlign: '-1px' }} />
                  {t.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-1">
        <button
          onClick={onBack}
          className="flex-1 h-11 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'transparent',
            border: '1.5px solid rgba(212,160,23,0.3)',
            color: '#D4A017',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          Back
        </button>
        <button
          onClick={handleStart}
          className="flex-[2] h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <Play size={16} />
          Start Tour
        </button>
      </div>
    </div>
  )
}
