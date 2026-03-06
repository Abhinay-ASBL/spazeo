'use client'

import { useState, useCallback, useRef, useMemo, Suspense, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
/* eslint-disable @next/next/no-img-element */
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  Eye,
  Globe,
  Plus,
  X,
  Upload,
  Trash2,
  GripVertical,
  Loader2,
  ImageIcon,
  CheckCircle2,
  MousePointer2,
  Navigation,
  Info,
  Play,
  ExternalLink,
  Settings,
  Layers,
  ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ── Lazy-load PanoramaViewer (Three.js — client only) ── */
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

/* ── Hotspot type config ── */
const HOTSPOT_TYPES = [
  { value: 'navigation' as const, label: 'Navigation', desc: 'Jump to another scene', icon: Navigation, color: '#2DD4BF' },
  { value: 'info' as const, label: 'Info', desc: 'Show a label or note', icon: Info, color: '#D4A017' },
  { value: 'media' as const, label: 'Media', desc: 'Play video or audio', icon: Play, color: '#FB7A54' },
  { value: 'link' as const, label: 'Link', desc: 'Open an external URL', icon: ExternalLink, color: '#8B5CF6' },
]

/* ── Page ── */
export default function TourEditorPage() {
  const params = useParams()
  const router = useRouter()
  const tourId = params.id as Id<'tours'>

  const tour = useQuery(api.tours.getById, { tourId })
  const scenes = useQuery(api.scenes.listByTour, { tourId })
  const hotspotsByTour = useQuery(api.hotspots.listByTour, { tourId })
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl)
  const createScene = useMutation(api.scenes.create)
  const updateScene = useMutation(api.scenes.update)
  const removeScene = useMutation(api.scenes.remove)
  const reorderScenes = useMutation(api.scenes.reorder)
  const updateTour = useMutation(api.tours.update)
  const updateSlug = useMutation(api.tours.updateSlug)
  const publishTour = useMutation(api.tours.publish)
  const createHotspot = useMutation(api.hotspots.create)
  const updateHotspot = useMutation(api.hotspots.update)
  const removeHotspot = useMutation(api.hotspots.remove)

  // AI analysis disabled

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSceneId, setActiveSceneId] = useState<Id<'scenes'> | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [titleEditing, setTitleEditing] = useState(false)
  const [sceneDescription, setSceneDescription] = useState('')
  const [descriptionSaveTimeoutId, setDescriptionSaveTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Hotspot creation state
  const [isPlacingHotspot, setIsPlacingHotspot] = useState(false)
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number; z: number } | null>(null)
  const [hotspotType, setHotspotType] = useState<'navigation' | 'info' | 'media' | 'link'>('navigation')
  const [hotspotTooltip, setHotspotTooltip] = useState('')
  const [hotspotTargetSceneId, setHotspotTargetSceneId] = useState<string>('')
  const [hotspotContent, setHotspotContent] = useState('')
  const [hotspotTitle, setHotspotTitle] = useState('')
  const [hotspotDescription, setHotspotDescription] = useState('')
  const [hotspotImageFile, setHotspotImageFile] = useState<File | null>(null)
  const [hotspotImagePreview, setHotspotImagePreview] = useState<string | null>(null)
  const hotspotImageInputRef = useRef<HTMLInputElement>(null)

  // Active info/media/link hotspot popup
  const [activePopupHotspot, setActivePopupHotspot] = useState<{
    _id: string; type: string; tooltip?: string; title?: string
    description?: string; content?: string; imageUrl?: string | null
  } | null>(null)

  // Drag-and-drop reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Right panel tab state
  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'settings'>('properties')

  // Tour settings local state
  const [tourSettings, setTourSettings] = useState({
    autoRotate: false,
    showMiniMap: false,
    allowFullscreen: true,
    brandingEnabled: true,
  })
  const [tourDescriptionLocal, setTourDescriptionLocal] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [settingsInitialized, setSettingsInitialized] = useState(false)

  // Preview mode
  const [previewMode, setPreviewMode] = useState(false)

  // Mobile scene drawer
  const [mobileSceneDrawerOpen, setMobileSceneDrawerOpen] = useState(false)

  // Mobile properties drawer
  const [mobilePropsDrawerOpen, setMobilePropsDrawerOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Set initial values when tour loads
  const tourTitle = tour?.title ?? ''
  const tourDescription = tour?.description ?? ''

  const sceneList = useMemo(() => scenes ?? [], [scenes])
  const activeScene = useMemo(
    () => sceneList.find((s) => s._id === activeSceneId) ?? sceneList[0] ?? null,
    [sceneList, activeSceneId]
  )

  // Proxy local-dev Convex storage URLs through the Next.js API to avoid CORS issues
  // with Three.js TextureLoader (127.0.0.1:3210 is cross-origin from localhost:300x)
  const proxyImageUrl = useCallback((url: string | null | undefined): string | null => {
    if (!url) return null
    try {
      const parsed = new URL(url)
      if (
        (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
        parsed.port === '3210'
      ) {
        return `/api/proxy-image?url=${encodeURIComponent(url)}`
      }
    } catch {
      // invalid URL — return as-is
    }
    return url
  }, [])

  // Get hotspots for active scene
  const activeSceneHotspots = useMemo(() => {
    if (!activeScene || !hotspotsByTour) return []
    return hotspotsByTour.filter((h) => h.sceneId === activeScene._id)
  }, [activeScene, hotspotsByTour])

  // Sync description when active scene changes
  useEffect(() => {
    if (activeScene?.description) {
      setSceneDescription(activeScene.description)
    } else {
      setSceneDescription('')
    }
  }, [activeScene?._id])

  // AI analysis disabled in v1

  // Initialize tour settings when tour loads
  if (tour && !settingsInitialized) {
    setTourSettings({
      autoRotate: tour.settings?.autoRotate ?? false,
      showMiniMap: tour.settings?.showMiniMap ?? false,
      allowFullscreen: tour.settings?.allowFullscreen ?? true,
      brandingEnabled: tour.settings?.brandingEnabled ?? true,
    })
    setTourDescriptionLocal(tour.description ?? '')
    setCustomSlug(tour.slug ?? '')
    setSettingsInitialized(true)
  }

  /* ── Toggle a tour setting ── */
  const handleToggleSetting = useCallback(
    async (key: keyof typeof tourSettings) => {
      const updated = { ...tourSettings, [key]: !tourSettings[key] }
      setTourSettings(updated)
      try {
        await updateTour({ tourId, settings: updated })
      } catch {
        toast.error('Failed to save setting')
        setTourSettings(tourSettings)
      }
    },
    [tourSettings, updateTour, tourId]
  )

  /* ── Save tour description from settings ── */
  const handleSaveTourDescription = useCallback(
    async (desc: string) => {
      try {
        await updateTour({ tourId, description: desc })
      } catch {
        toast.error('Failed to save description')
      }
    },
    [updateTour, tourId]
  )

  /* ── Save custom slug ── */
  const handleSaveSlug = useCallback(
    async (slug: string) => {
      const cleaned = slug
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
      if (!cleaned || cleaned === tour?.slug) return
      try {
        await updateSlug({ tourId, slug: cleaned })
        setCustomSlug(cleaned)
        toast.success('Slug updated')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update slug'
        toast.error(msg)
      }
    },
    [updateSlug, tourId, tour?.slug]
  )

  /* ── Upload Handler ── */
  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setUploading(true)
      const fileArray = Array.from(files)
      setUploadProgress([])

      try {
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i]
          const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
          setUploadProgress((prev) => [...prev, `Uploading ${name}...`])

          const uploadUrl = await generateUploadUrl()
          const result = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          })
          const { storageId } = await result.json()

          const currentSceneCount = (scenes?.length ?? 0) + i
          await createScene({
            tourId,
            title: name,
            imageStorageId: storageId as Id<'_storage'>,
            order: currentSceneCount,
          })

          setUploadProgress((prev) =>
            prev.map((p, idx) => (idx === i ? `${name} uploaded` : p))
          )
        }
        toast.success(`${fileArray.length} scene${fileArray.length > 1 ? 's' : ''} uploaded`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        toast.error(msg)
      } finally {
        setUploading(false)
        setUploadProgress([])
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [generateUploadUrl, createScene, tourId, scenes?.length]
  )

  /* ── Delete Scene ── */
  const handleDeleteScene = useCallback(
    async (sceneId: Id<'scenes'>) => {
      try {
        await removeScene({ sceneId })
        if (activeSceneId === sceneId) setActiveSceneId(null)
        toast.success('Scene deleted')
      } catch {
        toast.error('Failed to delete scene')
      }
    },
    [removeScene, activeSceneId]
  )

  /* ── Reorder Scenes ── */
  const handleReorderScenes = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || !sceneList) return

      const newSceneList = [...sceneList]
      const [movedScene] = newSceneList.splice(fromIndex, 1)
      newSceneList.splice(toIndex, 0, movedScene)

      try {
        const scenes = newSceneList.map((scene, idx) => ({
          sceneId: scene._id,
          order: idx,
        }))
        await reorderScenes({ scenes })
        toast.success('Scenes reordered')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to reorder scenes'
        toast.error(msg)
      }
    },
    [sceneList, reorderScenes]
  )

  /* ── Save Tour Details ── */
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateTour({
        tourId,
        title: editTitle || undefined,
        description: editDescription || undefined,
      })
      setTitleEditing(false)
      toast.success('Tour saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }, [updateTour, tourId, editTitle, editDescription])

  /* ── Publish ── */
  const handlePublish = useCallback(async () => {
    setPublishing(true)
    try {
      await publishTour({ tourId })
      toast.success('Tour published!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish'
      toast.error(msg)
    } finally {
      setPublishing(false)
    }
  }, [publishTour, tourId])

  /* ── Rename Scene ── */
  const handleRenameScene = useCallback(
    async (sceneId: Id<'scenes'>, newTitle: string) => {
      try {
        await updateScene({ sceneId, title: newTitle })
      } catch {
        toast.error('Failed to rename scene')
      }
    },
    [updateScene]
  )

  /* ── Save Scene Description (debounced) ── */
  const handleSaveDescription = useCallback(
    async (sceneId: Id<'scenes'>, description: string) => {
      try {
        await updateScene({ sceneId, description: description || undefined })
      } catch {
        toast.error('Failed to save scene description')
      }
    },
    [updateScene]
  )

  const handleDescriptionChange = useCallback(
    (sceneId: Id<'scenes'>, value: string) => {
      setSceneDescription(value)

      // Clear existing timeout if any
      if (descriptionSaveTimeoutId) {
        clearTimeout(descriptionSaveTimeoutId)
      }

      // Set new timeout for debounced save
      const timeoutId = setTimeout(() => {
        handleSaveDescription(sceneId, value)
      }, 1000) // 1 second debounce

      setDescriptionSaveTimeoutId(timeoutId)
    },
    [descriptionSaveTimeoutId, handleSaveDescription]
  )

  /* ── Sphere Click → place hotspot ── */
  const handleSphereClick = useCallback(
    (position: { x: number; y: number; z: number }) => {
      if (!isPlacingHotspot) return
      setPendingPosition(position)
    },
    [isPlacingHotspot]
  )

  /* ── Confirm hotspot creation ── */
  const handleConfirmHotspot = useCallback(async () => {
    if (!pendingPosition || !activeScene) return

    try {
      let imageStorageId: Id<'_storage'> | undefined
      if (hotspotImageFile) {
        const uploadUrl = await generateUploadUrl()
        const res = await fetch(uploadUrl, { method: 'POST', body: hotspotImageFile, headers: { 'Content-Type': hotspotImageFile.type } })
        const { storageId } = await res.json()
        imageStorageId = storageId
      }

      await createHotspot({
        sceneId: activeScene._id,
        targetSceneId: hotspotTargetSceneId
          ? (hotspotTargetSceneId as Id<'scenes'>)
          : undefined,
        type: hotspotType,
        position: pendingPosition,
        tooltip: hotspotTooltip || undefined,
        title: hotspotTitle || undefined,
        description: hotspotDescription || undefined,
        content: hotspotContent || undefined,
        imageStorageId,
      })
      toast.success('Hotspot added')
      setPendingPosition(null)
      setHotspotTooltip('')
      setHotspotTitle('')
      setHotspotDescription('')
      setHotspotContent('')
      setHotspotTargetSceneId('')
      setHotspotImageFile(null)
      setHotspotImagePreview(null)
      setIsPlacingHotspot(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add hotspot'
      toast.error(msg)
    }
  }, [
    createHotspot,
    activeScene,
    pendingPosition,
    hotspotType,
    hotspotTooltip,
    hotspotTargetSceneId,
    hotspotContent,
  ])

  /* ── Update hotspot tooltip ── */
  const handleUpdateHotspotTooltip = useCallback(
    async (hotspotId: Id<'hotspots'>, tooltip: string) => {
      try {
        await updateHotspot({ hotspotId, tooltip })
      } catch {
        toast.error('Failed to update hotspot')
      }
    },
    [updateHotspot]
  )

  /* ── Delete hotspot ── */
  const handleDeleteHotspot = useCallback(
    async (hotspotId: Id<'hotspots'>) => {
      try {
        await removeHotspot({ hotspotId })
        toast.success('Hotspot removed')
      } catch {
        toast.error('Failed to remove hotspot')
      }
    },
    [removeHotspot]
  )

  /* ── Hotspot click in viewer ── */
  const handleHotspotClick = useCallback(
    (hotspot: { _id: string; targetSceneId?: string; type: string; tooltip?: string; title?: string; description?: string; content?: string; imageUrl?: string | null }) => {
      if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
        setActiveSceneId(hotspot.targetSceneId as Id<'scenes'>)
      } else if (hotspot.type === 'link' && hotspot.content) {
        window.open(hotspot.content, '_blank', 'noopener,noreferrer')
      } else if (hotspot.type === 'info' || hotspot.type === 'media') {
        setActivePopupHotspot(hotspot)
      }
    },
    []
  )

  /* ── Loading ── */
  if (tour === undefined) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    )
  }

  if (tour === null) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: '#0A0908' }}
      >
        <p style={{ color: '#F87171', fontFamily: 'var(--font-dmsans)' }}>Tour not found</p>
        <Link
          href="/tours"
          className="text-sm underline"
          style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
        >
          Back to Tours
        </Link>
      </div>
    )
  }

  const isPublished = tour.status === 'published'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#0A0908' }}
    >
      {/* ── Top Bar ── */}
      <div
        className="flex items-center justify-between h-14 px-6 flex-shrink-0"
        style={{
          backgroundColor: '#12100E',
          borderBottom: '1px solid rgba(212,160,23,0.12)',
        }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/tours"
            className="flex items-center justify-center rounded-md"
            style={{ padding: '6px 8px', border: '1px solid rgba(212,160,23,0.12)' }}
            aria-label="Back to tours"
          >
            <ArrowLeft size={18} style={{ color: '#A8A29E' }} />
          </Link>
          {titleEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                if (editTitle.trim() && editTitle !== tourTitle) handleSave()
                else setTitleEditing(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editTitle.trim() && editTitle !== tourTitle) handleSave()
                  else setTitleEditing(false)
                }
              }}
              autoFocus
              className="text-base font-semibold outline-none bg-transparent"
              style={{
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
                borderBottom: '1px solid #D4A017',
                paddingBottom: 2,
              }}
            />
          ) : (
            <button
              onClick={() => {
                setEditTitle(tourTitle)
                setEditDescription(tourDescription)
                setTitleEditing(true)
              }}
              className="text-base font-semibold hover:opacity-80 transition-opacity"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              {tourTitle}
            </button>
          )}
          {isPublished && (
            <span
              className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(52,211,153,0.12)', color: '#34D399' }}
            >
              <CheckCircle2 size={12} /> Published
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Preview toggle */}
          <button
            onClick={() => {
              setPreviewMode(!previewMode)
              setIsPlacingHotspot(false)
              setPendingPosition(null)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{
              border: previewMode
                ? '1px solid #2DD4BF'
                : '1px solid rgba(212,160,23,0.12)',
              color: previewMode ? '#2DD4BF' : '#A8A29E',
              backgroundColor: previewMode ? 'rgba(45,212,191,0.08)' : 'transparent',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            <Eye size={16} /> {previewMode ? 'Exit Preview' : 'Preview'}
          </button>

          {/* Live link */}
          {tour.slug && isPublished && (
            <Link
              href={`/tour/${tour.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{
                border: '1px solid rgba(212,160,23,0.12)',
                color: '#A8A29E',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              <Globe size={16} /> View Live
            </Link>
          )}
          <button
            onClick={handlePublish}
            disabled={publishing || sceneList.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-50"
            style={{
              backgroundColor: '#D4A017',
              color: '#0A0908',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {publishing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Globe size={16} />
            )}
            {isPublished ? 'Republish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* ── Editor Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Scenes Panel (Left) ── */}
        {!previewMode && (
          <div
            className="hidden md:flex flex-col w-[260px] flex-shrink-0"
            style={{
              backgroundColor: '#12100E',
              borderRight: '1px solid rgba(212,160,23,0.12)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <span
                className="text-sm font-semibold"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
              >
                Scenes
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
              >
                {sceneList.length}
              </span>
            </div>

            {/* Scene List */}
            <div className="flex-1 overflow-y-auto px-2 flex flex-col gap-1">
              {sceneList.length === 0 && !uploading && (
                <div className="px-3 py-8 text-center">
                  <ImageIcon size={28} style={{ color: '#6B6560', margin: '0 auto 8px' }} />
                  <p
                    className="text-xs"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                  >
                    No scenes yet. Upload 360° panoramas to get started.
                  </p>
                </div>
              )}

              {sceneList.map((scene, index) => {
                const isActive = scene._id === (activeSceneId ?? sceneList[0]?._id)
                const isDragging = dragIndex === index
                const isDragOver = dragOverIndex === index
                const sceneHotspotCount = hotspotsByTour?.filter(
                  (h) => h.sceneId === scene._id
                ).length ?? 0
                return (
                  <div key={scene._id}>
                    {/* Drop indicator line above scene */}
                    {isDragOver && dragIndex !== null && dragIndex !== index && (
                      <div
                        style={{
                          height: '2px',
                          backgroundColor: '#D4A017',
                          margin: '0 0 -1px 0',
                        }}
                      />
                    )}
                    <div
                      draggable
                      className="group flex items-center gap-2.5 p-2 rounded-lg transition-all duration-150 cursor-move"
                      style={{
                        backgroundColor: isActive ? 'rgba(212,160,23,0.07)' : 'transparent',
                        border: isActive
                          ? '1px solid rgba(212,160,23,0.4)'
                          : '1px solid transparent',
                        opacity: isDragging ? 0.4 : 1,
                        transition: 'opacity 150ms',
                      }}
                      onDragStart={(e) => {
                        setDragIndex(index)
                        e.dataTransfer!.effectAllowed = 'move'
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer!.dropEffect = 'move'
                        setDragOverIndex(index)
                      }}
                      onDragLeave={() => {
                        setDragOverIndex(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (dragIndex !== null && dragIndex !== index) {
                          handleReorderScenes(dragIndex, index)
                        }
                        setDragIndex(null)
                        setDragOverIndex(null)
                      }}
                      onDragEnd={() => {
                        setDragIndex(null)
                        setDragOverIndex(null)
                      }}
                      onClick={() => setActiveSceneId(scene._id)}
                    >
                    <GripVertical size={14} style={{ color: '#6B6560' }} className="flex-shrink-0" />
                    <div className="w-[56px] h-10 rounded-md overflow-hidden flex-shrink-0 relative">
                      {scene.imageUrl ? (
                        <img
                          src={proxyImageUrl(scene.imageUrl) ?? scene.imageUrl}
                          alt={scene.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: '#1B1916' }}
                        >
                          <ImageIcon size={16} style={{ color: '#6B6560' }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-medium truncate"
                        style={{
                          color: isActive ? '#F5F3EF' : '#A8A29E',
                          fontFamily: 'var(--font-dmsans)',
                        }}
                      >
                        {scene.title}
                      </p>
                      <p className="text-[11px]" style={{ color: '#6B6560' }}>
                        Scene {scene.order + 1}
                        {sceneHotspotCount > 0 && (
                          <span style={{ color: '#2DD4BF' }}>
                            {' '}· {sceneHotspotCount} hotspot{sceneHotspotCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteScene(scene._id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                        style={{ color: '#F87171' }}
                        aria-label={`Delete ${scene.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    </div>
                  </div>
                )
              })}

              {/* Upload progress */}
              {uploadProgress.map((msg, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 text-[12px]"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  <Loader2 size={12} className="animate-spin" style={{ color: '#D4A017' }} />
                  {msg}
                </div>
              ))}
            </div>

            {/* Add Scene Button */}
            <div style={{ borderTop: '1px solid rgba(212,160,23,0.12)' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleUpload(e.target.files)}
                className="hidden"
                id="scene-upload"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 transition-colors disabled:opacity-50"
                style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                <span className="text-[13px] font-semibold">
                  {uploading ? 'Uploading...' : 'Add Scenes'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── Viewport (Center) — 360° PanoramaViewer ── */}
        <div
          className="flex-1 relative overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: '#0A0908' }}
        >
          {activeScene?.imageUrl ? (
            <PanoramaViewer
              imageUrl={proxyImageUrl(activeScene.imageUrl) ?? activeScene.imageUrl}
              height="100%"
              hotspots={activeSceneHotspots as any[]}
              onHotspotClick={handleHotspotClick as any}
              onSphereClick={handleSphereClick}
              isEditing={isPlacingHotspot}
              autoRotate={tourSettings.autoRotate && previewMode}
            />
          ) : (
            /* Empty state — big upload area */
            <div
              className="flex flex-col items-center justify-center gap-6 p-8 rounded-2xl max-w-lg w-full mx-4"
              style={{
                backgroundColor: '#12100E',
                border: '2px dashed rgba(212,160,23,0.25)',
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = '#D4A017'
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,160,23,0.25)'
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = 'rgba(212,160,23,0.25)'
                handleUpload(e.dataTransfer.files)
              }}
            >
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
              >
                <Upload size={28} style={{ color: '#D4A017' }} />
              </div>
              <div className="text-center">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                >
                  Upload 360° Panoramas
                </h3>
                <p
                  className="text-sm mb-1"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Drag and drop your panorama images here, or click to browse.
                </p>
                <p
                  className="text-xs"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  Supports JPG, PNG, WebP. Equirectangular format recommended.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                {uploading ? 'Uploading...' : 'Select Files'}
              </button>
            </div>
          )}

          {/* Bottom HUD — scene label (bottom-left) */}
          {activeScene && !previewMode && (
            <div
              className="absolute bottom-4 left-4 px-3 py-2 rounded-lg z-10"
              style={{
                backgroundColor: 'rgba(10,9,8,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(212,160,23,0.2)',
              }}
            >
              <p className="text-sm font-semibold leading-none" style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}>
                {activeScene.title}
              </p>
              {activeScene.roomType && (
                <p className="text-[11px] mt-0.5" style={{ color: '#A8A29E' }}>{activeScene.roomType}</p>
              )}
            </div>
          )}

          {/* Hotspot toolbar — centered bottom */}
          {activeScene && !previewMode && (
            <div
              className="absolute bottom-4 left-1/2 z-10 flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
              style={{
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(10,9,8,0.88)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span
                className="text-[9px] font-bold px-1 flex-shrink-0"
                style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                + Hotspot
              </span>
              <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              {HOTSPOT_TYPES.map((ht) => {
                const Icon = ht.icon
                const isActive = isPlacingHotspot && hotspotType === ht.value
                return (
                  <button
                    key={ht.value}
                    onClick={() => {
                      setHotspotType(ht.value)
                      setIsPlacingHotspot(true)
                      setPendingPosition(null)
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: isActive ? `${ht.color}20` : 'transparent',
                      border: isActive ? `1px solid ${ht.color}50` : '1px solid transparent',
                      color: isActive ? ht.color : '#A8A29E',
                      boxShadow: isActive ? `0 0 8px ${ht.color}25` : 'none',
                    }}
                    title={ht.desc}
                  >
                    <Icon size={13} />
                    <span className="text-[11px] font-semibold" style={{ fontFamily: 'var(--font-dmsans)' }}>
                      {ht.label}
                    </span>
                  </button>
                )
              })}
              {isPlacingHotspot && (
                <>
                  <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  <button
                    onClick={() => { setIsPlacingHotspot(false); setPendingPosition(null) }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all"
                    style={{ color: '#F87171', fontSize: '11px', fontFamily: 'var(--font-dmsans)', fontWeight: 600 }}
                    title="Cancel placement"
                  >
                    <X size={11} /> Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {/* Hotspot placement dialog */}
          {pendingPosition && (
            <div
              className="absolute top-4 right-4 w-[300px] rounded-xl flex flex-col z-20 overflow-hidden"
              style={{
                backgroundColor: '#12100E',
                border: '1px solid rgba(212,160,23,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                maxHeight: 'calc(100% - 32px)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(212,160,23,0.1)' }}
              >
                <div className="flex items-center gap-2">
                  {(() => {
                    const ht = HOTSPOT_TYPES.find(h => h.value === hotspotType)!
                    const Icon = ht.icon
                    return (
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${ht.color}20`, color: ht.color }}>
                        <Icon size={13} />
                      </div>
                    )
                  })()}
                  <h4 className="text-sm font-semibold" style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}>
                    New Hotspot
                  </h4>
                </div>
                <button onClick={() => { setPendingPosition(null); setIsPlacingHotspot(false) }} style={{ color: '#6B6560' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex flex-col gap-3 p-4 overflow-y-auto">

                {/* Type selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B6560' }}>Type</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {HOTSPOT_TYPES.map((ht) => {
                      const Icon = ht.icon
                      const isSelected = hotspotType === ht.value
                      return (
                        <button
                          key={ht.value}
                          onClick={() => setHotspotType(ht.value)}
                          className="flex flex-col items-center gap-1 py-2 rounded-lg transition-all"
                          title={ht.desc}
                          style={{
                            backgroundColor: isSelected ? `${ht.color}15` : 'rgba(255,255,255,0.03)',
                            border: isSelected ? `1.5px solid ${ht.color}50` : '1.5px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: isSelected ? `${ht.color}25` : 'rgba(255,255,255,0.06)', color: isSelected ? ht.color : '#6B6560' }}>
                            <Icon size={14} />
                          </div>
                          <span className="text-[10px] font-semibold" style={{ color: isSelected ? ht.color : '#A8A29E', fontFamily: 'var(--font-dmsans)' }}>
                            {ht.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Label / Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B6560' }}>Label</label>
                  <input
                    type="text"
                    value={hotspotTooltip}
                    onChange={(e) => setHotspotTooltip(e.target.value)}
                    placeholder={hotspotType === 'navigation' ? 'e.g. Go to Living Room' : hotspotType === 'info' ? 'e.g. Marble Countertop' : hotspotType === 'media' ? 'e.g. Play video' : 'e.g. View brochure'}
                    className="w-full h-9 px-3 rounded-lg text-[12px] outline-none"
                    style={{ backgroundColor: '#0A0908', border: '1px solid rgba(212,160,23,0.15)', color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.15)' }}
                  />
                </div>

                {/* Navigation: target scene */}
                {hotspotType === 'navigation' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B6560' }}>Navigate to Scene</label>
                    <select
                      value={hotspotTargetSceneId}
                      onChange={(e) => setHotspotTargetSceneId(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg text-[12px] outline-none"
                      style={{ backgroundColor: '#0A0908', border: '1px solid rgba(212,160,23,0.15)', color: hotspotTargetSceneId ? '#F5F3EF' : '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      <option value="">Select a scene...</option>
                      {sceneList.filter((s) => s._id !== activeScene?._id).map((s) => (
                        <option key={s._id} value={s._id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Info: description */}
                {hotspotType === 'info' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B6560' }}>Description</label>
                    <textarea
                      value={hotspotDescription}
                      onChange={(e) => setHotspotDescription(e.target.value)}
                      placeholder="Add details about this spot..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg text-[12px] outline-none resize-none"
                      style={{ backgroundColor: '#0A0908', border: '1px solid rgba(212,160,23,0.15)', color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.15)' }}
                    />
                  </div>
                )}

                {/* Link: URL */}
                {hotspotType === 'link' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B6560' }}>URL</label>
                    <input
                      type="url"
                      value={hotspotContent}
                      onChange={(e) => setHotspotContent(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-9 px-3 rounded-lg text-[12px] outline-none"
                      style={{ backgroundColor: '#0A0908', border: '1px solid rgba(212,160,23,0.15)', color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.15)' }}
                    />
                  </div>
                )}

                {/* Media: URL */}
                {hotspotType === 'media' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B6560' }}>Media URL</label>
                    <input
                      type="url"
                      value={hotspotContent}
                      onChange={(e) => setHotspotContent(e.target.value)}
                      placeholder="YouTube, Vimeo, or direct video URL"
                      className="w-full h-9 px-3 rounded-lg text-[12px] outline-none"
                      style={{ backgroundColor: '#0A0908', border: '1px solid rgba(212,160,23,0.15)', color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.15)' }}
                    />
                  </div>
                )}

                {/* Image upload (info + media) */}
                {(hotspotType === 'info' || hotspotType === 'media') && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B6560' }}>Image</label>
                    <input
                      ref={hotspotImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setHotspotImageFile(file)
                        setHotspotImagePreview(URL.createObjectURL(file))
                      }}
                    />
                    {hotspotImagePreview ? (
                      <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <img src={hotspotImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => { setHotspotImageFile(null); setHotspotImagePreview(null) }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(10,9,8,0.8)', color: '#F87171' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => hotspotImageInputRef.current?.click()}
                        className="w-full rounded-lg flex flex-col items-center justify-center gap-1 py-4 transition-colors"
                        style={{ border: '1.5px dashed rgba(212,160,23,0.2)', backgroundColor: 'rgba(212,160,23,0.03)', color: '#6B6560' }}
                      >
                        <ImageIcon size={18} />
                        <span className="text-[11px]" style={{ fontFamily: 'var(--font-dmsans)' }}>Click to upload image</span>
                      </button>
                    )}
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="px-4 pb-4 flex-shrink-0">
                <button
                  onClick={handleConfirmHotspot}
                  className="w-full h-10 rounded-lg text-[13px] font-semibold transition-all"
                  style={{ backgroundColor: '#2DD4BF', color: '#0A0908', fontFamily: 'var(--font-dmsans)' }}
                >
                  Add Hotspot
                </button>
              </div>
            </div>
          )}

          {/* Info / Media hotspot popup */}
          {activePopupHotspot && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setActivePopupHotspot(null)}
            >
              <div
                className="w-[320px] max-w-[90%] rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#12100E', border: '1px solid rgba(212,160,23,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image */}
                {activePopupHotspot.imageUrl && (
                  <img
                    src={activePopupHotspot.imageUrl}
                    alt={activePopupHotspot.title ?? activePopupHotspot.tooltip ?? ''}
                    className="w-full object-cover"
                    style={{ maxHeight: '200px' }}
                  />
                )}

                {/* Media embed */}
                {activePopupHotspot.type === 'media' && activePopupHotspot.content && !activePopupHotspot.imageUrl && (
                  <div className="w-full" style={{ aspectRatio: '16/9', backgroundColor: '#0A0908' }}>
                    <iframe
                      src={activePopupHotspot.content}
                      className="w-full h-full"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 flex flex-col gap-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {(activePopupHotspot.title || activePopupHotspot.tooltip) && (
                        <h3 className="text-base font-semibold" style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}>
                          {activePopupHotspot.title || activePopupHotspot.tooltip}
                        </h3>
                      )}
                    </div>
                    <button
                      onClick={() => setActivePopupHotspot(null)}
                      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                      style={{ color: '#6B6560', backgroundColor: 'rgba(255,255,255,0.04)' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Description */}
                  {activePopupHotspot.description && (
                    <p className="text-sm" style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)', lineHeight: 1.6 }}>
                      {activePopupHotspot.description}
                    </p>
                  )}

                  {/* Fallback: content as text for info type */}
                  {activePopupHotspot.type === 'info' && activePopupHotspot.content && !activePopupHotspot.description && (
                    <p className="text-sm" style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)', lineHeight: 1.6 }}>
                      {activePopupHotspot.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Properties Panel (Right) ── */}
        {activeScene && !previewMode && (
          <div
            className="hidden lg:flex flex-col w-[280px] flex-shrink-0"
            style={{
              backgroundColor: '#12100E',
              borderLeft: '1px solid rgba(212,160,23,0.12)',
            }}
          >
            {/* Tab Navigation */}
            <div className="flex items-center gap-0 px-0 py-0 border-b" style={{ borderColor: 'rgba(212,160,23,0.12)' }}>
              <button
                onClick={() => setRightPanelTab('properties')}
                className="flex-1 px-4 py-3 text-sm font-semibold text-center transition-colors"
                style={{
                  color: rightPanelTab === 'properties' ? '#D4A017' : '#A8A29E',
                  fontFamily: 'var(--font-display)',
                  borderBottom: rightPanelTab === 'properties' ? '2px solid #D4A017' : 'none',
                  backgroundColor: rightPanelTab === 'properties' ? 'rgba(212,160,23,0.05)' : 'transparent',
                }}
              >
                Properties
              </button>
              <button
                onClick={() => setRightPanelTab('settings')}
                className="flex-1 px-4 py-3 text-sm font-semibold text-center transition-colors"
                style={{
                  color: rightPanelTab === 'settings' ? '#D4A017' : '#A8A29E',
                  fontFamily: 'var(--font-display)',
                  borderBottom: rightPanelTab === 'settings' ? '2px solid #D4A017' : 'none',
                  backgroundColor: rightPanelTab === 'settings' ? 'rgba(212,160,23,0.05)' : 'transparent',
                }}
              >
                Settings
              </button>
            </div>

            {/* Properties Tab Content */}
            {rightPanelTab === 'properties' && (
            <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-5">
              {/* Scene Name */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-xs font-medium"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Scene Name
                </label>
                <input
                  type="text"
                  defaultValue={activeScene.title}
                  key={activeScene._id}
                  onBlur={(e) => {
                    const val = e.target.value.trim()
                    if (val && val !== activeScene.title) {
                      handleRenameScene(activeScene._id, val)
                    }
                  }}
                  className="w-full h-9 px-3 rounded-lg text-[13px] outline-none transition-colors"
                  style={{
                    backgroundColor: '#0A0908',
                    border: '1px solid rgba(212,160,23,0.12)',
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                  onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                />
              </div>

              {/* Scene Description */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-[11px] uppercase tracking-wide font-medium"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  Notes
                </label>
                <textarea
                  value={sceneDescription}
                  onChange={(e) => handleDescriptionChange(activeScene._id, e.target.value)}
                  placeholder="Add notes about this scene..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{
                    backgroundColor: '#12100E',
                    border: '1px solid rgba(212,160,23,0.12)',
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                />
              </div>

              {/* Hotspots section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: '#A8A29E' }}>
                    Hotspots ({activeSceneHotspots.length})
                  </span>
                  <button
                    onClick={() => {
                      setIsPlacingHotspot(!isPlacingHotspot)
                      setPendingPosition(null)
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-all"
                    style={{
                      backgroundColor: isPlacingHotspot
                        ? 'rgba(45,212,191,0.15)'
                        : 'rgba(212,160,23,0.08)',
                      color: isPlacingHotspot ? '#2DD4BF' : '#D4A017',
                      border: isPlacingHotspot
                        ? '1px solid rgba(45,212,191,0.3)'
                        : '1px solid transparent',
                    }}
                  >
                    {isPlacingHotspot ? (
                      <>
                        <X size={11} /> Cancel
                      </>
                    ) : (
                      <>
                        <MousePointer2 size={11} /> Add
                      </>
                    )}
                  </button>
                </div>

                {/* Hotspot list */}
                {activeSceneHotspots.length === 0 && (
                  <p
                    className="text-[11px] py-2"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                  >
                    No hotspots on this scene. Click &quot;Add&quot; then click on the panorama to place one.
                  </p>
                )}

                {activeSceneHotspots.map((hotspot) => {
                  const config = HOTSPOT_TYPES.find((ht) => ht.value === hotspot.type) ?? HOTSPOT_TYPES[0]
                  const Icon = config.icon
                  return (
                    <div
                      key={hotspot._id}
                      className="flex items-center gap-2 p-2 rounded-lg group"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(212,160,23,0.08)',
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${config.color}15`, color: config.color }}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          defaultValue={hotspot.tooltip || ''}
                          key={hotspot._id}
                          placeholder={config.label}
                          onBlur={(e) => {
                            const val = e.target.value.trim()
                            if (val !== (hotspot.tooltip ?? '')) {
                              handleUpdateHotspotTooltip(hotspot._id as Id<'hotspots'>, val)
                            }
                          }}
                          className="w-full text-[12px] font-medium truncate bg-transparent outline-none"
                          style={{ color: '#F5F3EF' }}
                        />
                        <p className="text-[10px] capitalize" style={{ color: '#6B6560' }}>
                          {hotspot.type}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteHotspot(hotspot._id as Id<'hotspots'>)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                        style={{ color: '#F87171' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* AI Analysis — disabled in v1 */}
            </div>
            )}

            {/* Settings Tab Content */}
            {rightPanelTab === 'settings' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {/* Auto Rotate Toggle */}
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-medium"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Auto Rotate
                </label>
                <button
                  onClick={() => {
                    const newSettings = { ...tourSettings, autoRotate: !tourSettings.autoRotate }
                    setTourSettings(newSettings)
                    updateTour({
                      tourId,
                      settings: { ...tour?.settings, autoRotate: newSettings.autoRotate }
                    }).catch(err => {
                      toast.error('Failed to update settings')
                      setTourSettings(tourSettings)
                    })
                  }}
                  role="switch"
                  aria-checked={tourSettings.autoRotate}
                  className="relative flex-shrink-0 rounded-full transition-colors"
                  style={{
                    width: 44,
                    height: 24,
                    backgroundColor: tourSettings.autoRotate ? '#D4A017' : '#2A2520',
                  }}
                >
                  <div
                    className="absolute top-[2px] rounded-full transition-all"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 9999,
                      backgroundColor: tourSettings.autoRotate ? '#0A0908' : '#6B6560',
                      left: tourSettings.autoRotate ? 22 : 2,
                    }}
                  />
                </button>
              </div>

              {/* Show Mini Map Toggle */}
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-medium"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Show Mini Map
                </label>
                <button
                  onClick={() => {
                    const newSettings = { ...tourSettings, showMiniMap: !tourSettings.showMiniMap }
                    setTourSettings(newSettings)
                    updateTour({
                      tourId,
                      settings: { ...tour?.settings, showMiniMap: newSettings.showMiniMap }
                    }).catch(err => {
                      toast.error('Failed to update settings')
                      setTourSettings(tourSettings)
                    })
                  }}
                  role="switch"
                  aria-checked={tourSettings.showMiniMap}
                  className="relative flex-shrink-0 rounded-full transition-colors"
                  style={{
                    width: 44,
                    height: 24,
                    backgroundColor: tourSettings.showMiniMap ? '#D4A017' : '#2A2520',
                  }}
                >
                  <div
                    className="absolute top-[2px] rounded-full transition-all"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 9999,
                      backgroundColor: tourSettings.showMiniMap ? '#0A0908' : '#6B6560',
                      left: tourSettings.showMiniMap ? 22 : 2,
                    }}
                  />
                </button>
              </div>

              {/* Allow Fullscreen Toggle */}
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-medium"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Allow Fullscreen
                </label>
                <button
                  onClick={() => {
                    const newSettings = { ...tourSettings, allowFullscreen: !tourSettings.allowFullscreen }
                    setTourSettings(newSettings)
                    updateTour({
                      tourId,
                      settings: { ...tour?.settings, allowFullscreen: newSettings.allowFullscreen }
                    }).catch(err => {
                      toast.error('Failed to update settings')
                      setTourSettings(tourSettings)
                    })
                  }}
                  role="switch"
                  aria-checked={tourSettings.allowFullscreen}
                  className="relative flex-shrink-0 rounded-full transition-colors"
                  style={{
                    width: 44,
                    height: 24,
                    backgroundColor: tourSettings.allowFullscreen ? '#D4A017' : '#2A2520',
                  }}
                >
                  <div
                    className="absolute top-[2px] rounded-full transition-all"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 9999,
                      backgroundColor: tourSettings.allowFullscreen ? '#0A0908' : '#6B6560',
                      left: tourSettings.allowFullscreen ? 22 : 2,
                    }}
                  />
                </button>
              </div>

              {/* Branding Enabled Toggle */}
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-medium"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Branding Enabled
                </label>
                <button
                  onClick={() => {
                    const newSettings = { ...tourSettings, brandingEnabled: !tourSettings.brandingEnabled }
                    setTourSettings(newSettings)
                    updateTour({
                      tourId,
                      settings: { ...tour?.settings, brandingEnabled: newSettings.brandingEnabled }
                    }).catch(err => {
                      toast.error('Failed to update settings')
                      setTourSettings(tourSettings)
                    })
                  }}
                  role="switch"
                  aria-checked={tourSettings.brandingEnabled}
                  className="relative flex-shrink-0 rounded-full transition-colors"
                  style={{
                    width: 44,
                    height: 24,
                    backgroundColor: tourSettings.brandingEnabled ? '#D4A017' : '#2A2520',
                  }}
                >
                  <div
                    className="absolute top-[2px] rounded-full transition-all"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 9999,
                      backgroundColor: tourSettings.brandingEnabled ? '#0A0908' : '#6B6560',
                      left: tourSettings.brandingEnabled ? 22 : 2,
                    }}
                  />
                </button>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid rgba(212,160,23,0.12)', margin: '8px 0' }} />

              {/* Tour Description */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-xs font-medium"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Tour Description
                </label>
                <textarea
                  value={tourDescriptionLocal}
                  onChange={(e) => setTourDescriptionLocal(e.target.value)}
                  onBlur={() => handleSaveTourDescription(tourDescriptionLocal)}
                  placeholder="Describe your virtual tour..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                  style={{
                    backgroundColor: '#12100E',
                    border: '1px solid rgba(212,160,23,0.12)',
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                  onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                />
              </div>

              {/* Custom URL Slug */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-xs font-medium"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Custom URL Slug
                </label>
                <div className="flex items-center gap-0">
                  <span
                    className="text-[11px] px-2 py-2 rounded-l-lg"
                    style={{
                      backgroundColor: '#1B1916',
                      border: '1px solid rgba(212,160,23,0.12)',
                      borderRight: 'none',
                      color: '#6B6560',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    /tour/
                  </span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    onBlur={() => handleSaveSlug(customSlug)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSlug(customSlug) }}
                    className="flex-1 h-[34px] px-2 rounded-r-lg text-[12px] outline-none"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                    onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                  />
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid rgba(212,160,23,0.12)', margin: '8px 0' }} />

              {/* Privacy Dropdown */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-xs font-medium"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Privacy
                </label>
                <select
                  value={tour?.privacy || 'public'}
                  onChange={(e) => {
                    const newPrivacy = e.target.value as 'public' | 'unlisted' | 'password_protected'
                    updateTour({
                      tourId,
                      privacy: newPrivacy,
                      ...(newPrivacy !== 'password_protected' ? { password: undefined } : {})
                    }).catch(err => {
                      toast.error('Failed to update privacy')
                    })
                  }}
                  className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                  style={{
                    backgroundColor: '#0A0908',
                    border: '1px solid rgba(212,160,23,0.12)',
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="password_protected">Password Protected</option>
                </select>
              </div>

              {/* Password Input (shown only when password_protected) */}
              {tour?.privacy === 'password_protected' && (
                <div className="flex flex-col gap-2">
                  <label
                    className="text-xs font-medium"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    defaultValue={tour?.password || ''}
                    placeholder="Enter password"
                    onBlur={(e) => {
                      const val = e.target.value.trim()
                      if (val !== (tour?.password || '')) {
                        updateTour({
                          tourId,
                          password: val || undefined
                        }).catch(err => {
                          toast.error('Failed to update password')
                        })
                      }
                    }}
                    className="w-full h-9 px-3 rounded-lg text-[13px] outline-none transition-colors"
                    style={{
                      backgroundColor: '#0A0908',
                      border: '1px solid rgba(212,160,23,0.12)',
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                    onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                  />
                </div>
              )}
            </div>
            )}

            {/* Footer */}
            <div
              className="p-4 flex flex-col gap-2"
              style={{ borderTop: '1px solid rgba(212,160,23,0.12)' }}
            >
              <button
                onClick={handlePublish}
                disabled={publishing || sceneList.length === 0}
                className="w-full h-10 rounded-[10px] flex items-center justify-center gap-2 text-[13px] font-bold transition-all disabled:opacity-50"
                style={{
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                  boxShadow: '0 0 20px rgba(212,160,23,0.19)',
                }}
              >
                {publishing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Globe size={16} />
                )}
                {isPublished ? 'Republish Tour' : 'Publish Tour'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── (hotspot toolbar moved to panorama overlay) ── */}
      {!previewMode && activeScene && (
        <div className="flex-shrink-0 flex flex-col" style={{ height: 0 }}>

        {/* ── Mobile Properties Floating Button (Bottom Right) ── */}
        {activeScene && !previewMode && (
          <button
            onClick={() => setMobilePropsDrawerOpen(true)}
            className="fixed bottom-20 md:hidden right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg z-40"
            style={{
              backgroundColor: '#D4A017',
              color: '#0A0908',
            }}
            aria-label="Open properties panel"
          >
            <Settings size={20} />
          </button>
        )}

        {/* ── Mobile Properties Bottom Sheet ── */}
        {mobilePropsDrawerOpen && activeScene && !previewMode && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobilePropsDrawerOpen(false)}
            />
            {/* Sheet */}
            <div
              className="absolute bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl overflow-hidden"
              style={{
                backgroundColor: '#12100E',
                borderTop: '1px solid rgba(212,160,23,0.12)',
              }}
            >
              <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'rgba(212,160,23,0.12)' }}>
                  <h3 style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '600' }}>
                    Scene Properties
                  </h3>
                  <button
                    onClick={() => setMobilePropsDrawerOpen(false)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                    style={{ color: '#A8A29E' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 border-b" style={{ borderColor: 'rgba(212,160,23,0.12)' }}>
                  <button
                    onClick={() => setRightPanelTab('properties')}
                    className="px-3 py-2 text-sm font-semibold transition-colors"
                    style={{
                      color: rightPanelTab === 'properties' ? '#D4A017' : '#A8A29E',
                      fontFamily: 'var(--font-display)',
                      borderBottom: rightPanelTab === 'properties' ? '2px solid #D4A017' : 'none',
                    }}
                  >
                    Properties
                  </button>
                  <button
                    onClick={() => setRightPanelTab('settings')}
                    className="px-3 py-2 text-sm font-semibold transition-colors"
                    style={{
                      color: rightPanelTab === 'settings' ? '#D4A017' : '#A8A29E',
                      fontFamily: 'var(--font-display)',
                      borderBottom: rightPanelTab === 'settings' ? '2px solid #D4A017' : 'none',
                    }}
                  >
                    Settings
                  </button>
                </div>

                {/* Properties Tab Content */}
                {rightPanelTab === 'properties' && (
                  <div className="flex flex-col gap-5">
                    {/* Scene Name */}
                    <div className="flex flex-col gap-2">
                      <label
                        className="text-xs font-medium"
                        style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                      >
                        Scene Name
                      </label>
                      <input
                        type="text"
                        defaultValue={activeScene.title}
                        key={activeScene._id}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (val && val !== activeScene.title) {
                            handleRenameScene(activeScene._id, val)
                          }
                        }}
                        className="w-full h-9 px-3 rounded-lg text-[13px] outline-none transition-colors"
                        style={{
                          backgroundColor: '#0A0908',
                          border: '1px solid rgba(212,160,23,0.12)',
                          color: '#F5F3EF',
                          fontFamily: 'var(--font-dmsans)',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                        onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                      />
                    </div>

                    {/* Scene Description */}
                    <div className="flex flex-col gap-2">
                      <label
                        className="text-[11px] uppercase tracking-wide font-medium"
                        style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                      >
                        Notes
                      </label>
                      <textarea
                        value={sceneDescription}
                        onChange={(e) => handleDescriptionChange(activeScene._id, e.target.value)}
                        placeholder="Add notes about this scene..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                        style={{
                          backgroundColor: '#1B1916',
                          border: '1px solid rgba(212,160,23,0.12)',
                          color: '#F5F3EF',
                          fontFamily: 'var(--font-dmsans)',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#D4A017' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                      />
                    </div>


                    {/* Delete Scene Button */}
                    <button
                      onClick={() => handleDeleteScene(activeScene._id)}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: 'rgba(251,122,84,0.1)',
                        color: '#FB7A54',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      <Trash2 size={14} className="inline mr-2" />
                      Delete Scene
                    </button>
                  </div>
                )}

                {/* Settings Tab Content */}
                {rightPanelTab === 'settings' && (
                  <div className="flex flex-col gap-5">
                    {/* Auto Rotate Toggle */}
                    <div className="flex items-center justify-between">
                      <label
                        className="text-sm"
                        style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                      >
                        Auto Rotate
                      </label>
                      <button
                        onClick={() => {
                          const newSettings = { ...tourSettings, autoRotate: !tourSettings.autoRotate }
                          setTourSettings(newSettings)
                          updateTour({
                            tourId,
                            settings: { ...tour?.settings, autoRotate: newSettings.autoRotate }
                          }).catch(err => {
                            toast.error('Failed to update settings')
                            setTourSettings(tourSettings)
                          })
                        }}
                        role="switch"
                        aria-checked={tourSettings.autoRotate}
                        className="relative flex-shrink-0 rounded-full transition-colors"
                        style={{
                          width: 44,
                          height: 24,
                          backgroundColor: tourSettings.autoRotate ? '#D4A017' : '#2A2520',
                        }}
                      >
                        <div
                          className="absolute top-[2px] rounded-full transition-all"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 9999,
                            backgroundColor: tourSettings.autoRotate ? '#0A0908' : '#6B6560',
                            left: tourSettings.autoRotate ? 22 : 2,
                          }}
                        />
                      </button>
                    </div>

                    {/* Show Mini Map Toggle */}
                    <div className="flex items-center justify-between">
                      <label
                        className="text-xs font-medium"
                        style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                      >
                        Show Mini Map
                      </label>
                      <button
                        onClick={() => {
                          const newSettings = { ...tourSettings, showMiniMap: !tourSettings.showMiniMap }
                          setTourSettings(newSettings)
                          updateTour({
                            tourId,
                            settings: { ...tour?.settings, showMiniMap: newSettings.showMiniMap }
                          }).catch(err => {
                            toast.error('Failed to update settings')
                            setTourSettings(tourSettings)
                          })
                        }}
                        role="switch"
                        aria-checked={tourSettings.showMiniMap}
                        className="relative flex-shrink-0 rounded-full transition-colors"
                        style={{
                          width: 44,
                          height: 24,
                          backgroundColor: tourSettings.showMiniMap ? '#D4A017' : '#2A2520',
                        }}
                      >
                        <div
                          className="absolute top-[2px] rounded-full transition-all"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 9999,
                            backgroundColor: tourSettings.showMiniMap ? '#0A0908' : '#6B6560',
                            left: tourSettings.showMiniMap ? 22 : 2,
                          }}
                        />
                      </button>
                    </div>

                    {/* Allow Fullscreen Toggle */}
                    <div className="flex items-center justify-between">
                      <label
                        className="text-xs font-medium"
                        style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                      >
                        Allow Fullscreen
                      </label>
                      <button
                        onClick={() => {
                          const newSettings = { ...tourSettings, allowFullscreen: !tourSettings.allowFullscreen }
                          setTourSettings(newSettings)
                          updateTour({
                            tourId,
                            settings: { ...tour?.settings, allowFullscreen: newSettings.allowFullscreen }
                          }).catch(err => {
                            toast.error('Failed to update settings')
                            setTourSettings(tourSettings)
                          })
                        }}
                        role="switch"
                        aria-checked={tourSettings.allowFullscreen}
                        className="relative flex-shrink-0 rounded-full transition-colors"
                        style={{
                          width: 44,
                          height: 24,
                          backgroundColor: tourSettings.allowFullscreen ? '#D4A017' : '#2A2520',
                        }}
                      >
                        <div
                          className="absolute top-[2px] rounded-full transition-all"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 9999,
                            backgroundColor: tourSettings.allowFullscreen ? '#0A0908' : '#6B6560',
                            left: tourSettings.allowFullscreen ? 22 : 2,
                          }}
                        />
                      </button>
                    </div>

                    {/* Branding Enabled Toggle */}
                    <div className="flex items-center justify-between">
                      <label
                        className="text-xs font-medium"
                        style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                      >
                        Branding
                      </label>
                      <button
                        onClick={() => {
                          const newSettings = { ...tourSettings, brandingEnabled: !tourSettings.brandingEnabled }
                          setTourSettings(newSettings)
                          updateTour({
                            tourId,
                            settings: { ...tour?.settings, brandingEnabled: newSettings.brandingEnabled }
                          }).catch(err => {
                            toast.error('Failed to update settings')
                            setTourSettings(tourSettings)
                          })
                        }}
                        role="switch"
                        aria-checked={tourSettings.brandingEnabled}
                        className="relative flex-shrink-0 rounded-full transition-colors"
                        style={{
                          width: 44,
                          height: 24,
                          backgroundColor: tourSettings.brandingEnabled ? '#D4A017' : '#2A2520',
                        }}
                      >
                        <div
                          className="absolute top-[2px] rounded-full transition-all"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 9999,
                            backgroundColor: tourSettings.brandingEnabled ? '#0A0908' : '#6B6560',
                            left: tourSettings.brandingEnabled ? 22 : 2,
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  )
}
