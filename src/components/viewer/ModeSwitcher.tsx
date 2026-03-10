'use client'

import { useEffect, useRef, useCallback } from 'react'
import { BoxSelect, Move3d, MapPin, Armchair } from 'lucide-react'
import { useSplatViewerStore, type NavMode } from '@/hooks/useSplatViewerStore'
import { useFurnitureStore } from '@/hooks/useFurnitureStore'

const MODES: Array<{ key: NavMode; label: string; Icon: typeof BoxSelect }> = [
  { key: 'dollhouse', label: 'Dollhouse', Icon: BoxSelect },
  { key: 'freeRoam', label: 'Free Roam', Icon: Move3d },
  { key: 'hotspot', label: 'Hotspots', Icon: MapPin },
]

const AUTO_HIDE_MS = 3000

interface ModeSwitcherProps {
  enableFurniture?: boolean
}

export function ModeSwitcher({ enableFurniture = false }: ModeSwitcherProps) {
  const navMode = useSplatViewerStore((s) => s.navMode)
  const transitioning = useSplatViewerStore((s) => s.transitioning)
  const setNavMode = useSplatViewerStore((s) => s.setNavMode)
  const controlsVisible = useSplatViewerStore((s) => s.controlsVisible)
  const setControlsVisible = useSplatViewerStore((s) => s.setControlsVisible)

  const furnitureMode = useFurnitureStore((s) => s.mode)
  const setFurnitureMode = useFurnitureStore((s) => s.setMode)
  const isFurnishActive = furnitureMode === 'furnish'

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTouchRef = useRef(false)

  // Detect touch device
  useEffect(() => {
    isTouchRef.current =
      'ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches
  }, [])

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isTouchRef.current) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), AUTO_HIDE_MS)
    }
  }, [setControlsVisible])

  // Start auto-hide timer on mount for touch devices
  useEffect(() => {
    if (isTouchRef.current) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), AUTO_HIDE_MS)
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [setControlsVisible])

  // Tap anywhere to show controls on mobile
  useEffect(() => {
    if (!isTouchRef.current) return
    const handler = () => resetHideTimer()
    document.addEventListener('touchstart', handler, { passive: true })
    return () => document.removeEventListener('touchstart', handler)
  }, [resetHideTimer])

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300"
      style={{
        bottom: 16,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        opacity: controlsVisible ? 1 : 0,
        pointerEvents: controlsVisible ? 'auto' : 'none',
      }}
    >
      <div
        className="rounded-full flex items-center gap-1"
        style={{
          backgroundColor: 'rgba(10, 9, 8, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212, 160, 23, 0.12)',
          padding: '6px 8px',
        }}
      >
        {MODES.map(({ key, label, Icon }) => {
          const isActive = navMode === key && !isFurnishActive
          const isDisabled = transitioning || isFurnishActive
          return (
            <button
              key={key}
              onClick={() => {
                if (!isDisabled) setNavMode(key)
                resetHideTimer()
              }}
              disabled={isDisabled}
              aria-label={label}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all"
              style={{
                minWidth: 44,
                minHeight: 44,
                backgroundColor: isActive ? '#D4A017' : 'transparent',
                color: isActive ? '#0A0908' : '#F5F3EF',
                opacity: isDisabled ? 0.3 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                pointerEvents: isDisabled ? 'none' : 'auto',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}

        {/* Furnish mode divider + toggle */}
        {enableFurniture && (
          <>
            <div
              style={{
                width: 1,
                height: 16,
                backgroundColor: 'rgba(212, 160, 23, 0.3)',
                margin: '0 4px',
              }}
            />
            <button
              onClick={() => {
                setFurnitureMode(isFurnishActive ? 'navigate' : 'furnish')
                resetHideTimer()
              }}
              aria-label={isFurnishActive ? 'Exit furnish mode' : 'Furnish mode'}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all"
              style={{
                minWidth: 44,
                minHeight: 44,
                backgroundColor: isFurnishActive ? '#D4A017' : 'transparent',
                color: isFurnishActive ? '#0A0908' : '#F5F3EF',
                cursor: 'pointer',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              <Armchair size={16} strokeWidth={1.5} />
              <span className="hidden sm:inline">Furnish</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
