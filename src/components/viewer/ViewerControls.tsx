'use client'

import { Minus, Plus, RotateCw, Maximize2, Minimize2 } from 'lucide-react'

interface Props {
  zoomLevel: number
  isAutoRotating: boolean
  isFullscreen: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleAutoRotate: () => void
  onToggleFullscreen: () => void
}

export function ViewerControls({
  zoomLevel,
  isAutoRotating,
  isFullscreen,
  onZoomIn,
  onZoomOut,
  onToggleAutoRotate,
  onToggleFullscreen,
}: Props) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div
        className="rounded-full px-4 py-2 flex items-center gap-2"
        style={{
          backgroundColor: 'rgba(10,9,8,0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,160,23,0.12)',
        }}
      >
        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: '#A8A29E' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F5F3EF'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#A8A29E'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <Minus size={16} strokeWidth={1.5} />
        </button>

        {/* Zoom Level */}
        <span
          className="text-xs min-w-[32px] text-center tabular-nums"
          style={{ color: '#A8A29E' }}
        >
          {zoomLevel.toFixed(1)}x
        </span>

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: '#A8A29E' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F5F3EF'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#A8A29E'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>

        {/* Divider */}
        <div className="h-4 w-px" style={{ backgroundColor: '#6B6560' }} />

        {/* Auto Rotate */}
        <button
          onClick={onToggleAutoRotate}
          aria-label={isAutoRotating ? 'Stop auto-rotate' : 'Start auto-rotate'}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: isAutoRotating ? '#D4A017' : '#A8A29E' }}
          onMouseEnter={(e) => { if (!isAutoRotating) { e.currentTarget.style.color = '#F5F3EF'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' } }}
          onMouseLeave={(e) => { if (!isAutoRotating) { e.currentTarget.style.color = '#A8A29E'; e.currentTarget.style.backgroundColor = 'transparent' } }}
        >
          <RotateCw size={16} strokeWidth={1.5} />
        </button>

        {/* Divider */}
        <div className="h-4 w-px" style={{ backgroundColor: '#6B6560' }} />

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: '#A8A29E' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F5F3EF'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#A8A29E'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          {isFullscreen ? (
            <Minimize2 size={16} strokeWidth={1.5} />
          ) : (
            <Maximize2 size={16} strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  )
}

export default ViewerControls
