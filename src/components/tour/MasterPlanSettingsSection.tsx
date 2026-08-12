'use client'

import { Loader2, Map, MousePointer2, Trash2, Upload } from 'lucide-react'
import { MasterPlanAdjustControls } from '@/components/tour/MasterPlanAdjustControls'
import type { MasterPlanMapping } from '@/components/viewer/MasterPlanOverlay'

type Props = {
  masterPlanUrl: string | null
  masterPlanUploading: boolean
  masterPlanRotation: number
  mappingMasterPlan: boolean
  editorZoom: number
  savingMapping: boolean
  activeMapping: MasterPlanMapping | null | undefined
  localOpacity: number
  onPickFile: () => void
  onUseSample: () => void
  onRemove: () => void
  onStartMapping: () => void
  onStopMapping: () => void
  onSetZoom: (zoom: number) => void
  onPatch: (patch: Partial<MasterPlanMapping>) => void
  onNudgeRotation: (delta: number) => void
  onSave: () => void
}

export function MasterPlanSettingsSection({
  masterPlanUrl,
  masterPlanUploading,
  masterPlanRotation,
  mappingMasterPlan,
  editorZoom,
  savingMapping,
  activeMapping,
  localOpacity,
  onPickFile,
  onUseSample,
  onRemove,
  onStartMapping,
  onStopMapping,
  onSetZoom,
  onPatch,
  onNudgeRotation,
  onSave,
}: Props) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg p-3"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      <div className="flex items-center gap-2">
        <Map size={14} style={{ color: '#2DD4BF' }} aria-hidden />
        <span className="text-xs font-semibold" style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}>
          Master Plan
        </span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
        Ground-pin a site plan on aerial 360° scenes. Upload an image, map four corners on the view, then fine-tune rotation.
      </p>

      <div
        className="relative overflow-hidden rounded-md flex items-center justify-center"
        style={{
          minHeight: 120,
          backgroundColor: '#0A0908',
          border: '1px solid rgba(212,160,23,0.08)',
        }}
      >
        {masterPlanUrl ? (
          <img
            src={masterPlanUrl}
            alt="Master plan preview"
            style={{
              maxWidth: '100%',
              maxHeight: 160,
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              transform: `rotate(${masterPlanRotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 150ms ease-out',
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 py-6 px-3 text-center">
            <Map size={20} style={{ color: '#2E2A24' }} aria-hidden />
            <span className="text-[11px]" style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
              No master plan yet
            </span>
          </div>
        )}
        {masterPlanUploading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(10,9,8,0.7)' }}
            role="status"
            aria-label="Uploading master plan"
          >
            <Loader2 size={18} className="animate-spin" style={{ color: '#D4A017' }} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={masterPlanUploading}
          onClick={onPickFile}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#D4A017', color: '#0A0908', fontFamily: 'var(--font-dmsans)' }}
        >
          <Upload size={12} aria-hidden />
          Upload
        </button>
        <button
          type="button"
          disabled={masterPlanUploading}
          onClick={onUseSample}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: 'transparent',
            color: '#D4A017',
            border: '1px solid #D4A017',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          Use sample
        </button>
        {masterPlanUrl && (
          <button
            type="button"
            disabled={masterPlanUploading}
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'transparent', color: '#F87171', fontFamily: 'var(--font-dmsans)' }}
          >
            <Trash2 size={12} aria-hidden />
            Remove
          </button>
        )}
      </div>

      {masterPlanUrl && (
        <div className="flex flex-col gap-2 pt-1" style={{ borderTop: '1px solid rgba(212,160,23,0.1)' }}>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => onSetZoom(0.5)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold"
              style={{
                backgroundColor: editorZoom === 0.5 ? '#2DD4BF' : 'transparent',
                color: editorZoom === 0.5 ? '#0A0908' : '#2DD4BF',
                border: '1px solid #2DD4BF',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              0.5× zoom
            </button>
            <button
              type="button"
              onClick={() => onSetZoom(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium"
              style={{
                backgroundColor: editorZoom === 1 ? 'rgba(212,160,23,0.2)' : 'transparent',
                color: '#D4A017',
                border: '1px solid rgba(212,160,23,0.4)',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              1× zoom
            </button>
            <button
              type="button"
              onClick={mappingMasterPlan ? onStopMapping : onStartMapping}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold"
              style={{
                backgroundColor: mappingMasterPlan ? 'transparent' : '#D4A017',
                color: mappingMasterPlan ? '#2DD4BF' : '#0A0908',
                border: mappingMasterPlan ? '1px solid rgba(45,212,191,0.5)' : '1px solid transparent',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              <MousePointer2 size={12} aria-hidden />
              {mappingMasterPlan ? 'Stop mapping' : 'Map on 360°'}
            </button>
          </div>

          <MasterPlanAdjustControls
            mapping={activeMapping}
            rotation={masterPlanRotation}
            opacity={localOpacity}
            saving={savingMapping}
            onPatch={onPatch}
            onNudgeRotation={onNudgeRotation}
            onSave={onSave}
            showLegacyRect
          />
        </div>
      )}
    </div>
  )
}
