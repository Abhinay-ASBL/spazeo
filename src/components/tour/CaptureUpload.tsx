'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ReconstructionProgress } from './ReconstructionProgress'
import { SplatPreview } from './SplatPreview'
import {
  Upload,
  Video,
  Images,
  CheckCircle,
  RotateCcw,
  Box,
  FileText,
  Clock,
  Camera,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CaptureUploadProps {
  tourId: Id<'tours'>
}

type InputType = 'video' | 'photos'

const ACTIVE_STATUSES = ['uploading', 'queued', 'extracting_frames', 'reconstructing', 'compressing']

export function CaptureUpload({ tourId }: CaptureUploadProps) {
  const tour = useQuery(api.tours.getById, { tourId })
  const recentJob = useQuery(api.reconstructionJobs.getByTourId, { tourId })
  const createJob = useMutation(api.reconstructionJobs.create)
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl)

  const [showUpload, setShowUpload] = useState(false)
  const [selectedType, setSelectedType] = useState<InputType | null>(null)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const handleReupload = useCallback(() => {
    setShowUpload(true)
    setSelectedType(null)
    setFiles([])
  }, [])

  // Loading state
  if (tour === undefined || recentJob === undefined) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
        <div className="h-32 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--brand-gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // State 4: Tour already has an accepted 3D model
  if (tour?.splatStorageId && tour?.splatMetadata && !showUpload) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              3D Model Active
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Your tour has a linked 3D reconstruction
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetadataCard
            icon={<FileText className="w-4 h-4" />}
            label="File Size"
            value={formatFileSize(tour.splatMetadata.fileSizeBytes)}
          />
          <MetadataCard
            icon={<Box className="w-4 h-4" />}
            label="Gaussians"
            value={tour.splatMetadata.gaussianCount.toLocaleString()}
          />
          <MetadataCard
            icon={<Clock className="w-4 h-4" />}
            label="Processing Time"
            value={formatDuration(tour.splatMetadata.processingTimeMs)}
          />
          <MetadataCard
            icon={<Camera className="w-4 h-4" />}
            label="Input Type"
            value={tour.splatMetadata.inputType === 'video' ? 'Video' : 'Photos'}
          />
        </div>

        <button
          onClick={handleReupload}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Re-capture with new input
        </button>
      </div>
    )
  }

  // State 2: Active job in progress
  if (recentJob && ACTIVE_STATUSES.includes(recentJob.status) && !showUpload) {
    return <ReconstructionProgress tourId={tourId} onReupload={handleReupload} />
  }

  // State 3: Job completed, pending review
  if (recentJob && recentJob.status === 'completed' && !showUpload) {
    return (
      <SplatPreview
        jobId={recentJob._id}
        tourId={tourId}
        onRecapture={handleReupload}
      />
    )
  }

  // State 3b: Job failed — show ReconstructionProgress which handles failure state
  if (recentJob && recentJob.status === 'failed' && !showUpload) {
    return <ReconstructionProgress tourId={tourId} onReupload={handleReupload} />
  }

  // State 1: Upload UI (default or forced via showUpload)
  const handleUpload = async () => {
    if (!selectedType || files.length === 0) return

    setUploading(true)
    try {
      // Upload files to Convex storage
      const storageIds: Id<'_storage'>[] = []
      for (const file of files) {
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!result.ok) throw new Error('Failed to upload file')
        const { storageId } = await result.json()
        storageIds.push(storageId)
      }

      // Create reconstruction job
      await createJob({
        tourId,
        inputType: selectedType,
        inputStorageIds: storageIds,
      })

      setShowUpload(false)
      setFiles([])
      setSelectedType(null)
      toast.success('Reconstruction started!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        3D Reconstruction
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Upload a video walkthrough or multiple photos to generate a 3D model
      </p>

      {/* Input Type Selection */}
      {!selectedType && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedType('video')}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--brand-gold)]/50 hover:bg-[var(--brand-gold)]/5 transition-all group"
          >
            <Video className="w-8 h-8 text-[var(--text-muted)] group-hover:text-[var(--brand-gold)] transition-colors" />
            <span className="font-medium text-[var(--text-primary)]">Video Walkthrough</span>
            <span className="text-xs text-[var(--text-muted)] text-center">
              Upload a video walking through the space
            </span>
          </button>
          <button
            onClick={() => setSelectedType('photos')}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--brand-gold)]/50 hover:bg-[var(--brand-gold)]/5 transition-all group"
          >
            <Images className="w-8 h-8 text-[var(--text-muted)] group-hover:text-[var(--brand-gold)] transition-colors" />
            <span className="font-medium text-[var(--text-primary)]">Multi-Angle Photos</span>
            <span className="text-xs text-[var(--text-muted)] text-center">
              Upload photos from multiple angles
            </span>
          </button>
        </div>
      )}

      {/* File Upload */}
      {selectedType && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--text-secondary)]">
              {selectedType === 'video' ? 'Select video file' : 'Select photos (minimum 20 recommended)'}
            </span>
            <button
              onClick={() => {
                setSelectedType(null)
                setFiles([])
              }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Change type
            </button>
          </div>

          <label className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--brand-gold)]/50 cursor-pointer transition-colors">
            <Upload className="w-8 h-8 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {files.length > 0
                ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                : 'Click to browse or drag files here'}
            </span>
            <input
              type="file"
              className="hidden"
              accept={selectedType === 'video' ? 'video/*' : 'image/*'}
              multiple={selectedType === 'photos'}
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? [])
                setFiles(selected)
              }}
            />
          </label>

          {files.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--brand-gold)] text-[var(--bg-carbon)] font-semibold text-sm hover:bg-[var(--brand-gold-hover)] transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--bg-carbon)] border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Start Reconstruction
                </>
              )}
            </button>
          )}
        </div>
      )}
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
