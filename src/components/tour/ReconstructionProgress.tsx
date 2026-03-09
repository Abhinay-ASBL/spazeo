'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Upload,
  Clock,
  Film,
  Cpu,
  Archive,
  CheckCircle,
  AlertTriangle,
  Bell,
  RotateCcw,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ReconstructionProgressProps {
  tourId: Id<'tours'>
  onReupload?: () => void
}

const STAGES = [
  { key: 'uploading', label: 'Uploading', icon: Upload },
  { key: 'queued', label: 'Queued', icon: Clock },
  { key: 'extracting_frames', label: 'Extracting Frames', icon: Film },
  { key: 'reconstructing', label: 'Reconstructing', icon: Cpu },
  { key: 'compressing', label: 'Compressing', icon: Archive },
  { key: 'completed', label: 'Complete', icon: CheckCircle },
] as const

const STATUS_MESSAGES: Record<string, string> = {
  uploading: 'Uploading your files...',
  queued: 'Waiting for GPU availability...',
  extracting_frames: 'Extracting frames from your video...',
  reconstructing: 'Building 3D model... This usually takes 12-25 minutes',
  compressing: 'Compressing model for web delivery...',
}

export function ReconstructionProgress({ tourId, onReupload }: ReconstructionProgressProps) {
  const job = useQuery(api.reconstructionJobs.getActiveByTourId, { tourId })
  const mostRecentJob = useQuery(api.reconstructionJobs.getByTourId, { tourId })
  const cancelJob = useMutation(api.reconstructionJobs.cancel)
  const createJob = useMutation(api.reconstructionJobs.create)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [retrying, setRetrying] = useState(false)

  // Use active job, or fall back to most recent for failed state
  const displayJob = job ?? mostRecentJob

  if (!displayJob) return null

  // Failed state
  if (displayJob.status === 'failed') {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[var(--text-primary)] font-semibold text-lg">
              Reconstruction Failed
            </h3>
            <p className="text-red-400 mt-1 text-sm">
              {displayJob.error ?? 'An unknown error occurred during reconstruction.'}
            </p>
            <p className="text-[var(--text-muted)] mt-2 text-xs">
              This attempt does not count toward your monthly limit
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={async () => {
              setRetrying(true)
              try {
                await createJob({
                  tourId,
                  inputType: displayJob.inputType,
                  inputStorageIds: displayJob.inputStorageIds,
                })
                toast.success('Reconstruction restarted')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to retry')
              } finally {
                setRetrying(false)
              }
            }}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-gold)] text-[var(--bg-carbon)] font-semibold text-sm hover:bg-[var(--brand-gold-hover)] transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
          {onReupload && (
            <button
              onClick={onReupload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[var(--brand-gold)] text-sm hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Re-upload
            </button>
          )}
        </div>
      </div>
    )
  }

  const currentStageIndex = STAGES.findIndex((s) => s.key === displayJob.status)

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
      {/* Stage Stepper */}
      <div className="flex items-center justify-between mb-6 overflow-x-auto">
        {STAGES.map((stage, idx) => {
          const isComplete = idx < currentStageIndex
          const isActive = idx === currentStageIndex
          const isPending = idx > currentStageIndex
          const Icon = stage.icon

          return (
            <div key={stage.key} className="flex flex-col items-center flex-1 min-w-[80px]">
              <div className="relative">
                {/* Pulse ring for active stage */}
                {isActive && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-[var(--brand-gold)] opacity-30 animate-ping" />
                    <span
                      className="absolute inset-0 rounded-full bg-[var(--brand-gold)] opacity-20 animate-ping"
                      style={{ animationDelay: '0.5s' }}
                    />
                  </>
                )}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isComplete
                      ? 'bg-[var(--brand-gold)] text-[var(--bg-carbon)]'
                      : isActive
                        ? 'bg-[var(--brand-gold)]/20 text-[var(--brand-gold)] ring-2 ring-[var(--brand-gold)]'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
              </div>
              <span
                className={`mt-2 text-xs text-center ${
                  isActive
                    ? 'text-[var(--brand-gold)] font-semibold'
                    : isComplete
                      ? 'text-[var(--text-secondary)]'
                      : 'text-[var(--text-muted)]'
                }`}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--text-secondary)]">Progress</span>
          <span className="text-xs font-medium text-[var(--brand-gold)]">
            {displayJob.progress ?? 0}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--brand-gold)] transition-all duration-500 ease-out"
            style={{ width: `${displayJob.progress ?? 0}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        {STATUS_MESSAGES[displayJob.status] ?? 'Processing...'}
      </p>

      {/* Info Note */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4">
        <Bell className="w-4 h-4" />
        <span>You can leave this page — we will notify you when complete</span>
      </div>

      {/* Cancel Button */}
      {!showCancelConfirm ? (
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Cancel Reconstruction
        </button>
      ) : (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm text-[var(--text-primary)] mb-3">
            Cancel reconstruction? GPU time already used will count toward your usage.
          </p>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                setCancelling(true)
                try {
                  await cancelJob({ jobId: displayJob._id })
                  toast.success('Reconstruction cancelled')
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to cancel')
                } finally {
                  setCancelling(false)
                  setShowCancelConfirm(false)
                }
              }}
              disabled={cancelling}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </button>
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="px-3 py-1.5 rounded-lg text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Keep Running
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
