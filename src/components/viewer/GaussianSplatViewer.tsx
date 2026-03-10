'use client'

import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { SplatScene } from './SplatScene'
import { NavigationModes } from './NavigationModes'
import { SplatHotspot3D } from './SplatHotspot3D'
import { ModeSwitcher } from './ModeSwitcher'
import { VirtualJoystick } from './VirtualJoystick'
import { FurnitureLayer } from './FurnitureLayer'
import { FurnitureToolbar } from './FurnitureToolbar'
import { FurnitureCameraController } from './FurnitureCameraController'
import { CatalogSidebar } from '@/components/furniture/CatalogSidebar'
import { CatalogBottomSheet } from '@/components/furniture/CatalogBottomSheet'
import { Modal } from '@/components/ui/Modal'
import { useSplatViewerStore } from '@/hooks/useSplatViewerStore'
import { useFurnitureStore } from '@/hooks/useFurnitureStore'
import { Maximize2, Minimize2, Share2, Save, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Hotspot3D {
  id: string
  position: [number, number, number]
  label: string
  targetPosition?: [number, number, number]
}

interface GaussianSplatViewerProps {
  splatUrl: string
  tourTitle?: string
  tourSlug?: string
  tourId?: string
  hotspots?: Hotspot3D[]
  enableFurniture?: boolean
  furnishedRoomId?: string
}

export function GaussianSplatViewer({
  splatUrl,
  tourTitle,
  tourSlug,
  tourId,
  hotspots = [],
  enableFurniture = false,
  furnishedRoomId: initialFurnishedRoomId,
}: GaussianSplatViewerProps) {
  const navMode = useSplatViewerStore((s) => s.navMode)
  const transitioning = useSplatViewerStore((s) => s.transitioning)
  const furnitureMode = useFurnitureStore((s) => s.mode)
  const placedItems = useFurnitureStore((s) => s.placedItems)
  const isFurnishActive = enableFurniture && furnitureMode === 'furnish'

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [savedRoomId, setSavedRoomId] = useState<string | null>(
    initialFurnishedRoomId ?? null
  )
  const [savedRoomSlug, setSavedRoomSlug] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [arrangementTitle, setArrangementTitle] = useState('My Arrangement')
  const [isSaving, setIsSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const createRoom = useMutation(api.furnishedRooms.create)
  const savePlacements = useMutation(api.furnishedRooms.savePlacements)

  // Load saved arrangement when furnishedRoomId is provided
  const savedRoom = useQuery(
    api.furnishedRooms.getBySlug,
    initialFurnishedRoomId && savedRoomSlug
      ? { furnishedRoomSlug: savedRoomSlug }
      : 'skip'
  )

  useEffect(() => {
    if (savedRoom && savedRoom.placements.length > 0) {
      const items = savedRoom.placements
        .filter(
          (
            p
          ): p is NonNullable<typeof p> & {
            furnitureItem: NonNullable<
              NonNullable<typeof p>['furnitureItem']
            > & { glbUrl: string }
          } => p !== null && p.furnitureItem !== null && !!p.furnitureItem.glbUrl
        )
        .map((p) => ({
          instanceId: p.instanceId,
          furnitureItemId: p.furnitureItemId as string,
          position: [
            p.position.x,
            p.position.y,
            p.position.z,
          ] as [number, number, number],
          rotation: [
            p.rotation.x,
            p.rotation.y,
            p.rotation.z,
          ] as [number, number, number],
          scale: [p.scale.x, p.scale.y, p.scale.z] as [number, number, number],
          name: p.furnitureItem.name,
          price: p.furnitureItem.priceUsd,
          amazonUrl: p.furnitureItem.amazonUrl,
          glbUrl: p.furnitureItem.glbUrl,
        }))
      useFurnitureStore.getState().loadFromSaved(items)
    }
  }, [savedRoom])

  // Orbit controls config based on nav mode
  const orbitConfig = (() => {
    switch (navMode) {
      case 'dollhouse':
        return {
          enableRotate: true,
          enableZoom: true,
          enablePan: true,
          maxPolarAngle: (80 * Math.PI) / 180,
          minDistance: 2,
          maxDistance: 50,
        }
      case 'freeRoam':
        return {
          enableRotate: true,
          enableZoom: false,
          enablePan: false,
          maxPolarAngle: Math.PI,
          minDistance: 0.1,
          maxDistance: 100,
        }
      case 'hotspot':
        return {
          enableRotate: true,
          enableZoom: true,
          enablePan: false,
          maxPolarAngle: Math.PI,
          minDistance: 0.1,
          maxDistance: 100,
        }
    }
  })()

  const handleHotspotClick = useCallback(
    (_hotspot: Hotspot3D) => {
      if (navMode === 'hotspot') {
        // Camera fly-to would be triggered through the navigation system
      }
    },
    [navMode]
  )

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const handleShare = useCallback(() => {
    if (savedRoomSlug && tourSlug) {
      const shareUrl = `${window.location.origin}/tour/${tourSlug}/furnished/${savedRoomSlug}`
      navigator.clipboard.writeText(shareUrl)
      toast.success('Furnished room link copied!')
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied!')
    }
  }, [savedRoomSlug, tourSlug])

  const handleSaveArrangement = useCallback(async () => {
    if (!tourId || placedItems.length === 0) return
    setIsSaving(true)

    try {
      let roomId = savedRoomId
      let roomSlug = savedRoomSlug

      // Create room if it doesn't exist yet
      if (!roomId) {
        const newRoomId = await createRoom({
          tourId: tourId as Id<'tours'>,
          title: arrangementTitle,
        })
        roomId = newRoomId as string
        setSavedRoomId(roomId)

        // Derive slug from title to match what the create mutation generates
        // We need to query the room to get the actual slug
        // For now, set a placeholder — the slug will be resolved on next render
        roomSlug = null
      }

      // Save placements
      await savePlacements({
        furnishedRoomId: roomId as Id<'furnishedRooms'>,
        placements: placedItems.map((item) => ({
          furnitureItemId: item.furnitureItemId as Id<'furnitureItems'>,
          instanceId: item.instanceId,
          position: { x: item.position[0], y: item.position[1], z: item.position[2] },
          rotation: { x: item.rotation[0], y: item.rotation[1], z: item.rotation[2] },
          scale: { x: item.scale[0], y: item.scale[1], z: item.scale[2] },
        })),
      })

      // Copy share link if we have slug
      if (roomSlug && tourSlug) {
        const shareUrl = `${window.location.origin}/tour/${tourSlug}/furnished/${roomSlug}`
        navigator.clipboard.writeText(shareUrl)
        toast.success('Arrangement saved! Share link copied.')
      } else {
        toast.success('Arrangement saved!')
      }

      setShowSaveDialog(false)
    } catch (err) {
      toast.error('Failed to save arrangement')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }, [
    tourId,
    tourSlug,
    placedItems,
    savedRoomId,
    savedRoomSlug,
    arrangementTitle,
    createRoom,
    savePlacements,
  ])

  // Resolve the saved room slug after creation
  const savedRoomData = useQuery(
    api.furnishedRooms.getByTourId,
    savedRoomId && !savedRoomSlug && tourId
      ? { tourId: tourId as Id<'tours'> }
      : 'skip'
  )

  useEffect(() => {
    if (savedRoomData && savedRoomId) {
      const found = savedRoomData.find(
        (r) => (r._id as string) === savedRoomId
      )
      if (found) {
        setSavedRoomSlug(found.slug)
      }
    }
  }, [savedRoomData, savedRoomId])

  const showSaveButton =
    enableFurniture && furnitureMode === 'furnish' && placedItems.length > 0
  const showShareFurnishedButton = enableFurniture && !!savedRoomSlug

  return (
    <div
      ref={containerRef}
      className="flex"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0A0908',
      }}
    >
      {/* Main viewer area */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0, height: '100%' }}>
        {/* R3F Canvas */}
        <Canvas
          gl={{ antialias: false }}
          camera={{ position: [0, 12, 12], fov: 30, near: 0.1, far: 1000 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            <SplatScene url={splatUrl} />
          </Suspense>

          <NavigationModes />

          {/* Furniture R3F components — always mounted, self-guard on mode */}
          {enableFurniture && (
            <>
              <FurnitureLayer />
              <FurnitureCameraController />
            </>
          )}

          {/* 3D Hotspot markers */}
          {hotspots.map((h) => (
            <SplatHotspot3D
              key={h.id}
              position={h.position}
              label={h.label}
              onClick={() => handleHotspotClick(h)}
            />
          ))}

          <OrbitControls
            enableDamping
            dampingFactor={0.1}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            enabled={!transitioning}
            makeDefault
            {...orbitConfig}
          />
          <ambientLight intensity={0.5} />
        </Canvas>

        {/* Top header bar with title and controls */}
        <div
          className="absolute top-0 left-0 w-full h-14 z-10 flex items-center justify-between px-5"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,9,8,0.6), transparent)',
          }}
        >
          {/* Tour title */}
          <div className="flex items-center gap-3">
            {tourTitle && (
              <span
                className="text-base font-bold"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
              >
                {tourTitle}
              </span>
            )}
            <span
              className="text-[11px] px-2.5 py-1 rounded-full"
              style={{
                color: '#A8A29E',
                backgroundColor: 'rgba(10,9,8,0.4)',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              3D
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Save Arrangement button */}
            {showSaveButton && (
              <button
                onClick={() => setShowSaveDialog(true)}
                aria-label="Save arrangement"
                className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                <Save size={16} strokeWidth={1.5} />
                <span className="hidden sm:inline">Save</span>
              </button>
            )}

            {/* Share Furnished Room button */}
            {showShareFurnishedButton && (
              <button
                onClick={handleShare}
                aria-label="Share furnished room"
                className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                <Link2 size={16} strokeWidth={1.5} />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

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
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                toast.success('Link copied!')
              }}
              aria-label="Share tour"
              className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
              style={{ backgroundColor: 'rgba(10,9,8,0.4)' }}
            >
              <Share2 size={18} color="#F5F3EF" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Mode switcher (bottom center) */}
        <ModeSwitcher enableFurniture={enableFurniture} />

        {/* Furniture toolbar for selected items */}
        {enableFurniture && <FurnitureToolbar />}

        {/* Virtual joystick (bottom left, mobile only) */}
        <VirtualJoystick />

        {/* Mobile bottom sheet for catalog (< md) */}
        {enableFurniture && (
          <div className="block md:hidden">
            <AnimatePresence>
              {isFurnishActive && <CatalogBottomSheet />}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Desktop catalog sidebar (md+) */}
      {enableFurniture && (
        <AnimatePresence>
          {isFurnishActive && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="hidden md:block overflow-hidden"
              style={{ height: '100%', flexShrink: 0 }}
            >
              <CatalogSidebar />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Save Arrangement Dialog */}
      <Modal
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        title="Save Arrangement"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: '#A8A29E' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveArrangement}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              style={{
                backgroundColor: '#D4A017',
                color: '#0A0908',
              }}
            >
              {isSaving ? 'Saving...' : 'Save & Share'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <label
            htmlFor="arrangement-title"
            className="text-sm font-medium"
            style={{ color: '#F5F3EF' }}
          >
            Arrangement Title
          </label>
          <input
            id="arrangement-title"
            type="text"
            value={arrangementTitle}
            onChange={(e) => setArrangementTitle(e.target.value)}
            placeholder="My Arrangement"
            className="w-full px-3 py-2 rounded-[4px] text-sm outline-none transition-colors"
            style={{
              backgroundColor: '#1B1916',
              border: '1px solid rgba(212,160,23,0.3)',
              color: '#F5F3EF',
              fontFamily: 'var(--font-dmsans)',
            }}
          />
          <p className="text-xs" style={{ color: '#6B6560' }}>
            A shareable link will be created for this arrangement.
          </p>
        </div>
      </Modal>
    </div>
  )
}
