'use client'

/* eslint-disable @next/next/no-img-element */
import { useMemo } from 'react'
import { X } from 'lucide-react'

interface CapturePhotoGridProps {
  files: File[]
  onRemove: (index: number) => void
}

export function CapturePhotoGrid({ files, onRemove }: CapturePhotoGridProps) {
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    // We intentionally depend on files.length to regenerate previews when files change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, files.length]
  )

  if (files.length === 0) return null

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="relative group rounded-lg overflow-hidden"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.08)',
          }}
        >
          <div className="aspect-square">
            <img
              src={previews[index]}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(10,9,8,0.8)' }}
            aria-label={`Remove ${file.name}`}
          >
            <X size={12} strokeWidth={2} style={{ color: '#F5F3EF' }} />
          </button>
          <p
            className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[10px] truncate"
            style={{
              color: '#A8A29E',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {file.name}
          </p>
        </div>
      ))}
    </div>
  )
}
