'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import type { FloorPlanGeometry, FloorPlan3DOverrides } from '@/components/viewer/FloorPlanMesh'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WALL_COLOR_SWATCHES = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Cream', value: '#F5F0E8' },
  { label: 'Light Grey', value: '#E8E8E4' },
  { label: 'Warm Sand', value: '#E5D8C4' },
  { label: 'Sage', value: '#C4CBBF' },
  { label: 'Slate Blue', value: '#B4BCC8' },
]

const FLOOR_TYPE_OPTIONS = ['default', 'wood', 'tile', 'carpet', 'concrete']

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FloorPlan3DPropertiesPanelProps {
  geometry: FloorPlanGeometry
  overrides: FloorPlan3DOverrides
  onOverrideChange: (overrides: FloorPlan3DOverrides) => void
  onFinalize: () => void
  isFinalizing: boolean
}

// ---------------------------------------------------------------------------
// Room card
// ---------------------------------------------------------------------------

function RoomCard({
  room,
  overrides,
  onOverrideChange,
}: {
  room: FloorPlanGeometry['rooms'][number]
  overrides: FloorPlan3DOverrides
  onOverrideChange: (overrides: FloorPlan3DOverrides) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const roomOverride = overrides.roomOverrides[room.id] ?? {}

  const updateRoom = (patch: Partial<FloorPlan3DOverrides['roomOverrides'][string]>) => {
    onOverrideChange({
      ...overrides,
      roomOverrides: {
        ...overrides.roomOverrides,
        [room.id]: { ...roomOverride, ...patch },
      },
    })
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: '#1B1916', border: '1px solid rgba(212,160,23,0.1)' }}
    >
      {/* Card header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ fontFamily: 'var(--font-dmsans)' }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium" style={{ color: '#F5F3EF' }}>
          {room.name || 'Unnamed Room'}
        </span>
        {expanded ? (
          <ChevronDown size={16} color="#6B6560" strokeWidth={1.5} />
        ) : (
          <ChevronRight size={16} color="#6B6560" strokeWidth={1.5} />
        )}
      </button>

      {expanded && (
        <div
          className="flex flex-col gap-4 px-4 pb-4"
          style={{ borderTop: '1px solid rgba(212,160,23,0.08)' }}
        >
          {/* Wall Color */}
          <div className="flex flex-col gap-2 pt-3">
            <span
              className="text-xs"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Wall Color
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {WALL_COLOR_SWATCHES.map((swatch) => {
                const selected = roomOverride.wallColor === swatch.value
                return (
                  <button
                    key={swatch.value}
                    aria-label={swatch.label}
                    title={swatch.label}
                    onClick={() => updateRoom({ wallColor: swatch.value })}
                    className="rounded-full transition-transform hover:scale-110"
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: swatch.value,
                      border: selected ? '2px solid #D4A017' : '2px solid rgba(212,160,23,0.2)',
                      boxSizing: 'border-box',
                      outline: selected ? '1px solid rgba(212,160,23,0.4)' : 'none',
                      outlineOffset: 1,
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* Floor Type */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`floor-type-${room.id}`}
              className="text-xs"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Floor Type
            </label>
            <select
              id={`floor-type-${room.id}`}
              value={roomOverride.floorType ?? 'default'}
              onChange={(e) => updateRoom({ floorType: e.target.value })}
              className="w-full px-3 py-2 rounded text-sm outline-none transition-colors appearance-none"
              style={{
                backgroundColor: '#0A0908',
                border: '1px solid rgba(212,160,23,0.15)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-dmsans)',
                borderRadius: 4,
              }}
            >
              {FLOOR_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Ceiling Height Override */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`ceiling-override-${room.id}`}
              className="text-xs"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Ceiling Height Override
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`ceiling-override-${room.id}`}
                type="number"
                min={2.0}
                max={4.0}
                step={0.1}
                value={roomOverride.ceilingHeight ?? ''}
                placeholder={`${overrides.globalCeilingHeight}m (global)`}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value)
                  updateRoom({ ceilingHeight: val })
                }}
                className="flex-1 px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: '#0A0908',
                  border: '1px solid rgba(212,160,23,0.15)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-dmsans)',
                  borderRadius: 4,
                }}
              />
              <span className="text-xs" style={{ color: '#6B6560' }}>m</span>
            </div>
            {roomOverride.ceilingHeight === undefined && (
              <span className="text-xs" style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
                Using global ({overrides.globalCeilingHeight}m)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FloorPlan3DPropertiesPanel({
  geometry,
  overrides,
  onOverrideChange,
  onFinalize,
  isFinalizing,
}: FloorPlan3DPropertiesPanelProps) {
  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: '100%',
        backgroundColor: '#12100E',
        fontFamily: 'var(--font-dmsans)',
      }}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* Global Settings section */}
        <div>
          <div
            className="px-4 py-3 sticky top-0 z-10"
            style={{ backgroundColor: '#2E2A24' }}
          >
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: '#6B6560' }}
            >
              Global Settings
            </span>
          </div>

          <div className="flex flex-col gap-5 p-4">
            {/* Ceiling Height slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="global-ceiling-height"
                  className="text-sm font-medium"
                  style={{ color: '#F5F3EF' }}
                >
                  Ceiling Height
                </label>
                <span className="text-sm font-bold" style={{ color: '#D4A017' }}>
                  {overrides.globalCeilingHeight.toFixed(1)}m
                </span>
              </div>
              <input
                id="global-ceiling-height"
                type="range"
                min={2.0}
                max={4.0}
                step={0.1}
                value={overrides.globalCeilingHeight}
                onChange={(e) =>
                  onOverrideChange({
                    ...overrides,
                    globalCeilingHeight: parseFloat(e.target.value),
                  })
                }
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: '#D4A017' }}
              />
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#6B6560' }}>2.0m</span>
                <span className="text-xs" style={{ color: '#6B6560' }}>4.0m</span>
              </div>
            </div>

            {/* Door Width */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="door-width"
                  className="text-sm font-medium"
                  style={{ color: '#F5F3EF' }}
                >
                  Door Width
                </label>
                <span className="text-xs" style={{ color: '#A8A29E' }}>
                  {overrides.doorWidth.toFixed(1)}m
                </span>
              </div>
              <input
                id="door-width"
                type="number"
                min={0.6}
                max={2.0}
                step={0.1}
                value={overrides.doorWidth}
                onChange={(e) =>
                  onOverrideChange({
                    ...overrides,
                    doorWidth: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.15)',
                  color: '#F5F3EF',
                  borderRadius: 4,
                }}
              />
            </div>

            {/* Door Height */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="door-height"
                  className="text-sm font-medium"
                  style={{ color: '#F5F3EF' }}
                >
                  Door Height
                </label>
                <span className="text-xs" style={{ color: '#A8A29E' }}>
                  {overrides.doorHeight.toFixed(1)}m
                </span>
              </div>
              <input
                id="door-height"
                type="number"
                min={1.8}
                max={2.5}
                step={0.1}
                value={overrides.doorHeight}
                onChange={(e) =>
                  onOverrideChange({
                    ...overrides,
                    doorHeight: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.15)',
                  color: '#F5F3EF',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </div>

        {/* Rooms section */}
        <div>
          <div
            className="px-4 py-3 sticky top-0 z-10"
            style={{ backgroundColor: '#2E2A24' }}
          >
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: '#6B6560' }}
            >
              Rooms
              {geometry.rooms.length > 0 && (
                <span className="ml-1.5 text-xs normal-case" style={{ color: '#A8A29E' }}>
                  ({geometry.rooms.length})
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-3 p-4">
            {geometry.rooms.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B6560' }}>
                No rooms detected.
              </p>
            ) : (
              geometry.rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  overrides={overrides}
                  onOverrideChange={onOverrideChange}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sticky Finalize section */}
      <div
        className="sticky bottom-0 p-4 flex flex-col gap-3"
        style={{
          backgroundColor: '#12100E',
          borderTop: '1px solid rgba(212,160,23,0.12)',
        }}
      >
        <p className="text-xs" style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
          Creates a tour you can decorate and publish.
        </p>
        <button
          onClick={onFinalize}
          disabled={isFinalizing}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-bold transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
            borderRadius: 8,
          }}
        >
          {isFinalizing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating Tour...
            </>
          ) : (
            'Finalize Tour'
          )}
        </button>
      </div>
    </div>
  )
}
