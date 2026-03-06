'use client'

import { useEffect, useRef } from 'react'
import { X, Keyboard } from 'lucide-react'
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts'

interface ShortcutsOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function ShortcutsOverlay({ isOpen, onClose }: ShortcutsOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on escape
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    function handleClick(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Delay to prevent immediate close from the same click that opens it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Group shortcuts by category
  const categories = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(10,9,8,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={overlayRef}
        className="w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{
          backgroundColor: '#1B1916',
          border: '1px solid rgba(212,160,23,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(212,160,23,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            <Keyboard size={18} style={{ color: '#D4A017' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:bg-[rgba(212,160,23,0.08)]"
            aria-label="Close shortcuts overlay"
          >
            <X size={16} style={{ color: '#6B6560' }} />
          </button>
        </div>

        {/* Shortcut list */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(categories).map(([category, shortcuts]) => (
            <div key={category} className="mb-5 last:mb-0">
              <h3
                className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
              >
                {category}
              </h3>
              <div className="flex flex-col gap-1">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between py-2 px-3 rounded-lg transition-colors hover:bg-[rgba(212,160,23,0.04)]"
                  >
                    <span
                      className="text-[13px]"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-4">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span
                              className="text-[10px]"
                              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                            >
                              then
                            </span>
                          )}
                          <kbd
                            className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded text-[11px] font-semibold"
                            style={{
                              backgroundColor: '#12100E',
                              color: '#D4A017',
                              border: '1px solid rgba(212,160,23,0.2)',
                              fontFamily: 'var(--font-dmsans)',
                            }}
                          >
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 text-center"
          style={{ borderTop: '1px solid rgba(212,160,23,0.08)' }}
        >
          <p
            className="text-[11px]"
            style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
          >
            Press <kbd
              className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-semibold mx-0.5"
              style={{
                backgroundColor: '#12100E',
                color: '#D4A017',
                border: '1px solid rgba(212,160,23,0.2)',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              ?
            </kbd> to toggle this overlay
          </p>
        </div>
      </div>
    </div>
  )
}
