'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { FloorPlanGeometry } from '@/stores/floorPlanEditorStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertTriangle, RefreshCw, Edit3 } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface ExtractionProgressProps {
  floorPlanId: Id<'floorPlanDetails'>
  onComplete: (geometry: FloorPlanGeometry) => void
  onError: () => void
}

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Uploading...',
  processing: 'Analyzing floor plan...',
  extracting_rooms: 'Extracting rooms...',
  identifying_dimensions: 'Identifying dimensions...',
}

const EMPTY_GEOMETRY: FloorPlanGeometry = {
  walls: [],
  rooms: [],
  doors: [],
  windows: [],
  fixtures: [],
  dimensions: [],
  overallWidth: 0,
  overallHeight: 0,
}

export function ExtractionProgress({
  floorPlanId,
  onComplete,
  onError,
}: ExtractionProgressProps) {
  const job = useQuery(api.floorPlanJobs.getByFloorPlan, { floorPlanId })
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    if (!job || hasCompletedRef.current) return

    if (job.status === 'completed' && job.output) {
      hasCompletedRef.current = true
      toast.success('Floor plan extracted successfully')
      const geometry = job.output as FloorPlanGeometry
      // If partial results (walls but no rooms), still pass through
      onComplete(geometry)
    }

    if (job.status === 'failed') {
      onError()
    }
  }, [job, onComplete, onError])

  const statusText =
    job?.status === 'processing'
      ? STATUS_MESSAGES.processing
      : job?.status === 'pending'
        ? STATUS_MESSAGES.pending
        : STATUS_MESSAGES.processing

  // Failed state
  if (job?.status === 'failed') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="rounded-xl p-8 text-center max-w-md"
          style={{ backgroundColor: '#1B1916' }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(248, 113, 113, 0.15)' }}
          >
            <AlertTriangle className="h-6 w-6" style={{ color: '#F87171' }} />
          </div>

          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
          >
            Extraction Failed
          </h3>

          <p className="text-sm mb-6" style={{ color: '#A8A29E' }}>
            {job.error || 'An unexpected error occurred during extraction.'}
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onComplete(EMPTY_GEOMETRY)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'transparent',
                border: '1.5px solid #D4A017',
                color: '#D4A017',
              }}
            >
              <Edit3 className="h-4 w-4" />
              Continue Editing Manually
            </button>

            <Link
              href="/floor-plans/new"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: '#D4A017',
                color: '#0A0908',
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Start Over
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Loading/processing state
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div
        className="rounded-xl p-8 text-center max-w-sm"
        style={{ backgroundColor: '#1B1916' }}
      >
        <motion.div
          className="mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2
            className="h-10 w-10 mx-auto"
            style={{ color: '#D4A017' }}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.p
            key={statusText}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-base font-medium mb-3"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
          >
            {statusText}
          </motion.p>
        </AnimatePresence>

        <p className="text-sm" style={{ color: '#6B6560' }}>
          This usually takes 15-30 seconds
        </p>

        {/* Pulse dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: '#D4A017' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
