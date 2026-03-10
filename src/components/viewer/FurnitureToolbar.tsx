'use client'

import { useEffect, useCallback } from 'react'
import { RotateCw, Maximize2, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFurnitureStore } from '@/hooks/useFurnitureStore'

export function FurnitureToolbar() {
  const selectedId = useFurnitureStore((s) => s.selectedId)
  const transformMode = useFurnitureStore((s) => s.transformMode)
  const setTransformMode = useFurnitureStore((s) => s.setTransformMode)
  const removeItem = useFurnitureStore((s) => s.removeItem)
  const setSelectedId = useFurnitureStore((s) => s.setSelectedId)
  const mode = useFurnitureStore((s) => s.mode)

  const handleDelete = useCallback(() => {
    if (!selectedId) return
    removeItem(selectedId)
    setSelectedId(null)
  }, [selectedId, removeItem, setSelectedId])

  // Keyboard shortcuts
  useEffect(() => {
    if (mode !== 'furnish' || !selectedId) return

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault()
          setTransformMode('rotate')
          break
        case 's':
          e.preventDefault()
          setTransformMode('scale')
          break
        case 'delete':
        case 'backspace':
          e.preventDefault()
          handleDelete()
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mode, selectedId, setTransformMode, handleDelete])

  const isVisible = mode === 'furnish' && selectedId !== null

  const buttons = [
    {
      key: 'rotate' as const,
      Icon: RotateCw,
      label: 'Rotate',
      hint: 'R',
      onClick: () => setTransformMode('rotate'),
      isActive: transformMode === 'rotate',
      hoverColor: undefined,
    },
    {
      key: 'scale' as const,
      Icon: Maximize2,
      label: 'Scale',
      hint: 'S',
      onClick: () => setTransformMode('scale'),
      isActive: transformMode === 'scale',
      hoverColor: undefined,
    },
    {
      key: 'delete' as const,
      Icon: Trash2,
      label: 'Delete',
      hint: 'Del',
      onClick: handleDelete,
      isActive: false,
      hoverColor: '#F87171',
    },
  ]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute left-1/2 -translate-x-1/2 z-20"
          style={{ bottom: 80 }}
        >
          <div
            className="rounded-full flex items-center gap-1"
            style={{
              backgroundColor: 'rgba(10, 9, 8, 0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(212, 160, 23, 0.2)',
              padding: '4px 6px',
            }}
          >
            {buttons.map(({ key, Icon, label, hint, onClick, isActive, hoverColor }) => (
              <div key={key} className="relative group">
                <button
                  onClick={onClick}
                  aria-label={label}
                  className="flex items-center justify-center rounded-full transition-all"
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: isActive ? '#D4A017' : 'transparent',
                    color: isActive ? '#0A0908' : '#F5F3EF',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (hoverColor && !isActive) {
                      e.currentTarget.style.color = hoverColor
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (hoverColor && !isActive) {
                      e.currentTarget.style.color = '#F5F3EF'
                    }
                  }}
                >
                  <Icon size={18} strokeWidth={1.5} />
                </button>
                {/* Tooltip with keyboard hint */}
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    backgroundColor: 'rgba(10, 9, 8, 0.9)',
                    color: '#A8A29E',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {label} <span style={{ color: '#6B6560' }}>({hint})</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
