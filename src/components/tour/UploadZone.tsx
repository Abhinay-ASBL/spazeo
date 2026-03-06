'use client'

import { useState, useCallback } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onUpload: (files: File[]) => void
  maxFiles?: number
  className?: string
}

interface PreviewFile {
  file: File
  preview: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadZone({ onUpload, maxFiles, className }: UploadZoneProps) {
  const [previews, setPreviews] = useState<PreviewFile[]>([])
  const [dropError, setDropError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setDropError(null)

      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0]
        if (firstError.code === 'file-too-large') {
          setDropError('One or more files exceed the 50 MB limit.')
        } else if (firstError.code === 'file-invalid-type') {
          setDropError('Only JPG, PNG, and WebP images are supported.')
        } else {
          setDropError(firstError.message)
        }
      }

      if (acceptedFiles.length > 0) {
        const newPreviews: PreviewFile[] = acceptedFiles.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }))
        setPreviews((prev) => [...prev, ...newPreviews])
        onUpload(acceptedFiles)
      }
    },
    [onUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 52428800,
    multiple: true,
    maxFiles,
  })

  function removePreview(index: number) {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-[#D4A017] bg-[rgba(212,160,23,0.04)]'
            : 'border-[rgba(212,160,23,0.15)] hover:border-[rgba(212,160,23,0.3)] hover:bg-[rgba(212,160,23,0.02)]'
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud size={40} style={{ color: '#2E2A24' }} strokeWidth={1.5} />
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: '#A8A29E' }}>
            {isDragActive ? 'Drop panoramas here' : 'Drag panoramas here or click to browse'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#5A5248' }}>
            Supports JPG, PNG, WebP up to 50 MB
          </p>
        </div>
      </div>

      {dropError && (
        <p className="text-sm px-1" style={{ color: '#F87171' }}>{dropError}</p>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {previews.map((item, index) => (
            <div
              key={item.preview}
              className="relative rounded-lg overflow-hidden"
              style={{
                backgroundColor: '#1B1916',
                border: '1px solid rgba(212,160,23,0.08)',
              }}
            >
              <div className="aspect-video">
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 px-2 py-1"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                <p className="text-[11px] truncate" style={{ color: '#F5F3EF' }}>
                  {item.file.name}
                </p>
                <p className="text-[10px]" style={{ color: '#6B6560' }}>
                  {formatBytes(item.file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removePreview(index)
                }}
                aria-label={`Remove ${item.file.name}`}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-150"
                style={{ backgroundColor: 'rgba(10,9,8,0.7)' }}
              >
                <X size={12} strokeWidth={2} style={{ color: '#F5F3EF' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
