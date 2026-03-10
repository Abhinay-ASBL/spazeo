'use client'

import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import type { FloorPlanGeometry } from '@/stores/floorPlanEditorStore'
import { useFloorPlanEditorStore } from '@/stores/floorPlanEditorStore'
import { ExtractionProgress } from '@/components/floor-plan/ExtractionProgress'
import { AnimatedBuildUp } from '@/components/floor-plan/AnimatedBuildUp'
import { ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const FloorPlanEditor = lazy(() =>
  import('@/components/floor-plan/FloorPlanEditor').then((m) => ({
    default: m.FloorPlanEditor,
  }))
)

type PageState = 'loading' | 'extracting' | 'build-up' | 'editing' | 'error'

interface FloorPlanEditorShellProps {
  projectId: string
}

export function FloorPlanEditorShell({ projectId }: FloorPlanEditorShellProps) {
  const router = useRouter()
  const id = projectId as Id<'floorPlanProjects'>

  const project = useQuery(api.floorPlanProjects.getById, { projectId: id })
  const floorPlans = useQuery(api.floorPlanDetails.listByProjectWithUrls, {
    projectId: id,
  })

  const [activeFloorIndex, setActiveFloorIndex] = useState(0)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [buildUpGeometry, setBuildUpGeometry] =
    useState<FloorPlanGeometry | null>(null)
  const [editingGeometry, setEditingGeometry] =
    useState<FloorPlanGeometry | null>(null)

  const isDirty = useFloorPlanEditorStore((s) => s.isDirty)
  const currentGeometry = useFloorPlanEditorStore((s) => s.geometry)
  const updateGeometry = useMutation(api.floorPlanDetails.updateGeometry)

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
    async (index: number) => {
      // Save current floor if dirty before switching
      if (isDirty && activeFloorPlan) {
        try {
          await updateGeometry({
            floorPlanId: activeFloorPlan._id,
            geometry: currentGeometry,
          })
          useFloorPlanEditorStore.setState({ isDirty: false })
          toast.success('Auto-saved before switching floors')
        } catch {
          toast.error('Failed to auto-save. Switch cancelled.')
          return
        }
      }
      setActiveFloorIndex(index)
      setEditingGeometry(null)
      setBuildUpGeometry(null)
    },
    [isDirty, activeFloorPlan, updateGeometry, currentGeometry]
  )

  // Status badge styling
  const statusBadge = useMemo(() => {
    const map: Record<PageState, { bg: string; color: string; label: string }> = {
      loading: { bg: 'rgba(168, 162, 158, 0.15)', color: '#A8A29E', label: 'Loading' },
      extracting: { bg: 'rgba(212, 160, 23, 0.15)', color: '#D4A017', label: 'Extracting' },
      'build-up': { bg: 'rgba(45, 212, 191, 0.15)', color: '#2DD4BF', label: 'Processing' },
      editing: { bg: 'rgba(52, 211, 153, 0.15)', color: '#34D399', label: 'Ready' },
      error: { bg: 'rgba(248, 113, 113, 0.15)', color: '#F87171', label: 'Error' },
    }
    return map[pageState]
  }, [pageState])

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
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0A0908' }}>
      {/* Header */}
      <div
        className="border-b px-6 py-3 shrink-0"
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
                backgroundColor: statusBadge.bg,
                color: statusBadge.color,
              }}
            >
              {statusBadge.label}
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
              const tabStatus = fp.extractionStatus
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
                  {tabStatus === 'processing' || tabStatus === 'pending' ? (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#FBBF24' }} />
                  ) : tabStatus === 'completed' ? (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#34D399' }} />
                  ) : tabStatus === 'failed' ? (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F87171' }} />
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {/* Extracting state */}
        {pageState === 'extracting' && activeFloorPlan && (
          <div className="p-6">
            <ExtractionProgress
              floorPlanId={activeFloorPlan._id}
              onComplete={handleExtractionComplete}
              onError={handleExtractionError}
            />
          </div>
        )}

        {/* Build-up animation */}
        {pageState === 'build-up' && buildUpGeometry && (
          <div className="p-6">
            <AnimatedBuildUp
              geometry={buildUpGeometry}
              onAnimationComplete={handleBuildUpComplete}
            />
          </div>
        )}

        {/* Editing state -- full editor */}
        {pageState === 'editing' && editingGeometry && activeFloorPlan && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#D4A017' }} />
              </div>
            }
          >
            <FloorPlanEditor
              geometry={editingGeometry}
              imageUrl={activeFloorPlan.imageUrl}
              floorPlanId={activeFloorPlan._id}
              extractionStatus={activeFloorPlan.extractionStatus}
            />
          </Suspense>
        )}

        {/* Error state */}
        {pageState === 'error' && activeFloorPlan && (
          <div className="p-6">
            <ExtractionProgress
              floorPlanId={activeFloorPlan._id}
              onComplete={handleExtractionComplete}
              onError={handleExtractionError}
            />
          </div>
        )}

        {/* Error with no floor plan */}
        {pageState === 'error' && !activeFloorPlan && (
          <div className="flex items-center justify-center min-h-[400px] p-6">
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
