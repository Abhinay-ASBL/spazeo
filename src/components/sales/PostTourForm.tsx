'use client'

import { useState } from 'react'
import { Flame, Sun, Snowflake, Loader2 } from 'lucide-react'

type InterestLevel = 'hot' | 'warm' | 'cold'

interface Props {
  customerName?: string
  onSave: (data: {
    interestLevel?: InterestLevel
    postTourNote?: string
    customerName?: string
  }) => void
  onSkip: () => void
  saving?: boolean
}

const LEVELS: Array<{
  value: InterestLevel
  label: string
  icon: typeof Flame
  color: string
  bg: string
}> = [
  { value: 'hot', label: 'Hot', icon: Flame, color: '#FB7A54', bg: 'rgba(251,122,84,0.15)' },
  { value: 'warm', label: 'Warm', icon: Sun, color: '#D4A017', bg: 'rgba(212,160,23,0.15)' },
  { value: 'cold', label: 'Cold', icon: Snowflake, color: '#A8A29E', bg: 'rgba(168,162,158,0.15)' },
]

export function PostTourForm({ customerName, onSave, onSkip, saving = false }: Props) {
  const [interest, setInterest] = useState<InterestLevel | undefined>(undefined)
  const [name, setName] = useState(customerName ?? '')
  const [note, setNote] = useState('')

  const handleSave = () => {
    if (saving) return
    onSave({
      interestLevel: interest,
      postTourNote: note.trim() || undefined,
      customerName: name.trim() || undefined,
    })
  }

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
      style={{
        backgroundColor: '#12100E',
        border: '1px solid rgba(212,160,23,0.15)',
      }}
    >
      <div className="text-center">
        <h2
          className="text-lg font-bold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
        >
          Tour complete
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#A8A29E' }}>
          Quick notes about this visit (optional)
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs" style={{ color: '#A8A29E' }}>Interest level</label>
        <div className="flex gap-2">
          {LEVELS.map((l) => {
            const Icon = l.icon
            const active = interest === l.value
            return (
              <button
                key={l.value}
                onClick={() => setInterest(active ? undefined : l.value)}
                className="flex-1 h-10 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                style={{
                  backgroundColor: active ? l.bg : 'transparent',
                  border: active ? `1.5px solid ${l.color}` : '1px solid rgba(212,160,23,0.12)',
                  color: active ? l.color : '#6B6560',
                }}
              >
                <Icon size={14} />
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      {!customerName && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs" style={{ color: '#A8A29E' }}>Customer name</label>
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
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs" style={{ color: '#A8A29E' }}>Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Quick observations about this visit..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            color: '#F5F3EF',
            fontFamily: 'var(--font-dmsans)',
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save & Finish'}
        </button>
        <button
          onClick={onSkip}
          disabled={saving}
          className="w-full h-9 text-xs"
          style={{ color: '#6B6560' }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
