'use client'

import { Check, Loader2, Map, X } from 'lucide-react'
import { CORNER_LABELS } from '@/components/viewer/MasterPlanOverlay'
import { MasterPlanAdjustControls } from '@/components/tour/MasterPlanAdjustControls'
import type { MasterPlanMapping } from '@/components/viewer/MasterPlanOverlay'

type Corner = { yaw: number; pitch: number }

type Props = {
  masterPlanUrl: string
  masterPlanRotation: number
  pinCorners: Corner[]
  editorZoom: number
  localOpacity: number
  activeMapping: MasterPlanMapping | null | undefined
  savingMapping: boolean
  onClose: () => void
  onSetZoom: (zoom: number) => void
  onResetCorners: () => void
  onPatch: (patch: Partial<MasterPlanMapping>) => void
  onNudgeRotation: (delta: number) => void
  onSave: () => void
}

export function MasterPlanMappingPanel({
  masterPlanUrl,
  masterPlanRotation,
  pinCorners,
  editorZoom,
  localOpacity,
  activeMapping,
  savingMapping,
  onClose,
  onSetZoom,
  onResetCorners,
  onPatch,
  onNudgeRotation,
  onSave,
}: Props) {
  const nextCornerIndex = pinCorners.length

  return (
    <div
      className="absolute top-4 left-4 w-[280px] rounded-xl flex flex-col z-20 overflow-hidden"
      style={{
        backgroundColor: '#12100E',
        border: '1px solid rgba(45,212,191,0.3)',
        boxShadow: '0 10px 15px rgba(0,0,0,0.4)',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: '1px solid rgba(45,212,191,0.15)' }}
      >
        <div className="flex items-center gap-2">
          <Map size={14} style={{ color: '#2DD4BF' }} aria-hidden />
          <span className="text-xs font-semibold" style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}>
            Map master plan
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded transition-colors hover:opacity-80"
          style={{ color: '#A8A29E' }}
          aria-label="Close mapping panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        <p className="text-[11px] leading-relaxed" style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
          Click four corners on the panorama in order: top-left, top-right, bottom-right, bottom-left. Use 0.5× zoom to see the full plot.
        </p>

        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{
            aspectRatio: '4/3',
            backgroundColor: '#0A0908',
            border: '1px solid rgba(212,160,23,0.15)',
          }}
        >
          <img
            src={masterPlanUrl}
            alt="Master plan reference"
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              transform: `rotate(${masterPlanRotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 150ms ease-out',
            }}
          />
        </div>

        <ul className="flex flex-col gap-1" aria-label="Corner placement progress">
          {CORNER_LABELS.map((label, i) => {
            const placed = pinCorners.length > i
            const active = pinCorners.length === i
            return (
              <li
                key={label}
                className="flex items-center gap-2 text-[11px]"
                style={{
                  color: placed ? '#2DD4BF' : active ? '#D4A017' : '#6B6560',
                  fontFamily: 'var(--font-dmsans)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{
                    backgroundColor: placed ? '#2DD4BF' : active ? '#D4A017' : '#1B1916',
                    color: placed || active ? '#0A0908' : '#6B6560',
                    border: `1px solid ${active ? '#D4A017' : placed ? '#2DD4BF' : '#2E2A24'}`,
                  }}
                  aria-hidden
                >
                  {placed ? '✓' : i + 1}
                </span>
                {label}
              </li>
            )
          })}
        </ul>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onSetZoom(0.5)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-semibold"
            style={{
              backgroundColor: editorZoom === 0.5 ? '#2DD4BF' : '#1B1916',
              color: editorZoom === 0.5 ? '#0A0908' : '#A8A29E',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            0.5× zoom
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(1)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-semibold"
            style={{
              backgroundColor: editorZoom === 1 ? '#D4A017' : '#1B1916',
              color: editorZoom === 1 ? '#0A0908' : '#A8A29E',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            1× zoom
          </button>
        </div>

        <MasterPlanAdjustControls
          mapping={activeMapping ?? { opacity: localOpacity, rotation: masterPlanRotation }}
          rotation={masterPlanRotation}
          opacity={localOpacity}
          saving={savingMapping}
          onPatch={onPatch}
          onNudgeRotation={onNudgeRotation}
          onSave={onSave}
          showSave={false}
          allowPartial
        />

        {nextCornerIndex < 4 && (
          <p className="text-[11px] font-semibold" style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}>
            Next: {CORNER_LABELS[nextCornerIndex]}
          </p>
        )}

        <button
          type="button"
          onClick={onResetCorners}
          disabled={pinCorners.length === 0}
          className="w-full py-1.5 rounded-md text-[11px] font-medium transition-opacity disabled:opacity-40"
          style={{
            backgroundColor: 'transparent',
            color: '#F87171',
            border: '1px solid rgba(248,113,113,0.35)',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          Reset corners
        </button>

        {pinCorners.length >= 4 && (
          <button
            type="button"
            disabled={savingMapping}
            onClick={onSave}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#2DD4BF', color: '#0A0908', fontFamily: 'var(--font-dmsans)' }}
          >
            {savingMapping ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Check size={12} aria-hidden />}
            Save mapping
          </button>
        )}
      </div>
    </div>
  )
}
