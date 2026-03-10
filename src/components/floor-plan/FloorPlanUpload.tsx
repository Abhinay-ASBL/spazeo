'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { UploadCloud, Camera, X, FileText, Image, Hash, Tag, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const PdfPageSelector = dynamic(() => import('./PdfPageSelector').then((m) => m), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8 text-sm" style={{ color: '#6B6560' }}>
      Loading PDF viewer...
    </div>
  ),
})

export interface FloorPlanFile {
  id: string
  file: File
  type: 'pdf' | 'image' | 'sketch'
  floorNumber: number
  label: string
  rotation: number
  preview?: string
  pages?: { pageNum: number; selected: boolean }[]
  /** Rasterized blobs from PDF pages (populated after page selection) */
  rasterizedBlobs?: Blob[]
}

interface FloorPlanUploadProps {
  onContinue: (files: FloorPlanFile[]) => void
  className?: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

let fileIdCounter = 0
function generateFileId(): string {
  fileIdCounter += 1
  return `fp-${Date.now()}-${fileIdCounter}`
}

export function FloorPlanUpload({ onContinue, className }: FloorPlanUploadProps) {
  const [files, setFiles] = useState<FloorPlanFile[]>([])
  const [dropError, setDropError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const nextFloorNumber = files.length + 1

  const addFiles = useCallback(
    (accepted: File[]) => {
      let floor = nextFloorNumber
      const newFiles: FloorPlanFile[] = accepted.map((file) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        const currentFloor = floor
        floor += 1
        return {
          id: generateFileId(),
          file,
          type: isPdf ? 'pdf' : 'image',
          floorNumber: currentFloor,
          label: '',
          rotation: 0,
          preview: isPdf ? undefined : URL.createObjectURL(file),
        }
      })
      setFiles((prev) => [...prev, ...newFiles])
    },
    [nextFloorNumber]
  )

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setDropError(null)
      if (rejected.length > 0) {
        const firstErr = rejected[0].errors[0]
        if (firstErr.code === 'file-too-large') {
          setDropError('One or more files exceed the 50 MB limit.')
        } else if (firstErr.code === 'file-invalid-type') {
          setDropError('Only PDF, JPG, PNG, and WebP files are supported.')
        } else {
          setDropError(firstErr.message)
        }
      }
      if (accepted.length > 0) {
        addFiles(accepted)
      }
    },
    [addFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  })

  const handleCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const capturedFiles = e.target.files
      if (!capturedFiles || capturedFiles.length === 0) return
      const arr = Array.from(capturedFiles).map((f) => {
        const currentFloor = nextFloorNumber
        return {
          id: generateFileId(),
          file: f,
          type: 'sketch' as const,
          floorNumber: currentFloor,
          label: 'Sketch',
          rotation: 0,
          preview: URL.createObjectURL(f),
        }
      })
      setFiles((prev) => [...prev, ...arr])
      // Reset input so the same file can be re-captured
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    },
    [nextFloorNumber]
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const updateFile = useCallback((id: string, updates: Partial<FloorPlanFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }, [])

  const handlePdfPagesSelected = useCallback(
    (fileId: string, rasterizedBlobs: Blob[]) => {
      updateFile(fileId, { rasterizedBlobs })
    },
    [updateFile]
  )

  const readyFiles = files.filter((f) => {
    if (f.type === 'pdf') return (f.rasterizedBlobs?.length ?? 0) > 0
    return true
  })
  const canContinue = readyFiles.length > 0

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-[#D4A017] bg-[rgba(212,160,23,0.04)]'
            : 'border-[rgba(212,160,23,0.15)] hover:border-[rgba(212,160,23,0.3)] hover:bg-[rgba(212,160,23,0.02)]'
        )}
        style={{ backgroundColor: isDragActive ? undefined : '#0A0908' }}
      >
        <input {...getInputProps()} />
        <UploadCloud size={40} style={{ color: '#2E2A24' }} strokeWidth={1.5} />
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: '#A8A29E' }}>
            {isDragActive ? 'Drop floor plans here' : 'Drag floor plans here or click to browse'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#5A5248' }}>
            Supports PDF, JPG, PNG, WebP up to 50 MB per file
          </p>
        </div>
      </div>

      {/* Camera capture for mobile */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            border: '1.5px solid #D4A017',
            color: '#D4A017',
            backgroundColor: 'transparent',
          }}
        >
          <Camera size={18} strokeWidth={1.5} />
          Capture Sketch Photo
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />
      </div>

      {dropError && (
        <p className="text-sm px-1" style={{ color: '#F87171' }}>
          {dropError}
        </p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3
            className="text-sm font-medium"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
          >
            Uploaded Files ({files.length})
          </h3>

          {files.map((fpFile) => (
            <div
              key={fpFile.id}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{
                backgroundColor: '#1B1916',
                border: '1px solid rgba(212,160,23,0.08)',
              }}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: '#12100E' }}
                >
                  {fpFile.preview ? (
                    <img
                      src={fpFile.preview}
                      alt={fpFile.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : fpFile.type === 'pdf' ? (
                    <FileText size={24} style={{ color: '#D4A017' }} strokeWidth={1.5} />
                  ) : (
                    <Image size={24} style={{ color: '#6B6560' }} strokeWidth={1.5} />
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: '#F5F3EF' }}>
                    {fpFile.file.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B6560' }}>
                    {formatBytes(fpFile.file.size)} - {fpFile.type.toUpperCase()}
                  </p>

                  {/* Floor number + label inputs */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Hash size={14} style={{ color: '#6B6560' }} strokeWidth={1.5} />
                      <input
                        type="number"
                        min={1}
                        value={fpFile.floorNumber}
                        onChange={(e) =>
                          updateFile(fpFile.id, {
                            floorNumber: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
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
                        onChange={(e) => updateFile(fpFile.id, { label: e.target.value })}
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
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeFile(fpFile.id)}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150"
                  style={{ backgroundColor: 'rgba(248,113,113,0.08)' }}
                  aria-label={`Remove ${fpFile.file.name}`}
                >
                  <X size={14} strokeWidth={2} style={{ color: '#F87171' }} />
                </button>
              </div>

              {/* PDF page selector */}
              {fpFile.type === 'pdf' && (
                <PdfPageSelector
                  file={fpFile.file}
                  onPagesSelected={(blobs) => handlePdfPagesSelected(fpFile.id, blobs)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Continue button */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => onContinue(readyFiles)}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200',
            canContinue
              ? 'cursor-pointer'
              : 'opacity-40 cursor-not-allowed'
          )}
          style={{
            backgroundColor: canContinue ? '#D4A017' : '#3A3530',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          Continue to Preview
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

export default FloorPlanUpload
