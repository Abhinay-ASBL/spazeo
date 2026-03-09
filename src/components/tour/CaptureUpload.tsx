'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ReconstructionProgress } from './ReconstructionProgress'
import { SplatPreview } from './SplatPreview'
import { CapturePhotoGrid } from './CapturePhotoGrid'
import { CaptureTips } from './CaptureTips'
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
  Film,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CaptureUploadProps {
  tourId: Id<'tours'>
}

type InputType = 'video' | 'photos'

const ACTIVE_STATUSES = ['uploading', 'queued', 'extracting_frames', 'reconstructing', 'compressing']

const VIDEO_MAX_SIZE = 500 * 1024 * 1024 // 500MB
const PHOTO_MAX_SIZE = 50 * 1024 * 1024  // 50MB per photo
const PHOTO_MIN_COUNT = 10
const PHOTO_MAX_COUNT = 30

export function CaptureUpload({ tourId }: CaptureUploadProps) {
  const tour = useQuery(api.tours.getById, { tourId })
  const recentJob = useQuery(api.reconstructionJobs.getByTourId, { tourId })
  const quota = useQuery(api.reconstructionJobs.getRemainingQuota)
  const createJob = useMutation(api.reconstructionJobs.create)
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl)

  const [showUpload, setShowUpload] = useState(false)
  const [selectedType, setSelectedType] = useState<InputType | null>(null)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  // Video preview state
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const handleReupload = useCallback(() => {
    setShowUpload(true)
    setSelectedType(null)
    setFiles([])
    setVideoThumbnail(null)
    setVideoDuration(null)
  }, [])

  // Extract video thumbnail and duration
  useEffect(() => {
    if (selectedType !== 'video' || files.length === 0) {
      setVideoThumbnail(null)
      setVideoDuration(null)
      return
    }

    const file = files[0]
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl
    videoRef.current = video

    const handleLoadedData = () => {
      setVideoDuration(video.duration)
      // Seek to 1 second for thumbnail
      video.currentTime = Math.min(1, video.duration)
    }

    const handleSeeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        setVideoThumbnail(canvas.toDataURL('image/jpeg', 0.8))
      }
      URL.revokeObjectURL(objectUrl)
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('seeked', handleSeeked)

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('seeked', handleSeeked)
      video.pause()
      URL.revokeObjectURL(objectUrl)
    }
  }, [files, selectedType])

  // Dropzone rejection handler
  const handleRejections = useCallback((rejections: FileRejection[]) => {
    for (const rejection of rejections) {
      for (const error of rejection.errors) {
        if (error.code === 'file-invalid-type') {
          toast.error(
            selectedType === 'video'
              ? 'Only MP4 and MOV video files are supported'
              : 'Only JPG and PNG photos are supported'
          )
        } else if (error.code === 'file-too-large') {
          toast.error(
            selectedType === 'video'
              ? 'Video must be under 500MB'
              : 'Each photo must be under 50MB'
          )
        } else if (error.code === 'too-many-files') {
          toast.error(`Maximum ${PHOTO_MAX_COUNT} photos allowed`)
        }
      }
    }
  }, [selectedType])

  // Video dropzone
  const videoDropzone = useDropzone({
    accept: { 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'] },
    maxFiles: 1,
    maxSize: VIDEO_MAX_SIZE,
    multiple: false,
    onDrop: (accepted) => {
      if (accepted.length > 0) setFiles(accepted)
    },
    onDropRejected: handleRejections,
    disabled: uploading,
    noClick: false,
  })

  // Photos dropzone
  const photosDropzone = useDropzone({
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: PHOTO_MAX_COUNT,
    maxSize: PHOTO_MAX_SIZE,
    multiple: true,
    onDrop: (accepted) => {
      if (accepted.length > 0) {
        setFiles((prev) => {
          const combined = [...prev, ...accepted]
          if (combined.length > PHOTO_MAX_COUNT) {
            toast.error(`Maximum ${PHOTO_MAX_COUNT} photos allowed`)
            return combined.slice(0, PHOTO_MAX_COUNT)
          }
          return combined
        })
      }
    },
    onDropRejected: handleRejections,
    disabled: uploading,
    noClick: false,
  })

  const dropzone = selectedType === 'video' ? videoDropzone : photosDropzone

  const handleRemovePhoto = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Quota checks
  const quotaExhausted = quota !== undefined && quota !== null &&
    quota.limit !== -1 && (quota.limit - quota.used) <= 0
  const photosInsufficient = selectedType === 'photos' && files.length < PHOTO_MIN_COUNT
  const canStartReconstruction = files.length > 0 && !uploading && !quotaExhausted && !photosInsufficient

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

    // Validate photo count before upload
    if (selectedType === 'photos') {
      if (files.length < PHOTO_MIN_COUNT) {
        toast.error(`Upload at least ${PHOTO_MIN_COUNT} photos for good reconstruction quality`)
        return
      }
      if (files.length > PHOTO_MAX_COUNT) {
        toast.error(`Maximum ${PHOTO_MAX_COUNT} photos allowed`)
        return
      }
    }

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
      setVideoThumbnail(null)
      setVideoDuration(null)
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

      {/* Quota display */}
      {quota && (
        <div className="mb-4">
          {quota.limit === -1 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)]">
              Unlimited reconstructions
            </span>
          ) : quotaExhausted ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-red-400 bg-red-500/10">
              <AlertCircle className="w-3 h-3" />
              No reconstructions remaining — upgrade your plan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)]">
              {quota.limit - quota.used} reconstruction{quota.limit - quota.used !== 1 ? 's' : ''} remaining this month
            </span>
          )}
        </div>
      )}

      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Upload a video walkthrough or multiple photos to generate a 3D model
      </p>

      {/* Input Type Selection */}
      {!selectedType && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedType('video')}
            disabled={quotaExhausted}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--brand-gold)]/50 hover:bg-[var(--brand-gold)]/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Video className="w-8 h-8 text-[var(--text-muted)] group-hover:text-[var(--brand-gold)] transition-colors" />
            <span className="font-medium text-[var(--text-primary)]">Video Walkthrough</span>
            <span className="text-xs text-[var(--text-muted)] text-center">
              Upload a video walking through the space
            </span>
          </button>
          <button
            onClick={() => setSelectedType('photos')}
            disabled={quotaExhausted}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--brand-gold)]/50 hover:bg-[var(--brand-gold)]/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
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
              {selectedType === 'video'
                ? 'Select video file (MP4 or MOV, max 500MB)'
                : `Select photos (JPG/PNG, ${PHOTO_MIN_COUNT}-${PHOTO_MAX_COUNT} photos)`}
            </span>
            <button
              onClick={() => {
                setSelectedType(null)
                setFiles([])
                setVideoThumbnail(null)
                setVideoDuration(null)
              }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Change type
            </button>
          </div>

          {/* Dropzone */}
          <div
            {...dropzone.getRootProps()}
            className={`flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              dropzone.isDragActive
                ? 'border-[var(--brand-gold)] bg-[var(--brand-gold)]/5'
                : 'border-[var(--border-subtle)] hover:border-[var(--brand-gold)]/50'
            }`}
          >
            <input {...dropzone.getInputProps()} />
            <Upload className="w-8 h-8 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)] text-center">
              {dropzone.isDragActive
                ? 'Drop files here...'
                : files.length > 0 && selectedType === 'video'
                  ? `${files[0].name} selected`
                  : files.length > 0 && selectedType === 'photos'
                    ? `${files.length} photo${files.length > 1 ? 's' : ''} selected — drop more or click to add`
                    : 'Click to browse or drag files here'}
            </span>
          </div>

          {/* Video Preview */}
          {selectedType === 'video' && files.length > 0 && (
            <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                {videoThumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={videoThumbnail}
                    alt="Video thumbnail"
                    className="w-24 h-16 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-16 rounded bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0">
                    <Film className="w-6 h-6 text-[var(--text-muted)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {files[0].name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatFileSize(files[0].size)}
                    </span>
                    {videoDuration !== null && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatVideoDuration(videoDuration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Photo Grid with Counter */}
          {selectedType === 'photos' && files.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                {files.length >= PHOTO_MIN_COUNT ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[var(--text-muted)]" />
                )}
                <span className={`text-sm ${
                  files.length >= PHOTO_MIN_COUNT
                    ? 'text-green-400'
                    : 'text-[var(--text-secondary)]'
                }`}>
                  {files.length} of {PHOTO_MIN_COUNT}-{PHOTO_MAX_COUNT} photos
                </span>
              </div>
              <CapturePhotoGrid files={files} onRemove={handleRemovePhoto} />
            </div>
          )}

          {/* Capture Tips */}
          <div className="mt-4">
            <CaptureTips tab={selectedType} />
          </div>

          {/* Start Reconstruction Button */}
          {files.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={!canStartReconstruction}
              className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--brand-gold)] text-[var(--bg-carbon)] font-semibold text-sm hover:bg-[var(--brand-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

function formatVideoDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}m ${secs.toString().padStart(2, '0')}s`
}
