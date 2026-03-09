'use client'

import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import dynamic from 'next/dynamic'
import { CheckCircle, RotateCcw, Loader2, Box, Clock, FileText, Camera } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const GaussianSplatViewer = dynamic(
  () => import('@/components/viewer/GaussianSplatViewer').then((m) => ({ default: m.GaussianSplatViewer })),
  { ssr: false, loading: () => <SplatLoading /> }
)

function SplatLoading() {
  return (
    <div className="w-full h-[400px] rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-[var(--brand-gold)] animate-spin" />
        <span className="text-sm text-[var(--text-secondary)]">Loading 3D preview...</span>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function formatGaussianCount(count: number): string {
  return count.toLocaleString()
}

interface SplatPreviewProps {
  jobId: Id<'reconstructionJobs'>
  tourId: Id<'tours'>
  onRecapture?: () => void
}

export function SplatPreview({ jobId, tourId, onRecapture }: SplatPreviewProps) {
  const splatUrl = useQuery(api.reconstructionJobs.getSplatUrl, { jobId })
  const job = useQuery(api.reconstructionJobs.getByTourId, { tourId })
  const acceptResult = useMutation(api.reconstructionJobs.acceptResult)
  const [accepting, setAccepting] = useState(false)

  const metadata = job?.outputMetadata

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        Review 3D Reconstruction
      </h3>

      {/* 3D Preview */}
      <div className="w-full h-[400px] rounded-lg overflow-hidden mb-6 border border-[var(--border-subtle)]">
        {splatUrl ? (
          <GaussianSplatViewer splatUrl={splatUrl} />
        ) : (
          <SplatLoading />
        )}
      </div>

      {/* Metadata Grid */}
      {metadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetadataCard
            icon={<FileText className="w-4 h-4" />}
            label="File Size"
            value={formatFileSize(metadata.fileSizeBytes)}
          />
          <MetadataCard
            icon={<Box className="w-4 h-4" />}
            label="Gaussians"
            value={`${formatGaussianCount(metadata.gaussianCount)} gaussians`}
          />
          <MetadataCard
            icon={<Clock className="w-4 h-4" />}
            label="Processing Time"
            value={formatDuration(metadata.processingTimeMs)}
          />
          <MetadataCard
            icon={<Camera className="w-4 h-4" />}
            label="Input Type"
            value={job?.inputType === 'video' ? 'Video Walkthrough' : 'Multi-Angle Photos'}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={async () => {
            setAccepting(true)
            try {
              await acceptResult({ jobId })
              toast.success('3D model accepted and linked to your tour!')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to accept result')
            } finally {
              setAccepting(false)
            }
          }}
          disabled={accepting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--brand-gold)] text-[var(--bg-carbon)] font-semibold text-sm hover:bg-[var(--brand-gold-hover)] transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          {accepting ? 'Accepting...' : 'Accept'}
        </button>
        {onRecapture && (
          <button
            onClick={onRecapture}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Re-capture
          </button>
        )}
      </div>
    </div>
  )
}

function MetadataCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-[var(--bg-elevated)] p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  )
}
