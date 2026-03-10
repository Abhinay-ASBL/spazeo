'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { RotateCw, Hash, Tag, Zap, ZapOff, FileText, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FloorPlanFile } from './FloorPlanUpload'

interface FloorPlanPreviewProps {
  files: FloorPlanFile[]
  onFilesChange: (files: FloorPlanFile[]) => void
  onExtract: (files: FloorPlanFile[]) => void
  extracting?: boolean
}

interface ImageMeta {
  width: number
  height: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function PreviewCard({
  fpFile,
  index,
  onRotate,
  onUpdateFloor,
  onUpdateLabel,
  onExtractSingle,
  extracting,
  imageMeta,
}: {
  fpFile: FloorPlanFile
  index: number
  onRotate: () => void
  onUpdateFloor: (floor: number) => void
  onUpdateLabel: (label: string) => void
  onExtractSingle: () => void
  extracting?: boolean
  imageMeta?: ImageMeta
}) {
  const previewUrl = useMemo(() => {
    if (fpFile.preview) return fpFile.preview
    if (fpFile.rasterizedBlobs && fpFile.rasterizedBlobs.length > 0) {
      return URL.createObjectURL(fpFile.rasterizedBlobs[0])
    }
    return null
  }, [fpFile.preview, fpFile.rasterizedBlobs])

  useEffect(() => {
    // Only revoke rasterized blob URLs
    if (previewUrl && !fpFile.preview) {
      return () => URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl, fpFile.preview])

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.08)',
      }}
    >
      {/* Image preview */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ minHeight: 200, backgroundColor: '#12100E' }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Floor ${fpFile.floorNumber} preview`}
            className="max-w-full max-h-[400px] object-contain transition-transform duration-300"
            style={{ transform: `rotate(${fpFile.rotation}deg)` }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-8">
            <FileText size={32} style={{ color: '#6B6560' }} strokeWidth={1.5} />
            <p className="text-xs" style={{ color: '#6B6560' }}>
              No preview available
            </p>
          </div>
        )}

        {/* PDF page badge */}
        {fpFile.type === 'pdf' && fpFile.rasterizedBlobs && (
          <span
            className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: 'rgba(212,160,23,0.15)', color: '#D4A017' }}
          >
            PDF - {fpFile.rasterizedBlobs.length} page{fpFile.rasterizedBlobs.length > 1 ? 's' : ''}
          </span>
        )}

        {/* Rotate button */}
        <button
          type="button"
          onClick={onRotate}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
          style={{
            backgroundColor: 'rgba(10,9,8,0.7)',
            border: '1px solid rgba(212,160,23,0.2)',
          }}
          aria-label="Rotate 90 degrees"
        >
          <RotateCw size={16} strokeWidth={1.5} style={{ color: '#D4A017' }} />
        </button>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col gap-3">
        {/* Filename and metadata */}
        <div>
          <p className="text-sm truncate" style={{ color: '#F5F3EF' }}>
            {fpFile.file.name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: '#6B6560' }}>
              {formatBytes(fpFile.file.size)}
            </span>
            {imageMeta && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#6B6560' }}>
                <Ruler size={12} strokeWidth={1.5} />
                {imageMeta.width} x {imageMeta.height}
              </span>
            )}
            {fpFile.rotation > 0 && (
              <span className="text-xs" style={{ color: '#D4A017' }}>
                {fpFile.rotation} deg
              </span>
            )}
          </div>
        </div>

        {/* Floor number + label */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Hash size={14} style={{ color: '#6B6560' }} strokeWidth={1.5} />
            <input
              type="number"
              min={1}
              value={fpFile.floorNumber}
              onChange={(e) => onUpdateFloor(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 px-2 py-1 rounded text-xs text-center"
              style={{
                backgroundColor: '#12100E',
                border: '1px solid rgba(212,160,23,0.12)',
                color: '#F5F3EF',
              }}
              aria-label="Floor number"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-1">
            <Tag size={14} style={{ color: '#6B6560' }} strokeWidth={1.5} />
            <input
              type="text"
              value={fpFile.label}
              onChange={(e) => onUpdateLabel(e.target.value)}
              placeholder="Label (e.g., Ground Floor)"
              className="flex-1 px-2 py-1 rounded text-xs"
              style={{
                backgroundColor: '#12100E',
                border: '1px solid rgba(212,160,23,0.12)',
                color: '#F5F3EF',
              }}
              aria-label="Floor label"
            />
          </div>
        </div>

        {/* Extract button */}
        <button
          type="button"
          onClick={onExtractSingle}
          disabled={extracting}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 w-full',
            extracting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          )}
          style={{ backgroundColor: '#D4A017', color: '#0A0908' }}
        >
          {extracting ? (
            <ZapOff size={14} strokeWidth={2} />
          ) : (
            <Zap size={14} strokeWidth={2} />
          )}
          {extracting ? 'Extracting...' : 'Extract Floor Plan'}
        </button>
      </div>
    </div>
  )
}

export function FloorPlanPreview({
  files,
  onFilesChange,
  onExtract,
  extracting,
}: FloorPlanPreviewProps) {
  const [imageMetas, setImageMetas] = useState<Record<string, ImageMeta>>({})

  // Load image dimensions for each file
  useEffect(() => {
    files.forEach((fpFile) => {
      if (imageMetas[fpFile.id]) return
      const url = fpFile.preview ?? (fpFile.rasterizedBlobs?.[0] ? URL.createObjectURL(fpFile.rasterizedBlobs[0]) : null)
      if (!url) return

      const img = new window.Image()
      img.onload = () => {
        setImageMetas((prev) => ({ ...prev, [fpFile.id]: { width: img.naturalWidth, height: img.naturalHeight } }))
        if (!fpFile.preview && fpFile.rasterizedBlobs?.[0]) URL.revokeObjectURL(url)
      }
      img.src = url
    })
  }, [files, imageMetas])

  const handleRotate = useCallback(
    (id: string) => {
      const updated = files.map((f) =>
        f.id === id ? { ...f, rotation: (f.rotation + 90) % 360 } : f
      )
      onFilesChange(updated)
    },
    [files, onFilesChange]
  )

  const handleUpdateFloor = useCallback(
    (id: string, floor: number) => {
      onFilesChange(files.map((f) => (f.id === id ? { ...f, floorNumber: floor } : f)))
    },
    [files, onFilesChange]
  )

  const handleUpdateLabel = useCallback(
    (id: string, label: string) => {
      onFilesChange(files.map((f) => (f.id === id ? { ...f, label } : f)))
    },
    [files, onFilesChange]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Extract All header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-medium"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
        >
          Preview ({files.length} file{files.length > 1 ? 's' : ''})
        </h3>
        {files.length > 1 && (
          <button
            type="button"
            onClick={() => onExtract(files)}
            disabled={extracting}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200',
              extracting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            )}
            style={{ backgroundColor: '#D4A017', color: '#0A0908' }}
          >
            <Zap size={16} strokeWidth={2} />
            {extracting ? 'Extracting...' : 'Extract All'}
          </button>
        )}
      </div>

      {/* Preview cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {files.map((fpFile, index) => (
          <PreviewCard
            key={fpFile.id}
            fpFile={fpFile}
            index={index}
            onRotate={() => handleRotate(fpFile.id)}
            onUpdateFloor={(floor) => handleUpdateFloor(fpFile.id, floor)}
            onUpdateLabel={(label) => handleUpdateLabel(fpFile.id, label)}
            onExtractSingle={() => onExtract([fpFile])}
            extracting={extracting}
            imageMeta={imageMetas[fpFile.id]}
          />
        ))}
      </div>
    </div>
  )
}

export default FloorPlanPreview
