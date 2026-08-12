'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { HotspotData } from '@/components/viewer/PanoramaViewer'
import { useQuery, useMutation } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSessionTracker } from '@/hooks/useSessionTracker'
import { usePanoramaTracking } from '@/hooks/usePanoramaTracking'
import { useViewerStore } from '@/hooks/useViewerStore'
import { PhoneInput } from '@/components/sales/PhoneInput'
import { CustomerCard } from '@/components/sales/CustomerCard'
import { PostTourForm } from '@/components/sales/PostTourForm'
import { SalesTopBar } from '@/components/sales/SalesTopBar'
import { HotspotInfoPanel } from '@/components/viewer/HotspotInfoPanel'
import { HotspotVideoModal } from '@/components/viewer/HotspotVideoModal'

const PanoramaViewer = dynamic(
  () => import('@/components/viewer/PanoramaViewer').then((m) => m.PanoramaViewer),
  { ssr: false }
)

/* ── Proxy helper for local Convex storage URLs ── */
function proxyUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const p = new URL(url)
    if ((p.hostname === '127.0.0.1' || p.hostname === 'localhost') && p.port === '3210') {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`
    }
  } catch { /* invalid url */ }
  return url
}

type ViewState = 'phone_input' | 'customer_summary' | 'tour_active' | 'post_tour'

export default function SalesModePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, isLoaded: clerkLoaded } = useUser()

  // State machine
  const [viewState, setViewState] = useState<ViewState>('phone_input')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [, setCustomerId] = useState<Id<'customers'> | null>(null)
  const [salesSessionId, setSalesSessionId] = useState<Id<'salesSessions'> | null>(null)
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeHotspotId = useViewerStore((s) => s.activeHotspotId)
  const setActiveHotspot = useViewerStore((s) => s.setActiveHotspot)
  const videoModalUrl = useViewerStore((s) => s.videoModalUrl)
  const videoModalTitle = useViewerStore((s) => s.videoModalTitle)
  const closeVideoModal = useViewerStore((s) => s.closeVideoModal)

  const tourData = useQuery(api.tours.getBySlugWithScenes, { slug })
  const findCustomer = useQuery(
    api.customers.findByPhone,
    phoneDigits.length >= 7 ? { phone: phoneDigits } : 'skip'
  )

  const createCustomer = useMutation(api.customers.create)
  const updateCustomer = useMutation(api.customers.update)
  const createSalesSession = useMutation(api.salesSessions.create)
  const endSalesSession = useMutation(api.salesSessions.end)

  const tourId = tourData && '_id' in tourData ? (tourData._id as Id<'tours'>) : null
  const scenes = useMemo(() => (tourData as { scenes?: Array<{ _id: string; title: string; imageUrl?: string | null; order?: number }> })?.scenes ?? [], [tourData])
  const activeScene = scenes.find((s) => s._id === activeSceneId) ?? scenes[0] ?? null
  const activeHotspots: HotspotData[] = (activeScene as (typeof activeScene & { hotspots?: HotspotData[] }) | null)?.hotspots ?? []
  const activeHotspot = activeHotspotId
    ? (activeHotspots.find((h: { _id: string }) => h._id === activeHotspotId) ?? null)
    : null

  // Tracking — only active during tour
  const trackingTourId = viewState === 'tour_active' ? tourId : null
  const { sessionId, trackEvent } = useSessionTracker(trackingTourId)

  const viewDirectionGetterRef = useRef<
    null | (() => { yaw: number; pitch: number; zoom?: number } | null)
  >(null)
  const getViewDirection = useCallback(
    () => (viewDirectionGetterRef.current ? viewDirectionGetterRef.current() : null),
    []
  )
  const { onDragStart: panoOnDragStart, onDragEnd: panoOnDragEnd } = usePanoramaTracking({
    sceneId: viewState === 'tour_active' ? (activeSceneId as Id<'scenes'> | null) : null,
    sceneOrder: typeof activeScene?.order === 'number' ? activeScene.order : undefined,
    getViewDirection,
    trackEvent,
  })

  useEffect(() => {
    if (scenes.length > 0 && !activeSceneId) {
      setActiveSceneId(scenes[0]._id)
    }
  }, [scenes, activeSceneId])

  /* ── Phone lookup ── */
  const handlePhoneLookup = useCallback(
    (digits: string) => {
      setPhoneDigits(digits)
      setLookingUp(true)
      // findByPhone reactive query triggers on phoneDigits change
      setTimeout(() => {
        setViewState('customer_summary')
        setLookingUp(false)
      }, 500)
    },
    []
  )

  /* ── Start tour ── */
  const handleStartTour = useCallback(
    async (existingCustomerId: string, customerName?: string) => {
      if (!tourId) return
      try {
        let cid: Id<'customers'>
        if (existingCustomerId) {
          cid = existingCustomerId as Id<'customers'>
          if (customerName) {
            await updateCustomer({ customerId: cid, name: customerName })
          }
        } else {
          cid = await createCustomer({ phone: phoneDigits, name: customerName })
        }
        setCustomerId(cid)

        const ssId = await createSalesSession({
          tourId,
          customerId: cid,
          sessionId,
        })
        setSalesSessionId(ssId)

        if (scenes.length > 0) {
          setActiveSceneId(scenes[0]._id)
        }

        setViewState('tour_active')

        trackEvent({
          event: 'tour_view',
          metadata: {
            salesMode: true,
            customerId: cid,
            referrer: 'sales_mode',
          },
        })
      } catch (err) {
        toast.error('Failed to start tour session')
        console.error(err)
      }
    },
    [tourId, phoneDigits, sessionId, scenes, createCustomer, updateCustomer, createSalesSession, trackEvent]
  )

  /* ── End tour ── */
  const handleEndTour = useCallback(() => {
    setViewState('post_tour')
  }, [])

  /* ── Post-tour save ── */
  const handlePostTourSave = useCallback(
    async (data: {
      interestLevel?: 'hot' | 'warm' | 'cold'
      postTourNote?: string
      customerName?: string
    }) => {
      if (!salesSessionId) return
      setSaving(true)
      try {
        await endSalesSession({
          salesSessionId,
          interestLevel: data.interestLevel,
          postTourNote: data.postTourNote,
          customerName: data.customerName,
        })
        toast.success('Session saved!')
        setViewState('phone_input')
        setPhoneDigits('')
        setCustomerId(null)
        setSalesSessionId(null)
        setActiveSceneId(null)
      } catch {
        toast.error('Failed to save session')
      } finally {
        setSaving(false)
      }
    },
    [salesSessionId, endSalesSession]
  )

  const handlePostTourSkip = useCallback(async () => {
    if (salesSessionId) {
      await endSalesSession({ salesSessionId }).catch(() => {})
    }
    setViewState('phone_input')
    setPhoneDigits('')
    setCustomerId(null)
    setSalesSessionId(null)
    setActiveSceneId(null)
  }, [salesSessionId, endSalesSession])

  /* ── Hotspot click ── */
  const handleHotspotClick = useCallback(
    (hotspot: { type: string; targetSceneId?: string; _id?: string; content?: string; videoUrl?: string; title?: string }) => {
      trackEvent({
        event: 'hotspot_click',
        sceneId: activeSceneId as Id<'scenes'> | undefined,
        metadata: {
          hotspotId: hotspot._id,
          hotspotType: hotspot.type,
          targetSceneId: hotspot.targetSceneId,
          salesMode: true,
        },
      })

      if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
        const hasInfo = !!(hotspot.title || (hotspot as Record<string, unknown>).description)
        if (hasInfo && hotspot._id) {
          setActiveHotspot(hotspot._id)
        } else {
          setActiveSceneId(hotspot.targetSceneId)
        }
        return
      }
      if (hotspot.type === 'media') {
        const videoSrc = (hotspot as Record<string, unknown>).videoUrl as string | undefined || hotspot.content
        if (videoSrc) {
          useViewerStore.getState().openVideoModal(videoSrc, hotspot.title)
          return
        }
      }
      if (hotspot._id) setActiveHotspot(hotspot._id)
    },
    [setActiveHotspot, trackEvent, activeSceneId]
  )

  useEffect(() => {
    setActiveHotspot(null)
  }, [activeSceneId, setActiveHotspot])

  /* ── Auth + loading gates ── */
  if (!clerkLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0A0908' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    )
  }

  if (!user) {
    router.push(`/sign-in?redirect_url=/tour/${slug}/sales`)
    return null
  }

  if (tourData === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0A0908' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    )
  }

  if (tourData === null) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#0A0908' }}>
        <p className="text-lg font-semibold" style={{ color: '#F5F3EF' }}>Tour not found</p>
      </div>
    )
  }

  /* ── Render by state ── */
  if (viewState === 'phone_input') {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0A0908' }}>
        <div className="flex flex-col items-center gap-8 px-6">
          <p className="text-xs font-medium" style={{ color: '#6B6560' }}>{tourData.title}</p>
          <PhoneInput onSubmit={handlePhoneLookup} loading={lookingUp} />
        </div>
      </div>
    )
  }

  if (viewState === 'customer_summary') {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0A0908' }}>
        <CustomerCard
          data={findCustomer ?? null}
          phone={phoneDigits}
          isNew={!findCustomer}
          onStartTour={handleStartTour}
          onBack={() => {
            setViewState('phone_input')
            setPhoneDigits('')
          }}
        />
      </div>
    )
  }

  if (viewState === 'post_tour') {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0A0908' }}>
        <PostTourForm
          customerName={findCustomer?.customer.name}
          onSave={handlePostTourSave}
          onSkip={handlePostTourSkip}
          saving={saving}
        />
      </div>
    )
  }

  /* ── tour_active ── */
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#0A0908' }}>
      <SalesTopBar
        customerName={findCustomer?.customer.name}
        customerPhone={phoneDigits}
        tourTitle={tourData.title}
        onEndTour={handleEndTour}
      />

      {activeScene?.imageUrl ? (
        <PanoramaViewer
          imageUrl={proxyUrl(activeScene.imageUrl as string) ?? ''}
          height="100vh"
          hotspots={activeHotspots}
          onHotspotClick={handleHotspotClick as (hotspot: HotspotData) => void}
          autoRotate={false}
          zoomLevel={1}
          onViewDirectionReady={(getter) => {
            viewDirectionGetterRef.current = getter
          }}
          onDragStart={panoOnDragStart}
          onDragEnd={panoOnDragEnd}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <p style={{ color: '#6B6560' }}>No scenes available</p>
        </div>
      )}

      {/* Scene navigator */}
      {scenes.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 px-3 py-2 rounded-full"
          style={{ backgroundColor: 'rgba(10,9,8,0.7)', backdropFilter: 'blur(8px)' }}
        >
          {scenes.map((s: { _id: string; title: string }, i: number) => (
            <button
              key={s._id}
              onClick={() => setActiveSceneId(s._id)}
              className="w-8 h-8 rounded-full text-[10px] font-medium flex items-center justify-center"
              title={s.title}
              style={{
                backgroundColor: s._id === activeSceneId ? '#D4A017' : 'rgba(255,255,255,0.1)',
                color: s._id === activeSceneId ? '#0A0908' : '#A8A29E',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Hotspot info panel */}
      {activeHotspot && (
        <HotspotInfoPanel
          hotspot={activeHotspot}
          onClose={() => setActiveHotspot(null)}
          onNavigate={(targetSceneId: string) => {
            setActiveSceneId(targetSceneId)
            setActiveHotspot(null)
          }}
        />
      )}

      {/* Video modal */}
      {videoModalUrl && (
        <HotspotVideoModal
          url={videoModalUrl}
          title={videoModalTitle}
          onClose={closeVideoModal}
        />
      )}
    </div>
  )
}
