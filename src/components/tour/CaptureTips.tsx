'use client'

import { useState, useEffect } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Footprints,
  Maximize,
  Sun,
  EyeOff,
  Clock,
  Camera,
  Layers,
  ArrowUpDown,
} from 'lucide-react'

interface CaptureTipsProps {
  tab: 'video' | 'photos'
}

const VIDEO_TIPS = [
  { icon: Footprints, text: 'Walk slowly and steadily' },
  { icon: Maximize, text: 'Cover all corners of the room' },
  { icon: Sun, text: 'Keep good lighting — turn on all lights' },
  { icon: EyeOff, text: 'Avoid mirrors and windows' },
  { icon: Clock, text: 'Record 1-3 minutes per room' },
]

const PHOTO_TIPS = [
  { icon: Camera, text: 'Take 10-30 photos from different angles' },
  { icon: Layers, text: 'Overlap each shot by ~60%' },
  { icon: Maximize, text: 'Cover all walls and corners' },
  { icon: ArrowUpDown, text: 'Include floor and ceiling edges' },
]

const STORAGE_KEY = 'spazeo-capture-tips-seen'

export function CaptureTips({ tab }: CaptureTipsProps) {
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen === 'true') {
      setExpanded(false)
    }
  }, [])

  function handleToggle() {
    const next = !expanded
    setExpanded(next)
    if (!next) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }

  const tips = tab === 'video' ? VIDEO_TIPS : PHOTO_TIPS

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.1)',
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold">Capture Tips</span>
        {expanded ? (
          <ChevronUp size={16} style={{ color: '#A8A29E' }} />
        ) : (
          <ChevronDown size={16} style={{ color: '#A8A29E' }} />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {tips.map((tip) => {
            const Icon = tip.icon
            return (
              <div key={tip.text} className="flex items-start gap-3">
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: '#D4A017' }}
                />
                <span
                  className="text-xs leading-relaxed"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  {tip.text}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
