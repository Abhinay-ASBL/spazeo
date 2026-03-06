'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
/* eslint-disable @next/next/no-img-element */
import { useQuery, useMutation } from 'convex/react'
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
    <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-10">
      <div
        className="rounded-xl p-2 overflow-x-auto flex gap-2"
        style={{
          backgroundColor: 'rgba(10,9,8,0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,160,23,0.12)',
          scrollbarWidth: 'none',
        }}
      >
        {scenes.map((scene) => {
          const isActive = scene._id === activeId
          return (
            <button
              key={scene._id}
              onClick={() => onChange(scene._id)}
              aria-label={`Go to ${scene.title}`}
              className="relative w-20 h-14 rounded-lg overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-150"
              style={{
                border: isActive
                  ? '2px solid #D4A017'
                  : '2px solid rgba(255,255,255,0.15)',
              }}
            >
              {scene.imageUrl ? (
                <img
                  src={scene.imageUrl}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: '#1B1916' }}
                >
                  <span className="text-[10px]" style={{ color: '#6B6560' }}>
                    {scene.title}
                  </span>
                </div>
              )}
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

  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panelOpen, setPanelOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [submittedPassword, setSubmittedPassword] = useState<string | null>(null)
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '' })
  const [leadSubmitting, setLeadSubmitting] = useState(false)

  // Verify password reactively when submitted
  const verifiedTour = useQuery(
    api.tours.verifyTourPassword,
    submittedPassword ? { slug, password: submittedPassword } : 'skip'
  )

  // Use verified tour data if available, otherwise use the initial data
  const tour = verifiedTour ?? tourData

  const containerRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef(crypto.randomUUID())
  const viewTrackedRef = useRef(false)

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

  /* ── Hotspot click → navigate scenes ── */
  const handleHotspotClick = useCallback(
    (hotspot: { type: string; targetSceneId?: string }) => {
      if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
        setActiveSceneId(hotspot.targetSceneId)
      }
    },
    []
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
  const handlePasswordSubmit = () => {
    if (!password.trim()) return
    setSubmittedPassword(password)
  }

  // Show error when verification returns null (wrong password)
  const showPasswordError = submittedPassword !== null && verifiedTour === null

  if (tour && 'requiresPassword' in tour && tour.requiresPassword) {
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
                if (submittedPassword) setSubmittedPassword(null)
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
              className="w-full h-11 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: '#D4A017',
                color: '#0A0908',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Enter Tour
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
    >
      {/* ── 360° Panorama Viewport ── */}
      {activeScene?.imageUrl ? (
        <PanoramaViewer
          imageUrl={(() => {
            try {
              const p = new URL(activeScene.imageUrl as string)
              if ((p.hostname === '127.0.0.1' || p.hostname === 'localhost') && p.port === '3210') {
                return `/api/proxy-image?url=${encodeURIComponent(activeScene.imageUrl as string)}`
              }
            } catch { /* invalid url */ }
            return activeScene.imageUrl as string
          })()}
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

      {/* ── Top Header Bar ── */}
      <div
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
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
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
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(10,9,8,0.4)' }}
          >
            <Share2 size={18} color="#F5F3EF" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── Viewer Controls (bottom center) ── */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
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
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            aria-label="Toggle auto-rotate"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: isAutoRotating ? '#D4A017' : '#A8A29E' }}
          >
            <RotateCw size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── Scene Navigator (bottom) ── */}
      <SceneNav
        scenes={scenes as any[]}
        activeId={activeSceneId}
        onChange={setActiveSceneId}
      />

      {/* ── Powered By Badge ── */}
      <div
        className="absolute bottom-4 left-4 z-10 flex items-center gap-1 px-3 py-1.5 rounded-md"
        style={{ backgroundColor: 'rgba(10,9,8,0.53)' }}
      >
        <span className="text-[10px]" style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
          Powered by
        </span>
        <span className="text-[10px] font-bold" style={{ color: '#D4A017', fontFamily: 'var(--font-display)' }}>
          Spazeo
        </span>
      </div>

      {/* ── Lead Capture Button ── */}
      {currentTour.leadCaptureConfig?.enabled && (
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
          className="absolute right-0 top-0 h-full w-[280px] z-20 flex flex-col gap-6 overflow-y-auto"
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
            className="w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
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
