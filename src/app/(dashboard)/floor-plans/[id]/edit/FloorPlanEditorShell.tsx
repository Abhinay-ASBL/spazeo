'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import type { FloorPlanGeometry } from '@/stores/floorPlanEditorStore'
import { ExtractionProgress } from '@/components/floor-plan/ExtractionProgress'
import { AnimatedBuildUp } from '@/components/floor-plan/AnimatedBuildUp'
import { ChevronRight, Home, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type PageState = 'loading' | 'extracting' | 'build-up' | 'editing' | 'error'

interface FloorPlanEditorShellProps {
  projectId: string
}

export function FloorPlanEditorShell({ projectId }: FloorPlanEditorShellProps) {
  const router = useRouter()
  const id = projectId as Id<'floorPlanProjects'>

  const project = useQuery(api.floorPlanProjects.getById, { projectId: id })
  const floorPlans = useQuery(api.floorPlanDetails.listByProject, {
    projectId: id,
  })

  const [activeFloorIndex, setActiveFloorIndex] = useState(0)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [buildUpGeometry, setBuildUpGeometry] =
    useState<FloorPlanGeometry | null>(null)
  const [editingGeometry, setEditingGeometry] =
    useState<FloorPlanGeometry | null>(null)

  const activeFloorPlan = useMemo(
    () => (floorPlans && floorPlans.length > 0 ? floorPlans[activeFloorIndex] : null),
    [floorPlans, activeFloorIndex]
  )

  // Determine page state from floor plan data
  useEffect(() => {
    if (project === undefined || floorPlans === undefined) {
      setPageState('loading')
      return
    }

    if (project === null) {
      router.replace('/floor-plans')
      return
    }

    if (!floorPlans || floorPlans.length === 0) {
      setPageState('error')
      return
    }

    const fp = floorPlans[activeFloorIndex]
    if (!fp) {
      setPageState('error')
      return
    }

    if (
      fp.extractionStatus === 'processing' ||
      fp.extractionStatus === 'pending'
    ) {
      setPageState('extracting')
    } else if (fp.extractionStatus === 'completed' && fp.geometry && !editingGeometry) {
      // Already completed -- go straight to editing
      setEditingGeometry(fp.geometry as FloorPlanGeometry)
      setPageState('editing')
    } else if (fp.extractionStatus === 'failed' && !editingGeometry) {
      setPageState('error')
    }
  }, [project, floorPlans, activeFloorIndex, router, editingGeometry])

  const handleExtractionComplete = useCallback(
    (geometry: FloorPlanGeometry) => {
      setBuildUpGeometry(geometry)
      setPageState('build-up')
    },
    []
  )

  const handleExtractionError = useCallback(() => {
    setPageState('error')
  }, [])

  const handleBuildUpComplete = useCallback(() => {
    if (buildUpGeometry) {
      setEditingGeometry(buildUpGeometry)
      setBuildUpGeometry(null)
    }
    setPageState('editing')
  }, [buildUpGeometry])

  const handleFloorTab = useCallback(
    (index: number) => {
      setActiveFloorIndex(index)
      setEditingGeometry(null)
      setBuildUpGeometry(null)
    },
    []
  )

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2
            className="h-8 w-8 mx-auto mb-3 animate-spin"
            style={{ color: '#D4A017' }}
          />
          <p className="text-sm" style={{ color: '#6B6560' }}>
            Loading floor plan...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0908' }}>
      {/* Header */}
      <div
        className="border-b px-6 py-3"
        style={{ borderColor: 'rgba(168, 162, 158, 0.15)' }}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs mb-2">
          <Link
            href="/floor-plans"
            className="transition-colors hover:opacity-80"
            style={{ color: '#6B6560' }}
          >
            Floor Plans
          </Link>
          <ChevronRight className="h-3 w-3" style={{ color: '#6B6560' }} />
          <span style={{ color: '#A8A29E' }}>
            {project?.name ?? 'Project'}
          </span>
          <ChevronRight className="h-3 w-3" style={{ color: '#6B6560' }} />
          <span style={{ color: '#F5F3EF' }}>Edit</span>
        </nav>

        {/* Project header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1
              className="text-lg font-semibold"
              style={{
                color: '#F5F3EF',
                fontFamily: 'var(--font-jakarta)',
              }}
            >
              {project?.name ?? 'Untitled Project'}
            </h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor:
                  pageState === 'editing'
                    ? 'rgba(52, 211, 153, 0.15)'
                    : pageState === 'extracting'
                      ? 'rgba(212, 160, 23, 0.15)'
                      : pageState === 'error'
                        ? 'rgba(248, 113, 113, 0.15)'
                        : 'rgba(168, 162, 158, 0.15)',
                color:
                  pageState === 'editing'
                    ? '#34D399'
                    : pageState === 'extracting'
                      ? '#D4A017'
                      : pageState === 'error'
                        ? '#F87171'
                        : '#A8A29E',
              }}
            >
              {pageState === 'editing'
                ? 'Ready'
                : pageState === 'extracting'
                  ? 'Extracting'
                  : pageState === 'build-up'
                    ? 'Processing'
                    : pageState === 'error'
                      ? 'Error'
                      : 'Loading'}
            </span>
          </div>

          {floorPlans && (
            <span className="text-xs" style={{ color: '#6B6560' }}>
              {floorPlans.length} floor{floorPlans.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Floor tabs (if multiple floors) */}
        {floorPlans && floorPlans.length > 1 && (
          <div className="flex gap-1 mt-3">
            {floorPlans.map((fp, index) => {
              const isActive = index === activeFloorIndex
              const label = fp.label || `Floor ${fp.floorNumber}`
              return (
                <button
                  key={fp._id}
                  onClick={() => handleFloorTab(index)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? 'rgba(212, 160, 23, 0.15)'
                      : 'transparent',
                    color: isActive ? '#D4A017' : '#6B6560',
                    border: isActive
                      ? '1px solid rgba(212, 160, 23, 0.3)'
                      : '1px solid transparent',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="p-6">
        {/* Extracting state */}
        {pageState === 'extracting' && activeFloorPlan && (
          <ExtractionProgress
            floorPlanId={activeFloorPlan._id}
            onComplete={handleExtractionComplete}
            onError={handleExtractionError}
          />
        )}

        {/* Build-up animation */}
        {pageState === 'build-up' && buildUpGeometry && (
          <AnimatedBuildUp
            geometry={buildUpGeometry}
            onAnimationComplete={handleBuildUpComplete}
          />
        )}

        {/* Editing placeholder */}
        {pageState === 'editing' && editingGeometry && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div
              className="rounded-xl p-8 text-center max-w-lg"
              style={{ backgroundColor: '#1B1916' }}
            >
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)' }}
              >
                <Home className="h-6 w-6" style={{ color: '#34D399' }} />
              </div>

              <h3
                className="text-lg font-semibold mb-2"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                Editor coming soon
              </h3>
              <p className="text-sm mb-4" style={{ color: '#A8A29E' }}>
                Geometry data saved successfully. The full editor will be
                available in Plan 04.
              </p>

              {/* Debug geometry preview */}
              <details className="text-left">
                <summary
                  className="text-xs cursor-pointer mb-2"
                  style={{ color: '#6B6560' }}
                >
                  View extracted geometry (debug)
                </summary>
                <pre
                  className="text-xs rounded-lg p-3 overflow-auto max-h-60"
                  style={{
                    backgroundColor: '#0A0908',
                    color: '#A8A29E',
                    border: '1px solid rgba(168, 162, 158, 0.1)',
                  }}
                >
                  {JSON.stringify(editingGeometry, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* Error state */}
        {pageState === 'error' && activeFloorPlan && (
          <ExtractionProgress
            floorPlanId={activeFloorPlan._id}
            onComplete={handleExtractionComplete}
            onError={handleExtractionError}
          />
        )}

        {/* Error with no floor plan */}
        {pageState === 'error' && !activeFloorPlan && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div
              className="rounded-xl p-8 text-center max-w-md"
              style={{ backgroundColor: '#1B1916' }}
            >
              <p className="text-sm mb-4" style={{ color: '#A8A29E' }}>
                No floor plans found for this project.
              </p>
              <Link
                href="/floor-plans/new"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
                style={{ backgroundColor: '#D4A017', color: '#0A0908' }}
              >
                Start Over
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
