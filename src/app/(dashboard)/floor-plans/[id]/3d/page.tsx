'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { ChevronLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { FloorPlan3DPropertiesPanel } from '@/components/floor-plan/FloorPlan3DPropertiesPanel'
import type { FloorPlanGeometry, FloorPlan3DOverrides } from '@/components/viewer/FloorPlanMesh'

// ---------------------------------------------------------------------------
// Dynamic import — ssr:false required for R3F / Three.js
// ---------------------------------------------------------------------------

const FloorPlanViewer = dynamic(
  () =>
    import('@/components/viewer/FloorPlanViewer').then((m) => ({
      default: m.FloorPlanViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    ),
  }
)

// ---------------------------------------------------------------------------
// Shimmer skeleton
// ---------------------------------------------------------------------------

function ShimmerSkeleton() {
  return (
    <div
      className="flex"
      style={{ height: '100vh', backgroundColor: '#0A0908' }}
      aria-hidden="true"
    >
      {/* Left — viewer area (2/3) */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div
          className="w-full h-full animate-pulse"
          style={{ backgroundColor: '#1B1916' }}
        />
        {/* Gold shimmer gradient overlay */}
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background:
              'linear-gradient(135deg, rgba(212,160,23,0.04) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Right — properties panel (320px) */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          backgroundColor: '#12100E',
          borderLeft: '1px solid rgba(212,160,23,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
        }}
      >
        {[80, 60, 120, 60, 100].map((h, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg"
            style={{ height: h, backgroundColor: '#1B1916' }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FloorPlan3DPage() {
  const params = useParams()
  const router = useRouter()
  const floorPlanId = params.id as string

  const floorPlan = useQuery(api.floorPlanDetails.getById, {
    floorPlanId: floorPlanId as Id<'floorPlanDetails'>,
  })

  // Local overrides state — no Convex round-trip during review
  const [overrides, setOverrides] = useState<FloorPlan3DOverrides>({
    globalCeilingHeight: 2.7,
    doorWidth: 0.9,
    doorHeight: 2.1,
    roomOverrides: {},
  })

  // Debounced overrides (300ms) passed to FloorPlanViewer
  const [debouncedOverrides, setDebouncedOverrides] = useState(overrides)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedOverrides(overrides), 300)
    return () => clearTimeout(t)
  }, [overrides])

  const [isFinalizing, setIsFinalizing] = useState(false)
  const createTour = useMutation(api.tours.createFromFloorPlan)

  const handleFinalize = async () => {
    setIsFinalizing(true)
    try {
      const geometry = floorPlan?.geometry as FloorPlanGeometry | undefined
      const doorPositions = (geometry?.doors ?? []).map((d) => ({
        position: d.position,
        width: d.width,
      }))
      const result = await createTour({
        floorPlanId: floorPlanId as Id<'floorPlanDetails'>,
        title: floorPlan?.label ?? 'Floor Plan Tour',
        floorPlan3DConfig: {
          globalCeilingHeight: overrides.globalCeilingHeight,
          doorWidth: overrides.doorWidth,
          doorHeight: overrides.doorHeight,
          roomOverrides: Object.entries(overrides.roomOverrides).map(([roomId, o]) => ({
            roomId,
            ceilingHeight: o.ceilingHeight,
            wallColor: o.wallColor,
            floorType: o.floorType,
          })),
        },
        doorPositions,
      })
      toast.success('Tour created!')
      router.push(`/tours/${result.tourId}/edit`)
    } catch (err) {
      toast.error('Failed to create tour')
      console.error(err)
    } finally {
      setIsFinalizing(false)
    }
  }

  // --- Loading state ---
  if (floorPlan === undefined) {
    return <ShimmerSkeleton />
  }

  // --- Error / not found ---
  if (floorPlan === null || !floorPlan.geometry) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4"
        style={{ height: '100vh', backgroundColor: '#0A0908' }}
      >
        <p
          className="text-base text-center"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)', maxWidth: 360 }}
        >
          {floorPlan === null
            ? 'Floor plan not found.'
            : 'Floor plan not yet extracted. Return to the editor and wait for extraction to complete.'}
        </p>
        <Link
          href="/floor-plans"
          className="text-sm font-medium transition-colors"
          style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
        >
          Go back to Floor Plans
        </Link>
      </div>
    )
  }

  const geometry = floorPlan.geometry as FloorPlanGeometry

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#0A0908',
      }}
    >
      {/* Page header */}
      <header
        style={{
          height: 48,
          backgroundColor: '#12100E',
          borderBottom: '1px solid rgba(212,160,23,0.12)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 12,
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        {/* Back button */}
        <Link
          href={`/floor-plans/${floorPlanId}/edit`}
          aria-label="Back to floor plan editor"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            color: '#A8A29E',
            transition: 'color 150ms',
          }}
          className="hover:text-[#F5F3EF]"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </Link>

        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-sm"
          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
          aria-label="Breadcrumb"
        >
          <Link
            href="/floor-plans"
            className="transition-colors hover:text-[#F5F3EF]"
            style={{ color: '#A8A29E' }}
          >
            Floor Plans
          </Link>
          <span>/</span>
          <span style={{ color: '#A8A29E' }}>
            {floorPlan.label ?? `Floor ${floorPlan.floorNumber}`}
          </span>
          <span>/</span>
          <span style={{ color: '#F5F3EF', fontWeight: 500 }}>3D Preview</span>
        </nav>
      </header>

      {/* Split view */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left: 3D viewer — flex-grow */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <FloorPlanViewer
            geometry={geometry}
            overrides={debouncedOverrides}
            tourTitle={floorPlan.label ?? 'Floor Plan Tour'}
            enableFurniture={false}
          />
        </div>

        {/* Right: properties panel — fixed 320px */}
        <div
          style={{
            width: 320,
            flexShrink: 0,
            overflowY: 'auto',
            backgroundColor: '#12100E',
            borderLeft: '1px solid rgba(212,160,23,0.12)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <FloorPlan3DPropertiesPanel
            geometry={geometry}
            overrides={overrides}
            onOverrideChange={setOverrides}
            onFinalize={handleFinalize}
            isFinalizing={isFinalizing}
          />
        </div>
      </div>
    </div>
  )
}
