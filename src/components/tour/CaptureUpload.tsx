'use client'

/* eslint-disable @next/next/no-img-element */
import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Video,
  ImageIcon,
  Rocket,
  UploadCloud,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CapturePhotoGrid } from './CapturePhotoGrid'
import { CaptureTips } from './CaptureTips'

interface CaptureUploadProps {
  tourId: Id<'tours'>
}

const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500 MB
const MIN_PHOTOS = 10
const MAX_PHOTOS = 30

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function CaptureUpload({ tourId }: CaptureUploadProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'photos'>('video')

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Photos state
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Convex
  const quota = useQuery(api.reconstructionJobs.getRemainingQuota)
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl)
  const createReconstructionJob = useMutation(api.reconstructionJobs.create)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Extract video thumbnail and duration
  const extractVideoMeta = useCallback((file: File) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true

    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl

    video.onloadedmetadata = () => {
      setVideoDuration(video.duration)
      // Seek to 1 second for a better thumbnail
      video.currentTime = Math.min(1, video.duration * 0.1)
    }

    video.onseeked = () => {
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

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setVideoError('Could not process video file')
    }
  }, [])

  // Video dropzone
  const onVideoDrop = useCallback(
    (acceptedFiles: File[]) => {
      setVideoError(null)
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]
      if (file.size > MAX_VIDEO_SIZE) {
        setVideoError('File too large — maximum 500MB')
        return
      }

      setVideoFile(file)
      setVideoThumbnail(null)
      setVideoDuration(null)
      extractVideoMeta(file)
    },
    [extractVideoMeta]
  )

  const videoDropzone = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
    },
    maxFiles: 1,
    multiple: false,
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code
      if (code === 'file-invalid-type') {
        setVideoError('Unsupported format — upload MP4 or MOV')
      } else if (code === 'file-too-large') {
        setVideoError('File too large — maximum 500MB')
      } else {
        setVideoError('Invalid file')
      }
    },
  })

  // Photos dropzone
  const onPhotosDrop = useCallback(
    (acceptedFiles: File[]) => {
      setPhotoError(null)
      const combined = [...photoFiles, ...acceptedFiles]
      if (combined.length > MAX_PHOTOS) {
        setPhotoError(`Maximum ${MAX_PHOTOS} photos — remove some before continuing.`)
        // Still add up to the limit
        setPhotoFiles(combined.slice(0, MAX_PHOTOS))
        return
      }
      setPhotoFiles(combined)
    },
    [photoFiles]
  )

  const photosDropzone = useDropzone({
    onDrop: onPhotosDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    multiple: true,
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code
      if (code === 'file-invalid-type') {
        setPhotoError('Unsupported format — upload JPG or PNG photos')
      } else {
        setPhotoError('Invalid file(s)')
      }
    },
  })

  function removeVideo() {
    setVideoFile(null)
    setVideoThumbnail(null)
    setVideoDuration(null)
    setVideoError(null)
  }

  function removePhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index))
    setPhotoError(null)
  }

  // Validation
  const isVideoValid = activeTab === 'video' && videoFile !== null
  const isPhotosValid = activeTab === 'photos' && photoFiles.length >= MIN_PHOTOS
  const isUploadValid = isVideoValid || isPhotosValid
  const quotaRemaining = quota?.remaining ?? null
  const isQuotaExhausted = quotaRemaining === 0
  const canStartReconstruction = isUploadValid && !isQuotaExhausted && !uploading

  // Start reconstruction
  async function handleStartReconstruction() {
    if (!canStartReconstruction) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const filesToUpload = activeTab === 'video' ? [videoFile!] : photoFiles
      const totalFiles = filesToUpload.length
      const storageIds: Id<'_storage'>[] = []

      for (let i = 0; i < totalFiles; i++) {
        setUploadProgress(Math.round(((i) / totalFiles) * 100))

        // 3-step upload: generate URL, POST file, collect storageId
        const uploadUrl = await generateUploadUrl()
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': filesToUpload[i].type },
          body: filesToUpload[i],
        })
        if (!response.ok) throw new Error('Upload failed')

        const { storageId } = await response.json()
        storageIds.push(storageId as Id<'_storage'>)
      }

      setUploadProgress(100)

      // Create reconstruction job
      await createReconstructionJob({
        tourId,
        inputType: activeTab,
        inputStorageIds: storageIds,
      })

      toast.success('Reconstruction started!')

      // Clear state
      if (activeTab === 'video') {
        removeVideo()
      } else {
        setPhotoFiles([])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start reconstruction'
      toast.error(message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Quota display
  const quotaText =
    quota === undefined
      ? 'Loading...'
      : quota.remaining === -1
        ? 'Unlimited reconstructions'
        : `${quota.remaining} of ${quota.limit} reconstructions remaining`

  return (
    <div className="flex flex-col gap-4">
      {/* Header with quota */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
        >
          3D Capture
        </h3>
        <span
          className="text-xs"
          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
        >
          {quotaText}
        </span>
      </div>

      {/* Tab toggle */}
      <div
        className="flex rounded-lg p-1 gap-1"
        style={{ backgroundColor: '#0A0908' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('video')}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all"
          style={{
            backgroundColor: activeTab === 'video' ? '#D4A017' : 'transparent',
            color: activeTab === 'video' ? '#0A0908' : '#A8A29E',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <Video size={14} />
          Video Walkthrough
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all"
          style={{
            backgroundColor: activeTab === 'photos' ? '#D4A017' : 'transparent',
            color: activeTab === 'photos' ? '#0A0908' : '#A8A29E',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <ImageIcon size={14} />
          Multi-Angle Photos
        </button>
      </div>

      {/* Content: upload zone + tips */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Upload zone */}
        <div className="flex-1 flex flex-col gap-3">
          {activeTab === 'video' ? (
            <>
              {!videoFile ? (
                <div
                  {...videoDropzone.getRootProps()}
                  className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
                  style={{
                    borderColor: videoDropzone.isDragActive
                      ? '#D4A017'
                      : 'rgba(212,160,23,0.15)',
                    backgroundColor: videoDropzone.isDragActive
                      ? 'rgba(212,160,23,0.04)'
                      : 'transparent',
                  }}
                >
                  <input {...videoDropzone.getInputProps()} />
                  <UploadCloud size={36} strokeWidth={1.5} style={{ color: '#2E2A24' }} />
                  <p
                    className="text-sm"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {videoDropzone.isDragActive
                      ? 'Drop video here'
                      : 'Drag video here or click to browse'}
                  </p>
                  <p className="text-xs" style={{ color: '#6B6560' }}>
                    MP4 or MOV, up to 500MB
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-lg p-4 flex gap-4"
                  style={{
                    backgroundColor: '#1B1916',
                    border: '1px solid rgba(212,160,23,0.1)',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-28 h-20 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: '#0A0908' }}
                  >
                    {videoThumbnail ? (
                      <img
                        src={videoThumbnail}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video size={24} style={{ color: '#2E2A24' }} />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {videoFile.name}
                    </p>
                    <p className="text-xs" style={{ color: '#6B6560' }}>
                      {formatBytes(videoFile.size)}
                      {videoDuration !== null && ` · ${formatDuration(videoDuration)}`}
                    </p>
                  </div>
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="self-start p-1.5 rounded-md transition-colors"
                    style={{ color: '#A8A29E' }}
                    aria-label="Remove video"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              {videoError && (
                <div className="flex items-center gap-2 px-1">
                  <AlertCircle size={14} style={{ color: '#F87171' }} />
                  <p className="text-xs" style={{ color: '#F87171' }}>
                    {videoError}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Photo counter */}
              <div className="flex items-center gap-2">
                {photoFiles.length >= MIN_PHOTOS ? (
                  <CheckCircle2 size={14} style={{ color: '#34D399' }} />
                ) : (
                  <ImageIcon size={14} style={{ color: '#6B6560' }} />
                )}
                <span
                  className="text-xs font-medium"
                  style={{
                    color: photoFiles.length >= MIN_PHOTOS ? '#34D399' : '#A8A29E',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {photoFiles.length} of {MIN_PHOTOS}-{MAX_PHOTOS} photos uploaded
                </span>
              </div>

              {/* Drop zone */}
              <div
                {...photosDropzone.getRootProps()}
                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                style={{
                  borderColor: photosDropzone.isDragActive
                    ? '#D4A017'
                    : 'rgba(212,160,23,0.15)',
                  backgroundColor: photosDropzone.isDragActive
                    ? 'rgba(212,160,23,0.04)'
                    : 'transparent',
                }}
              >
                <input {...photosDropzone.getInputProps()} />
                <UploadCloud size={28} strokeWidth={1.5} style={{ color: '#2E2A24' }} />
                <p
                  className="text-sm"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  {photosDropzone.isDragActive
                    ? 'Drop photos here'
                    : 'Drag photos here or click to browse'}
                </p>
                <p className="text-xs" style={{ color: '#6B6560' }}>
                  JPG or PNG
                </p>
              </div>

              {/* Photo grid */}
              <CapturePhotoGrid files={photoFiles} onRemove={removePhoto} />

              {/* Validation messages */}
              {photoFiles.length > 0 && photoFiles.length < MIN_PHOTOS && (
                <div className="flex items-center gap-2 px-1">
                  <AlertCircle size={14} style={{ color: '#FBBF24' }} />
                  <p className="text-xs" style={{ color: '#FBBF24' }}>
                    Upload at least {MIN_PHOTOS} photos for good reconstruction quality
                  </p>
                </div>
              )}
              {photoError && (
                <div className="flex items-center gap-2 px-1">
                  <AlertCircle size={14} style={{ color: '#F87171' }} />
                  <p className="text-xs" style={{ color: '#F87171' }}>
                    {photoError}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tips panel */}
        <div className="w-full lg:w-56 flex-shrink-0">
          <CaptureTips tab={activeTab} />
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" style={{ color: '#D4A017' }} />
            <span
              className="text-xs"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Uploading... {uploadProgress}%
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: '#0A0908' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${uploadProgress}%`,
                backgroundColor: '#D4A017',
              }}
            />
          </div>
        </div>
      )}

      {/* Start Reconstruction button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleStartReconstruction}
          disabled={!canStartReconstruction}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            backgroundColor: canStartReconstruction ? '#D4A017' : 'rgba(212,160,23,0.2)',
            color: canStartReconstruction ? '#0A0908' : '#6B6560',
            fontFamily: 'var(--font-dmsans)',
            cursor: canStartReconstruction ? 'pointer' : 'not-allowed',
          }}
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Rocket size={16} />
          )}
          {uploading ? 'Uploading...' : 'Start Reconstruction'}
        </button>
        {isQuotaExhausted && (
          <p
            className="text-center text-xs mt-1.5"
            style={{ color: '#F87171', fontFamily: 'var(--font-dmsans)' }}
          >
            No reconstructions remaining this month
          </p>
        )}
      </div>

      {/* Hidden canvas for video thumbnail extraction */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
