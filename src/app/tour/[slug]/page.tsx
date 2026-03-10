'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
/* eslint-disable @next/next/no-img-element */
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import {
  Maximize2,
  Minimize2,
  Share2,
  X,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import { HotspotInfoPanel } from '@/components/viewer/HotspotInfoPanel'
import { HotspotVideoModal } from '@/components/viewer/HotspotVideoModal'
import { useViewerStore } from '@/hooks/useViewerStore'

/* ── Lazy-load PanoramaViewer ── */
const PanoramaViewer = dynamic(
  () => import('@/components/viewer/PanoramaViewer'),
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

/* ── Lazy-load GaussianSplatViewer ── */
const GaussianSplatViewer = dynamic(
  () =>
    import('@/components/viewer/GaussianSplatViewer').then((m) => ({
      default: m.GaussianSplatViewer,
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

/* ── Lazy-load FloorPlanViewer ── */
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

/* ── SceneNavigator (inline for public viewer) ── */
function SceneNav({
  scenes,
  activeId,
  onChange,
}: {
  scenes: Array<{ _id: string; title: string; imageUrl?: string | null }>
  activeId: string | null
  onChange: (id: string) => void
}) {
  if (scenes.length <= 1) return null
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10" style={{ padding: '0 16px 16px' }}>
      <div
        className="rounded-xl overflow-x-auto flex gap-2 items-center"
        style={{
          backgroundColor: 'rgba(10,9,8,0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(212,160,23,0.12)',
          padding: '8px 10px',
          scrollbarWidth: 'none',
        }}
      >
        {/* Powered by — inside the nav bar, left side */}
        <div
          className="flex-shrink-0 flex items-center gap-1 mr-2 pr-3"
          style={{ borderRight: '1px solid rgba(212,160,23,0.1)' }}
        >
          <span className="text-[9px] leading-none" style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
            Powered by
          </span>
          <span className="text-[9px] font-bold leading-none" style={{ color: '#D4A017', fontFamily: 'var(--font-display)' }}>
            Spazeo
          </span>
        </div>

        {scenes.map((scene) => {
          const isActive = scene._id === activeId
          const src = proxyUrl(scene.imageUrl)
          return (
            <button
              key={scene._id}
              onClick={() => onChange(scene._id)}
              aria-label={`Go to ${scene.title}`}
              className="relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all duration-150"
              style={{
                width: 80,
                height: 52,
                border: isActive ? '2px solid #D4A017' : '2px solid rgba(255,255,255,0.12)',
                boxShadow: isActive ? '0 0 0 1px rgba(212,160,23,0.3)' : 'none',
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-end justify-start p-1"
                  style={{ backgroundColor: '#1B1916' }}
                />
              )}
              {/* Always show label overlay */}
              <div
                className="absolute inset-x-0 bottom-0 px-1 py-0.5"
                style={{
                  background: 'linear-gradient(to top, rgba(10,9,8,0.85), transparent)',
                }}
              >
                <span
                  className="text-[9px] font-medium leading-none block truncate"
                  style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                >
                  {scene.title}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Page ── */
export default function PublicTourViewerPage() {
  const params = useParams()
  const slug = params.slug as string

  const tourData = useQuery(api.tours.getBySlug, { slug })
  const captureLead = useMutation(api.leads.capture)
  const trackAnalytics = useMutation(api.analytics.track)

  // Resolve splat URL when tour has a splatStorageId (3D viewer)
  const hasSplat = !!(tourData && '_id' in tourData && tourData.splatStorageId)
  const splatUrl = useQuery(
    api.tours.getTourSplatUrl,
    hasSplat && tourData && '_id' in tourData ? { tourId: tourData._id as Id<'tours'> } : 'skip'
  )

  // Detect floor-plan-derived tours (third renderer branch)
  const hasFloorPlan = !!(tourData && '_id' in tourData && 'sourceType' in tourData && tourData.sourceType === 'floor_plan')
  const floorPlanGeometryData = useQuery(
    api.tours.getFloorPlanGeometry,
    hasFloorPlan && tourData && '_id' in tourData
      ? { tourId: tourData._id as Id<'tours'> }
      : 'skip'
  )

  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [manualRotate, setManualRotate] = useState(true)
  const [idleActive, setIdleActive] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showPasswordError, setShowPasswordError] = useState(false)
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '' })
  const [leadSubmitting, setLeadSubmitting] = useState(false)

  const activeHotspotId = useViewerStore((s) => s.activeHotspotId)
  const setActiveHotspot = useViewerStore((s) => s.setActiveHotspot)
  const videoModalUrl = useViewerStore((s) => s.videoModalUrl)
  const videoModalTitle = useViewerStore((s) => s.videoModalTitle)
  const closeVideoModal = useViewerStore((s) => s.closeVideoModal)

  const verifyPassword = useAction(api.passwordUtils.verifyTourPassword)

  // After password is verified, load full tour data with scenes
  const unlockedTour = useQuery(
    api.tours.getBySlugWithScenes,
    passwordVerified ? { slug } : 'skip'
  )

  // Use unlocked tour (post-verification) if available, otherwise use the initial data
  const tour = unlockedTour ?? tourData

  const containerRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef(crypto.randomUUID())
  const viewTrackedRef = useRef(false)

  // Derived auto-rotate value from idle timer + manual toggle (VIEW-03)
  const isAutoRotating = manualRotate && idleActive

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setIdleActive(true), 5000)
  }, [])

  const resetIdle = useCallback(() => {
    setIdleActive(false)
    if (manualRotate) startIdleTimer()
  }, [manualRotate, startIdleTimer])

  // Start idle timer on mount; restart when manualRotate changes; clean up on unmount
  useEffect(() => {
    if (manualRotate) startIdleTimer()
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [manualRotate, startIdleTimer])

  // Set initial active scene when tour loads
  useEffect(() => {
    if (tour?.scenes && tour.scenes.length > 0 && !activeSceneId) {
      setActiveSceneId(tour.scenes[0]._id)
    }
  }, [tour?.scenes, activeSceneId])

  // Track tour view once
  useEffect(() => {
    if (tour && '_id' in tour && tour._id && !viewTrackedRef.current && !('requiresPassword' in tour && tour.requiresPassword)) {
      viewTrackedRef.current = true
      const deviceType = /Mobi/i.test(navigator.userAgent)
        ? ('mobile' as const)
        : /Tablet/i.test(navigator.userAgent)
          ? ('tablet' as const)
          : ('desktop' as const)
      trackAnalytics({
        tourId: tour._id as Id<'tours'>,
        event: 'tour_view',
        sessionId: sessionIdRef.current,
        deviceType,
      }).catch(() => {})
    }
  }, [tour, trackAnalytics])

  const activeScene = tour?.scenes?.find((s: { _id: string }) => s._id === activeSceneId)
    ?? tour?.scenes?.[0]
    ?? null

  const activeHotspots = activeScene?.hotspots ?? []

  const activeHotspot = activeHotspotId
    ? (activeHotspots.find((h: { _id: string }) => h._id === activeHotspotId) ?? null)
    : null

  // Close info panel when scene changes
  useEffect(() => {
    setActiveHotspot(null)
  }, [activeSceneId, setActiveHotspot])

  /* ── Hotspot click → navigate scenes, open info panel, or open video modal ── */
  const handleHotspotClick = useCallback(
    (hotspot: { type: string; targetSceneId?: string; _id?: string; content?: string; videoUrl?: string; title?: string }) => {
      // Navigation: transition to target scene, then optionally show info panel if hotspot has content
      if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
        setActiveSceneId(hotspot.targetSceneId)
        // If navigation hotspot has description/content, show info panel after transition
        if (hotspot._id && ((hotspot as Record<string, unknown>).description || hotspot.content)) {
          setTimeout(() => setActiveHotspot(hotspot._id!), 300)
        }
        return
      }
      // Media with video content: open full-screen video modal
      if (hotspot.type === 'media') {
        const videoSrc = (hotspot as Record<string, unknown>).videoUrl as string | undefined || hotspot.content
        if (videoSrc) {
          useViewerStore.getState().openVideoModal(videoSrc, hotspot.title)
          return
        }
      }
      // Info, link, or media without video: open info panel
      if (hotspot._id) {
        setActiveHotspot(hotspot._id)
      }
    },
    [setActiveHotspot]
  )

  /* ── Fullscreen toggle ── */
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }, [])

  // Sync isFullscreen with browser fullscreenchange event (e.g. Escape key exit) (VIEW-02)
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // F key keyboard shortcut for fullscreen (VIEW-02)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toggleFullscreen])

  /* ── Share ── */
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied!')
  }, [])

  /* ── Loading ── */
  if (tourData === undefined) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    )
  }

  if (tourData === null) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: '#0A0908' }}
      >
        <p className="text-lg font-semibold" style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}>
          Tour not found
        </p>
        <p className="text-sm" style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}>
          This tour may have been removed or the link is incorrect.
        </p>
      </div>
    )
  }

  /* ── Password gate ── */
  const handlePasswordSubmit = async () => {
    if (!password.trim() || verifying) return
    setVerifying(true)
    setShowPasswordError(false)
    try {
      const ok = await verifyPassword({ slug, password: password.trim() })
      if (ok) {
        setPasswordVerified(true)
      } else {
        setShowPasswordError(true)
      }
    } catch {
      toast.error('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  if (tour && 'requiresPassword' in tour && tour.requiresPassword && !passwordVerified) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <div
          className="w-full max-w-sm p-8 rounded-2xl flex flex-col items-center gap-6"
          style={{
            backgroundColor: '#12100E',
            border: '1px solid rgba(212,160,23,0.2)',
          }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
          >
            <Lock size={24} style={{ color: '#D4A017' }} />
          </div>
          <div className="text-center">
            <h2
              className="text-lg font-bold mb-1"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              {tour?.title}
            </h2>
            <p className="text-sm" style={{ color: '#A8A29E' }}>
              This tour is password protected.
            </p>
          </div>
          <div className="w-full flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (showPasswordError) setShowPasswordError(false)
              }}
              placeholder="Enter password"
              className="w-full h-11 px-4 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: '#0A0908',
                border: showPasswordError
                  ? '1px solid #F87171'
                  : '1px solid rgba(212,160,23,0.12)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-dmsans)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordSubmit()
              }}
            />
            {showPasswordError && (
              <p className="text-xs" style={{ color: '#F87171' }}>Incorrect password</p>
            )}
            <button
              onClick={handlePasswordSubmit}
              disabled={verifying || !password.trim()}
              className="w-full h-11 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                backgroundColor: '#D4A017',
                color: '#0A0908',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              {verifying ? 'Verifying...' : 'Enter Tour'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // At this point tour is guaranteed non-null (tourData was checked above)
  const currentTour = tour!
  const scenes = currentTour.scenes ?? []

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: '#0A0908' }}
      onMouseMove={resetIdle}
      onClick={resetIdle}
      onTouchStart={resetIdle}
      onKeyDown={resetIdle}
    >
      {/* ── Viewer: Floor Plan 3D, Gaussian Splat, or 360 Panorama ── */}
      {hasFloorPlan && floorPlanGeometryData ? (
        <FloorPlanViewer
          geometry={floorPlanGeometryData.geometry as import('@/components/viewer/FloorPlanMesh').FloorPlanGeometry}
          overrides={floorPlanGeometryData.overrides as import('@/components/viewer/FloorPlanMesh').FloorPlan3DOverrides}
          tourTitle={typeof currentTour === 'object' && currentTour && 'title' in currentTour ? String(currentTour.title) : undefined}
          tourSlug={typeof currentTour === 'object' && currentTour && 'slug' in currentTour ? String(currentTour.slug) : undefined}
          tourId={typeof currentTour === 'object' && currentTour && '_id' in currentTour ? String(currentTour._id) : undefined}
          hotspots={floorPlanGeometryData.doorwayHotspots}
          enableFurniture={true}
        />
      ) : splatUrl ? (
        <div className="w-full h-full">
          <GaussianSplatViewer
            splatUrl={splatUrl}
            tourTitle={currentTour.title}
            hotspots={[]}
          />
        </div>
      ) : activeScene?.imageUrl ? (
        <PanoramaViewer
          imageUrl={proxyUrl(activeScene.imageUrl as string) ?? ''}
          height="100vh"
          hotspots={activeHotspots as any[]}
          onHotspotClick={handleHotspotClick as any}
          autoRotate={isAutoRotating}
          zoomLevel={zoomLevel}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <p style={{ color: '#6B6560' }}>No scenes available</p>
        </div>
      )}

      {/* ── Top Header Bar (only for panorama mode — splat and floor plan viewers have their own) ── */}
      {!splatUrl && !hasFloorPlan && <div
        className="absolute top-0 left-0 w-full h-14 z-10 flex items-center justify-between px-5"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,9,8,0.6), transparent)',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-base font-bold"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
          >
            {currentTour.title}
          </span>
          <span
            className="text-[11px] px-2.5 py-1 rounded-full"
            style={{
              color: '#A8A29E',
              backgroundColor: 'rgba(10,9,8,0.4)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {scenes.length} Scene{scenes.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(10,9,8,0.4)' }}
          >
            {isFullscreen ? (
              <Minimize2 size={18} color="#F5F3EF" strokeWidth={1.5} />
            ) : (
              <Maximize2 size={18} color="#F5F3EF" strokeWidth={1.5} />
            )}
          </button>
          <button
            onClick={handleShare}
            aria-label="Share tour"
            className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(10,9,8,0.4)' }}
          >
            <Share2 size={18} color="#F5F3EF" strokeWidth={1.5} />
          </button>
        </div>
      </div>}

      {/* ── Viewer Controls (bottom center, above scene nav) — panorama only ── */}
      {!splatUrl && !hasFloorPlan &&
      <div className="absolute bottom-[92px] left-1/2 -translate-x-1/2 z-10 pb-[env(safe-area-inset-bottom,0px)]">
        <div
          className="rounded-full px-4 py-2 flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(10,9,8,0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(212,160,23,0.12)',
          }}
        >
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.5))}
            aria-label="Zoom out"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: '#A8A29E' }}
          >
            <Minus size={16} strokeWidth={1.5} />
          </button>
          <span className="text-xs min-w-[32px] text-center tabular-nums" style={{ color: '#A8A29E' }}>
            {zoomLevel.toFixed(1)}x
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
            aria-label="Zoom in"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: '#A8A29E' }}
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
          <div className="h-4 w-px" style={{ backgroundColor: '#6B6560' }} />
          <button
            onClick={() => {
              const next = !manualRotate
              setManualRotate(next)
              if (!next) {
                setIdleActive(false)
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
              } else {
                startIdleTimer()
              }
            }}
            aria-label="Toggle auto-rotate"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: manualRotate ? '#D4A017' : '#A8A29E' }}
          >
            <RotateCw size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>}

      {/* ── Scene Navigator (bottom) — panorama only ── */}
      {!splatUrl && !hasFloorPlan && <SceneNav
        scenes={scenes as any[]}
        activeId={activeSceneId}
        onChange={setActiveSceneId}
      />}

      {/* ── Hotspot Info Panel (outside Canvas, driven by Zustand) ── */}
      <AnimatePresence>
        {activeHotspot && (
          <HotspotInfoPanel
            key={activeHotspot._id as string}
            hotspot={activeHotspot as Parameters<typeof HotspotInfoPanel>[0]['hotspot']}
            onClose={() => setActiveHotspot(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Full-Screen Video Modal ── */}
      <AnimatePresence>
        {videoModalUrl && (
          <HotspotVideoModal
            key={videoModalUrl}
            url={videoModalUrl}
            title={videoModalTitle}
            onClose={closeVideoModal}
          />
        )}
      </AnimatePresence>

      {/* ── Lead Capture Button ── */}
      {/* Show Get in Touch by default — only hide when explicitly disabled */}
      {(currentTour.leadCaptureConfig?.enabled ?? true) && (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute top-20 right-4 z-10 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
            boxShadow: '0 4px 16px rgba(212,160,23,0.3)',
          }}
        >
          Get in Touch
        </button>
      )}

      {/* ── Lead Capture Panel ── */}
      {panelOpen && (
        <div
          className="absolute right-0 top-0 h-full w-full sm:w-[280px] z-20 flex flex-col gap-6 overflow-y-auto"
          style={{
            backgroundColor: '#12100E',
            borderLeft: '1px solid rgba(212,160,23,0.12)',
            padding: '32px 24px',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-bold"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              Get in Touch
            </h2>
            <button onClick={() => setPanelOpen(false)} style={{ color: '#6B6560' }}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <p className="text-[13px] leading-relaxed" style={{ color: '#A8A29E' }}>
            Interested in this property? Fill out the form below and the agent will get back to you shortly.
          </p>

          <div className="flex flex-col gap-5">
            {([
              { label: 'Full Name', key: 'name' as const, type: 'text', placeholder: 'John Doe' },
              { label: 'Email', key: 'email' as const, type: 'email', placeholder: 'john@example.com' },
              { label: 'Phone', key: 'phone' as const, type: 'tel', placeholder: '+1 (555) 123-4567' },
            ]).map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: '#A8A29E' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={leadForm[field.key]}
                  onChange={(e) => setLeadForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    backgroundColor: '#1B1916',
                    border: '1px solid rgba(212,160,23,0.12)',
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                />
              </div>
            ))}
          </div>

          <button
            disabled={leadSubmitting || !leadForm.name.trim() || !leadForm.email.trim()}
            onClick={async () => {
              if (!tour?._id || leadSubmitting) return
              setLeadSubmitting(true)
              try {
                await captureLead({
                  tourId: tour._id as Id<'tours'>,
                  name: leadForm.name.trim(),
                  email: leadForm.email.trim(),
                  phone: leadForm.phone.trim() || undefined,
                  source: 'tour_viewer',
                })
                toast.success('Thank you! We will be in touch shortly.')
                setLeadForm({ name: '', email: '', phone: '' })
                setPanelOpen(false)
              } catch {
                toast.error('Something went wrong. Please try again.')
              } finally {
                setLeadSubmitting(false)
              }
            }}
            className="w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-50 min-h-[44px]"
            style={{
              backgroundColor: '#D4A017',
              color: '#0A0908',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {leadSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  )
}
