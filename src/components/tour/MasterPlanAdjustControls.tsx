'use client'

import { Check, Loader2, RotateCcw, RotateCw } from 'lucide-react'
import {
  isMasterPlanMapped,
  normalizeMasterPlanRotation,
  type MasterPlanMapping,
} from '@/components/viewer/MasterPlanOverlay'

type Props = {
  mapping: MasterPlanMapping | null | undefined
  rotation: number
  opacity: number
  saving: boolean
  onPatch: (patch: Partial<MasterPlanMapping>) => void
  onNudgeRotation: (delta: number) => void
  onSave: () => void
  saveLabel?: string
  showLegacyRect?: boolean
  showSave?: boolean
  allowPartial?: boolean
}

export function MasterPlanAdjustControls({
  mapping,
  rotation,
  opacity,
  saving,
  onPatch,
  onNudgeRotation,
  onSave,
  saveLabel = 'Save mapping',
  showLegacyRect = false,
  showSave = true,
  allowPartial = false,
}: Props) {
  if (!allowPartial && (!mapping || !isMasterPlanMapped(mapping))) return null

  const isCornerMode = mapping?.corners?.length === 4

  return (
    <div className="flex flex-col gap-2">
      {mapping && isCornerMode ? (
        <p
          className="text-[11px] leading-relaxed"
          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
        >
          Site plan is pinned on the plot. Adjust rotation and opacity, then save.
        </p>
      ) : showLegacyRect && mapping ? (
        <>
          <label className="text-[11px] font-medium" style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}>
            Width {Math.round(mapping.widthDeg ?? 0)}°
          </label>
          <input
            type="range"
            min={8}
            max={120}
            step={1}
            value={mapping.widthDeg ?? 40}
            onChange={(e) => onPatch({ widthDeg: Number(e.target.value) })}
            className="w-full accent-[#D4A017]"
            aria-label="Master plan width"
          />
          <label className="text-[11px] font-medium" style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}>
            Height {Math.round(mapping.heightDeg ?? 0)}°
          </label>
          <input
            type="range"
            min={4}
            max={80}
            step={1}
            value={mapping.heightDeg ?? 24}
            onChange={(e) => onPatch({ heightDeg: Number(e.target.value) })}
            className="w-full accent-[#D4A017]"
            aria-label="Master plan height"
          />
        </>
      ) : null}

      <label className="text-[11px] font-medium" style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}>
        Rotation {Math.round(rotation)}°
      </label>
      <input
        type="range"
        min={-180}
        max={180}
        step={1}
        value={rotation}
        onChange={(e) =>
          onPatch({ rotation: normalizeMasterPlanRotation(Number(e.target.value)) })
        }
        className="w-full accent-[#2DD4BF]"
        aria-label="Master plan rotation"
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onNudgeRotation(-90)}
          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
          style={{
            backgroundColor: '#0A0908',
            color: '#A8A29E',
            border: '1px solid rgba(212,160,23,0.2)',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <RotateCcw size={12} aria-hidden />
          −90°
        </button>
        <button
          type="button"
          onClick={() => onNudgeRotation(90)}
          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
          style={{
            backgroundColor: '#0A0908',
            color: '#A8A29E',
            border: '1px solid rgba(212,160,23,0.2)',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <RotateCw size={12} aria-hidden />
          +90°
        </button>
      </div>

      <label className="text-[11px] font-medium" style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}>
        Opacity {Math.round(opacity * 100)}%
      </label>
      <input
        type="range"
        min={0.2}
        max={1}
        step={0.01}
        value={opacity}
        onChange={(e) => onPatch({ opacity: Number(e.target.value) })}
        className="w-full accent-[#D4A017]"
        aria-label="Master plan opacity"
      />

      {showSave && mapping && isMasterPlanMapped(mapping) && (
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: '#2DD4BF',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Check size={12} aria-hidden />}
          {saveLabel}
        </button>
      )}
    </div>
  )
}
