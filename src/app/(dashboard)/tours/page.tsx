'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import toast from 'react-hot-toast'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Search,
  Plus,
  Eye,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  ExternalLink,
  Link2,
  Copy,
  Archive,
  Trash2,
  ChevronDown,
  X,
  MapPin,
  Users,
  Clock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'draft' | 'published' | 'archived'
type SortOption = 'created' | 'modified' | 'views' | 'alpha'
type ViewMode = 'grid' | 'list'
type TourType = 'residential' | 'commercial' | 'vacation_rental' | 'restaurant' | 'other'

interface Tour {
  _id: Id<'tours'>
  title: string
  description?: string
  slug: string
  status: 'draft' | 'published' | 'archived'
  viewCount: number
  _creationTime: number
  tourType?: string
  tags?: string[]
}

// ─── Constants ───────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
]

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest First', value: 'created' },
  { label: 'Most Views', value: 'views' },
  { label: 'Most Leads', value: 'modified' },
  { label: 'Title A-Z', value: 'alpha' },
]

const TOUR_TYPES: { label: string; value: TourType }[] = [
  { label: 'Residential', value: 'residential' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Vacation Rental', value: 'vacation_rental' },
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Other', value: 'other' },
]

const THUMBNAIL_GRADIENTS = [
  'linear-gradient(135deg, #D4A017 0%, #2DD4BF 100%)',
  'linear-gradient(135deg, #1B1916 0%, #D4A017 100%)',
  'linear-gradient(135deg, #2DD4BF 0%, #0A0908 100%)',
  'linear-gradient(135deg, #FB7A54 0%, #D4A017 100%)',
  'linear-gradient(135deg, #D4A017 0%, #FB7A54 50%, #2DD4BF 100%)',
]

// ─── Utilities ───────────────────────────────────────────────────────

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

function getGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return THUMBNAIL_GRADIENTS[Math.abs(hash) % THUMBNAIL_GRADIENTS.length]
}

// ─── Sub-Components ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: Tour['status'] }) {
  const config = {
    draft: { label: 'Draft', color: '#A8A29E', bg: 'rgba(168,162,158,0.12)' },
    published: { label: 'Published', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    archived: { label: 'Archived', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  }
  const c = config[status]

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ color: c.color, backgroundColor: c.bg, fontFamily: 'var(--font-dmsans)' }}
    >
      {status === 'published' && (
        <span
          className="inline-block rounded-full animate-pulse"
          style={{ width: 6, height: 6, backgroundColor: '#34D399' }}
        />
      )}
      {c.label}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div
      className="overflow-hidden animate-pulse"
      style={{
        backgroundColor: '#12100E',
        border: '1px solid rgba(212,160,23,0.08)',
        borderRadius: 12,
      }}
    >
      <div style={{ height: 180, backgroundColor: '#1B1916' }} />
      <div style={{ padding: 16 }}>
        <div
          className="rounded"
          style={{ height: 16, width: '70%', backgroundColor: '#1B1916', marginBottom: 12 }}
        />
        <div
          className="rounded"
          style={{ height: 12, width: '50%', backgroundColor: '#1B1916', marginBottom: 8 }}
        />
        <div className="rounded" style={{ height: 12, width: '40%', backgroundColor: '#1B1916' }} />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-4 animate-pulse"
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(212,160,23,0.06)',
      }}
    >
      <div className="rounded" style={{ width: 64, height: 40, backgroundColor: '#1B1916' }} />
      <div className="flex-1">
        <div
          className="rounded"
          style={{ height: 14, width: '40%', backgroundColor: '#1B1916', marginBottom: 6 }}
        />
        <div className="rounded" style={{ height: 10, width: '25%', backgroundColor: '#1B1916' }} />
      </div>
      <div className="rounded" style={{ height: 14, width: 60, backgroundColor: '#1B1916' }} />
    </div>
  )
}

// ─── Action Menu ─────────────────────────────────────────────────────

function TourActionMenu({
  tour,
  onEdit,
  onPreview,
  onCopyLink,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  tour: Tour
  onEdit: () => void
  onPreview: () => void
  onCopyLink: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const items = [
    { label: 'Edit', icon: Pencil, action: onEdit },
    { label: 'Preview', icon: ExternalLink, action: onPreview },
    { label: 'Copy Link', icon: Link2, action: onCopyLink },
    { label: 'Duplicate', icon: Copy, action: onDuplicate },
    {
      label: tour.status === 'archived' ? 'Unarchive' : 'Archive',
      icon: Archive,
      action: onArchive,
    },
    { label: 'Delete', icon: Trash2, action: onDelete, destructive: true },
  ]

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(!open)
        }}
        className="flex items-center justify-center rounded-lg transition-colors"
        style={{
          width: 32,
          height: 32,
          backgroundColor: open ? '#2E2A24' : 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label="Tour actions"
      >
        <MoreVertical size={16} style={{ color: '#A8A29E' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50"
          style={{
            top: 36,
            minWidth: 180,
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            borderRadius: 8,
            padding: 4,
            boxShadow: '0 10px 15px rgba(0,0,0,0.2)',
          }}
        >
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  item.action()
                  setOpen(false)
                }}
                className="flex items-center gap-2.5 w-full text-left rounded-md transition-colors"
                style={{
                  padding: '8px 10px',
                  fontSize: 13,
                  fontFamily: 'var(--font-dmsans)',
                  color: (item as { destructive?: boolean }).destructive ? '#F87171' : '#F5F3EF',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2E2A24'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tour Card (Grid) ────────────────────────────────────────────────

function TourCard({
  tour,
  isSelected,
  onToggleSelect,
  onEdit,
  onPreview,
  onCopyLink,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  tour: Tour
  isSelected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onPreview: () => void
  onCopyLink: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group relative transition-all duration-200"
      style={{
        backgroundColor: '#12100E',
        border: isSelected ? '1px solid #D4A017' : '1px solid rgba(212,160,23,0.08)',
        borderRadius: 12,
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered ? '0 10px 15px rgba(0,0,0,0.15)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-t-[11px]" style={{ aspectRatio: '16 / 9' }}>
        <div
          className="absolute inset-0"
          style={{ background: getGradient(tour._id), opacity: 0.6 }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: 'rgba(245,243,239,0.3)', fontSize: 40 }}
        >
          <MapPin size={40} />
        </div>

        {/* Status badge overlay */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={tour.status} />
        </div>

        {/* Checkbox on hover */}
        <div
          className="absolute top-3 left-3 transition-opacity duration-150"
          style={{ opacity: hovered || isSelected ? 1 : 0 }}
        >
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleSelect()
            }}
            className="flex items-center justify-center rounded transition-colors"
            style={{
              width: 22,
              height: 22,
              backgroundColor: isSelected ? '#D4A017' : 'rgba(10,9,8,0.6)',
              border: isSelected ? '2px solid #D4A017' : '2px solid rgba(245,243,239,0.4)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
            aria-label={isSelected ? 'Deselect tour' : 'Select tour'}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#0A0908" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        <div className="flex items-start justify-between gap-2" style={{ marginBottom: 8 }}>
          <h3
            className="font-semibold leading-snug"
            style={{
              fontSize: 16,
              color: '#F5F3EF',
              fontFamily: 'var(--font-display)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            <a
              href={`/tours/${tour._id}`}
              className="hover:underline"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {tour.title}
            </a>
          </h3>
          <TourActionMenu
            tour={tour}
            onEdit={onEdit}
            onPreview={onPreview}
            onCopyLink={onCopyLink}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        </div>

        {/* Meta row */}
        <div
          className="flex items-center gap-2 flex-wrap"
          style={{
            fontSize: 13,
            color: '#6B6560',
            fontFamily: 'var(--font-dmsans)',
            marginBottom: 6,
          }}
        >
          <span className="flex items-center gap-1">
            <Eye size={13} />
            {tour.viewCount.toLocaleString()} views
          </span>
          {tour.tourType && (
            <>
              <span style={{ color: '#2E2A24' }}>|</span>
              <span className="capitalize">{tour.tourType.replace('_', ' ')}</span>
            </>
          )}
        </div>

        {/* Date */}
        <div
          className="flex items-center gap-1"
          style={{ fontSize: 12, color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
        >
          <Clock size={12} />
          Modified {timeAgo(tour._creationTime)}
        </div>
      </div>
    </div>
  )
}

// ─── Tour Row (List) ─────────────────────────────────────────────────

function TourRow({
  tour,
  isSelected,
  onToggleSelect,
  onEdit,
  onPreview,
  onCopyLink,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  tour: Tour
  isSelected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onPreview: () => void
  onCopyLink: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="flex items-center gap-4 transition-colors"
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(212,160,23,0.06)',
        backgroundColor: isSelected ? 'rgba(212,160,23,0.06)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(212,160,23,0.03)'
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleSelect}
        className="flex items-center justify-center rounded shrink-0 transition-colors"
        style={{
          width: 20,
          height: 20,
          backgroundColor: isSelected ? '#D4A017' : 'transparent',
          border: isSelected ? '2px solid #D4A017' : '2px solid #6B6560',
          borderRadius: 4,
          cursor: 'pointer',
        }}
        aria-label={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#0A0908" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Thumbnail */}
      <div
        className="rounded shrink-0 overflow-hidden"
        style={{
          width: 64,
          height: 40,
          background: getGradient(tour._id),
          opacity: 0.7,
        }}
      />

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <a
          href={`/tours/${tour._id}`}
          className="block font-medium truncate hover:underline"
          style={{
            fontSize: 14,
            color: '#F5F3EF',
            fontFamily: 'var(--font-display)',
            textDecoration: 'none',
          }}
        >
          {tour.title}
        </a>
        <span style={{ fontSize: 12, color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
          Modified {timeAgo(tour._creationTime)}
        </span>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusBadge status={tour.status} />
      </div>

      {/* Views */}
      <div
        className="shrink-0 flex items-center gap-1"
        style={{ fontSize: 13, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', minWidth: 80 }}
      >
        <Eye size={13} />
        {tour.viewCount.toLocaleString()}
      </div>

      {/* Actions */}
      <div className="shrink-0">
        <TourActionMenu
          tour={tour}
          onEdit={onEdit}
          onPreview={onPreview}
          onCopyLink={onCopyLink}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}

// ─── Empty States ────────────────────────────────────────────────────

function EmptyState({
  activeStatus,
  hasSearch,
  onClearSearch,
  onCreateTour,
}: {
  activeStatus: StatusFilter
  hasSearch: boolean
  onClearSearch: () => void
  onCreateTour: () => void
}) {
  if (hasSearch) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{ minHeight: 360, padding: 32 }}
      >
        <Search size={48} style={{ color: '#2E2A24', marginBottom: 16 }} />
        <h3
          style={{
            fontSize: 18,
            color: '#F5F3EF',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          No tours match your search
        </h3>
        <p
          style={{
            fontSize: 14,
            color: '#6B6560',
            fontFamily: 'var(--font-dmsans)',
            marginBottom: 20,
          }}
        >
          Try adjusting your search terms or filters.
        </p>
        <button
          onClick={onClearSearch}
          style={{
            backgroundColor: 'transparent',
            border: '1.5px solid #D4A017',
            borderRadius: 8,
            padding: '8px 20px',
            color: '#D4A017',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-dmsans)',
            cursor: 'pointer',
          }}
        >
          Clear Search
        </button>
      </div>
    )
  }

  const stateConfig: Record<StatusFilter, { title: string; subtitle: string; showCTA: boolean }> = {
    all: {
      title: 'Create Your First Virtual Tour',
      subtitle: 'Upload 360 panoramas, add hotspots, and share immersive experiences.',
      showCTA: true,
    },
    draft: {
      title: 'No Drafts',
      subtitle: 'All your tours are published or archived. Great work!',
      showCTA: false,
    },
    published: {
      title: 'No Published Tours',
      subtitle: 'No published tours yet. Publish your first tour to share it with the world.',
      showCTA: false,
    },
    archived: {
      title: 'No Archived Tours',
      subtitle: 'Tours you archive will appear here.',
      showCTA: false,
    },
  }

  const cfg = stateConfig[activeStatus]

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: 360, padding: 32 }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 72,
          height: 72,
          backgroundColor: 'rgba(212,160,23,0.08)',
          marginBottom: 20,
        }}
      >
        <Sparkles size={32} style={{ color: '#D4A017' }} />
      </div>
      <h3
        style={{
          fontSize: 20,
          color: '#F5F3EF',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {cfg.title}
      </h3>
      <p
        style={{
          fontSize: 14,
          color: '#6B6560',
          fontFamily: 'var(--font-dmsans)',
          maxWidth: 400,
          marginBottom: cfg.showCTA ? 24 : 0,
        }}
      >
        {cfg.subtitle}
      </p>
      {cfg.showCTA && (
        <button
          onClick={onCreateTour}
          className="flex items-center gap-2 font-semibold transition-colors"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: 14,
            fontFamily: 'var(--font-dmsans)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E5B120'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#D4A017'
          }}
        >
          <Plus size={16} />
          Create Your First Tour
        </button>
      )}
    </div>
  )
}

// ─── Create Tour Dialog ──────────────────────────────────────────────

function CreateTourDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const createTour = useMutation(api.tours.create)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tourType, setTourType] = useState<TourType | ''>('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setTourType('')
    setError('')
    setCreating(false)
  }, [])

  async function handleCreate() {
    if (!title.trim()) {
      setError('Tour title is required.')
      return
    }
    setError('')
    setCreating(true)
    try {
      const tourId = await createTour({
        title: title.trim(),
        description: description.trim() || undefined,
        tourType: tourType || undefined,
      })
      resetForm()
      onOpenChange(false)
      router.push(`/tours/${tourId}/edit`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tour'
      if (message.includes('Tour limit reached')) {
        setError(message)
      } else {
        setError(message)
      }
      setCreating(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'rgba(10,9,8,0.75)', backdropFilter: 'blur(4px)' }}
        />
        <Dialog.Content
          className="fixed z-50 left-1/2 top-1/2 w-full max-w-lg"
          style={{
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#12100E',
            border: '1px solid rgba(212,160,23,0.15)',
            borderRadius: 12,
            padding: 0,
            boxShadow: '0 20px 25px rgba(0,0,0,0.25)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(212,160,23,0.08)',
            }}
          >
            <Dialog.Title
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Create New Tour
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="flex items-center justify-center rounded-lg transition-colors"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B6560',
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            {error && (
              <div
                className="flex items-center gap-2 rounded-lg"
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#F87171',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {/* Title */}
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#A8A29E',
                fontFamily: 'var(--font-dmsans)',
                marginBottom: 6,
              }}
            >
              Tour Title <span style={{ color: '#F87171' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Luxury Downtown Penthouse"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              autoFocus
              className="w-full outline-none transition-colors"
              style={{
                backgroundColor: '#1B1916',
                border: '1px solid rgba(212,160,23,0.15)',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#F5F3EF',
                fontSize: 14,
                fontFamily: 'var(--font-dmsans)',
                marginBottom: 4,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#D4A017'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,160,23,0.15)'
              }}
            />
            <div
              style={{
                textAlign: 'right',
                fontSize: 11,
                color: '#6B6560',
                fontFamily: 'var(--font-dmsans)',
                marginBottom: 16,
              }}
            >
              {title.length}/100
            </div>

            {/* Description */}
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#A8A29E',
                fontFamily: 'var(--font-dmsans)',
                marginBottom: 6,
              }}
            >
              Description
            </label>
            <textarea
              placeholder="Brief description of the property or space..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              className="w-full outline-none resize-none transition-colors"
              style={{
                backgroundColor: '#1B1916',
                border: '1px solid rgba(212,160,23,0.15)',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#F5F3EF',
                fontSize: 14,
                fontFamily: 'var(--font-dmsans)',
                marginBottom: 4,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#D4A017'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,160,23,0.15)'
              }}
            />
            <div
              style={{
                textAlign: 'right',
                fontSize: 11,
                color: '#6B6560',
                fontFamily: 'var(--font-dmsans)',
                marginBottom: 16,
              }}
            >
              {description.length}/500
            </div>

            {/* Property Type */}
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#A8A29E',
                fontFamily: 'var(--font-dmsans)',
                marginBottom: 6,
              }}
            >
              Property Type
            </label>
            <div className="relative">
              <select
                value={tourType}
                onChange={(e) => setTourType(e.target.value as TourType | '')}
                className="w-full outline-none appearance-none transition-colors"
                style={{
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.15)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  paddingRight: 36,
                  color: tourType ? '#F5F3EF' : '#6B6560',
                  fontSize: 14,
                  fontFamily: 'var(--font-dmsans)',
                  cursor: 'pointer',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#D4A017'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,160,23,0.15)'
                }}
              >
                <option value="">Select type...</option>
                {TOUR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#6B6560' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3"
            style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(212,160,23,0.08)',
            }}
          >
            <Dialog.Close asChild>
              <button
                className="font-medium transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  border: '1.5px solid rgba(212,160,23,0.3)',
                  borderRadius: 8,
                  padding: '8px 20px',
                  color: '#A8A29E',
                  fontSize: 14,
                  fontFamily: 'var(--font-dmsans)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D4A017'
                  e.currentTarget.style.color = '#F5F3EF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,160,23,0.3)'
                  e.currentTarget.style.color = '#A8A29E'
                }}
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="flex items-center gap-2 font-semibold transition-colors"
              style={{
                backgroundColor: creating || !title.trim() ? '#6B6560' : '#D4A017',
                color: '#0A0908',
                borderRadius: 8,
                padding: '8px 24px',
                fontSize: 14,
                fontFamily: 'var(--font-dmsans)',
                border: 'none',
                cursor: creating || !title.trim() ? 'not-allowed' : 'pointer',
                opacity: creating || !title.trim() ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!creating && title.trim()) e.currentTarget.style.backgroundColor = '#E5B120'
              }}
              onMouseLeave={(e) => {
                if (!creating && title.trim()) e.currentTarget.style.backgroundColor = '#D4A017'
              }}
            >
              {creating ? (
                <>
                  <span
                    className="inline-block animate-spin rounded-full"
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(10,9,8,0.3)',
                      borderTopColor: '#0A0908',
                    }}
                  />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Tour
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Delete Confirmation Dialog ──────────────────────────────────────

function DeleteTourDialog({
  tour,
  open,
  onOpenChange,
  onConfirm,
}: {
  tour: Tour | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  if (!tour) return null

  async function handleDelete() {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'rgba(10,9,8,0.75)', backdropFilter: 'blur(4px)' }}
        />
        <Dialog.Content
          className="fixed z-50 left-1/2 top-1/2 w-full max-w-md"
          style={{
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#12100E',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 12,
            padding: 0,
            boxShadow: '0 20px 25px rgba(0,0,0,0.25)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{ padding: '20px 24px', borderBottom: '1px solid rgba(212,160,23,0.08)' }}
          >
            <Dialog.Title
              className="flex items-center gap-2"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#F87171',
                fontFamily: 'var(--font-display)',
              }}
            >
              <Trash2 size={18} />
              Delete Tour
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B6560',
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            <p
              style={{
                fontSize: 14,
                color: '#A8A29E',
                fontFamily: 'var(--font-dmsans)',
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              Are you sure you want to delete <strong style={{ color: '#F5F3EF' }}>{tour.title}</strong>?
              This action cannot be undone. All scenes, hotspots, leads, and analytics data will be permanently removed.
            </p>

            {/* Tour info */}
            <div
              className="rounded-lg"
              style={{
                backgroundColor: '#1B1916',
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <div
                className="flex items-center gap-4"
                style={{ fontSize: 13, color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                <span className="flex items-center gap-1.5">
                  Status: <StatusBadge status={tour.status} />
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={13} /> {tour.viewCount.toLocaleString()} views
                </span>
              </div>
            </div>

            {/* Published warning */}
            {tour.status === 'published' && (
              <div
                className="flex items-start gap-2 rounded-lg"
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(251,191,36,0.06)',
                  border: '1px solid rgba(251,191,36,0.2)',
                  fontSize: 13,
                  color: '#FBBF24',
                  fontFamily: 'var(--font-dmsans)',
                  lineHeight: 1.5,
                }}
              >
                <AlertTriangle size={14} className="shrink-0" style={{ marginTop: 2 }} />
                This tour is currently live and accessible to visitors. Deleting it will immediately take it offline.
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3"
            style={{ padding: '16px 24px', borderTop: '1px solid rgba(212,160,23,0.08)' }}
          >
            <Dialog.Close asChild>
              <button
                className="font-medium transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  border: '1.5px solid rgba(212,160,23,0.3)',
                  borderRadius: 8,
                  padding: '8px 20px',
                  color: '#A8A29E',
                  fontSize: 14,
                  fontFamily: 'var(--font-dmsans)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D4A017'
                  e.currentTarget.style.color = '#F5F3EF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,160,23,0.3)'
                  e.currentTarget.style.color = '#A8A29E'
                }}
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 font-semibold transition-colors"
              style={{
                backgroundColor: deleting ? '#6B6560' : '#F87171',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 24px',
                fontSize: 14,
                fontFamily: 'var(--font-dmsans)',
                border: 'none',
                cursor: deleting ? 'not-allowed' : 'pointer',
              }}
            >
              {deleting ? (
                <>
                  <span
                    className="inline-block animate-spin rounded-full"
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF',
                    }}
                  />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete Tour
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Bulk Actions Bar ────────────────────────────────────────────────

function BulkActionsBar({
  count,
  onPublish,
  onArchive,
  onDelete,
  onClear,
}: {
  count: number
  onPublish: () => void
  onArchive: () => void
  onDelete: () => void
  onClear: () => void
}) {
  if (count === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-xl"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.2)',
        padding: '12px 20px',
        boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#D4A017',
          fontFamily: 'var(--font-dmsans)',
        }}
      >
        {count} selected
      </span>
      <div
        style={{ width: 1, height: 24, backgroundColor: 'rgba(212,160,23,0.15)' }}
      />
      <button
        onClick={onPublish}
        className="flex items-center gap-1.5 font-medium transition-colors"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: '#34D399',
          fontSize: 13,
          fontFamily: 'var(--font-dmsans)',
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(52,211,153,0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <ExternalLink size={14} />
        Publish
      </button>
      <button
        onClick={onArchive}
        className="flex items-center gap-1.5 font-medium transition-colors"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: '#A8A29E',
          fontSize: 13,
          fontFamily: 'var(--font-dmsans)',
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2E2A24'
          e.currentTarget.style.color = '#F5F3EF'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = '#A8A29E'
        }}
      >
        <Archive size={14} />
        Archive
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 font-medium transition-colors"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: '#F87171',
          fontSize: 13,
          fontFamily: 'var(--font-dmsans)',
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <Trash2 size={14} />
        Delete
      </button>
      <button
        onClick={onClear}
        className="flex items-center justify-center rounded-md transition-colors"
        style={{
          width: 28,
          height: 28,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#6B6560',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#F5F3EF'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#6B6560'
        }}
        aria-label="Clear selection"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ─── Sort Dropdown ───────────────────────────────────────────────────

function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (v: SortOption) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const current = SORT_OPTIONS.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 transition-colors"
        style={{
          backgroundColor: '#12100E',
          border: '1px solid rgba(212,160,23,0.15)',
          borderRadius: 8,
          padding: '8px 12px',
          color: '#A8A29E',
          fontSize: 13,
          fontFamily: 'var(--font-dmsans)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {current?.label}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50"
          style={{
            top: 40,
            minWidth: 160,
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            borderRadius: 8,
            padding: 4,
            boxShadow: '0 10px 15px rgba(0,0,0,0.2)',
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className="w-full text-left rounded-md transition-colors"
              style={{
                padding: '8px 10px',
                fontSize: 13,
                fontFamily: 'var(--font-dmsans)',
                color: opt.value === value ? '#D4A017' : '#F5F3EF',
                backgroundColor: opt.value === value ? 'rgba(212,160,23,0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) e.currentTarget.style.backgroundColor = '#2E2A24'
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════

function ToursPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ─── State ───────────────────────────────────────────────────────
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('created')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [tourToDelete, setTourToDelete] = useState<Tour | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ─── Convex data ─────────────────────────────────────────────────
  const tours = useQuery(api.tours.list, {
    status: activeStatus === 'all' ? undefined : activeStatus,
    search: debouncedSearch || undefined,
    sortBy: sortOption,
  })
  const stats = useQuery(api.tours.getStats)
  const removeTour = useMutation(api.tours.remove)
  const archiveTour = useMutation(api.tours.archive)
  const duplicateTour = useMutation(api.tours.duplicate)
  const bulkArchiveMutation = useMutation(api.tours.bulkArchive)
  const bulkDeleteMutation = useMutation(api.tours.bulkDelete)
  const bulkPublishMutation = useMutation(api.tours.bulkPublish)

  // ─── Debounced search ────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // ─── Persist view mode ───────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('spazeo-tours-viewmode')
    if (saved === 'grid' || saved === 'list') setViewMode(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('spazeo-tours-viewmode', viewMode)
  }, [viewMode])

  // ─── Auto-open create dialog from URL param ─────────────────────
  useEffect(() => {
    if (searchParams.get('create') === 'true' || searchParams.get('upload') === 'true') {
      setShowCreateDialog(true)
      router.replace('/tours', { scroll: false })
    }
  }, [searchParams, router])

  // ─── Clear selection on filter change ────────────────────────────
  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeStatus, debouncedSearch, sortOption])

  // ─── Handlers ────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleCopyLink = useCallback((tour: Tour) => {
    navigator.clipboard.writeText(`https://spazeo.io/tour/${tour.slug}`)
    setCopiedId(tour._id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleDuplicate = useCallback(
    async (tourId: Id<'tours'>) => {
      try {
        await duplicateTour({ tourId })
        toast.success('Tour duplicated')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to duplicate tour')
      }
    },
    [duplicateTour]
  )

  const handleArchive = useCallback(
    async (tourId: Id<'tours'>) => {
      try {
        await archiveTour({ tourId })
        toast.success('Tour archived')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to archive tour')
      }
    },
    [archiveTour]
  )

  const handleDelete = useCallback((tour: Tour) => {
    setTourToDelete(tour)
    setShowDeleteDialog(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!tourToDelete) return
    try {
      await removeTour({ tourId: tourToDelete._id })
      toast.success('Tour deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tour')
    }
    setTourToDelete(null)
  }, [tourToDelete, removeTour])

  const handleBulkArchive = useCallback(async () => {
    const ids = Array.from(selectedIds) as Id<'tours'>[]
    try {
      await bulkArchiveMutation({ tourIds: ids })
      setSelectedIds(new Set())
      toast.success(`${ids.length} tours archived`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive tours')
    }
  }, [selectedIds, bulkArchiveMutation])

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds) as Id<'tours'>[]
    try {
      await bulkDeleteMutation({ tourIds: ids })
      setSelectedIds(new Set())
      toast.success(`${ids.length} tours deleted`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tours')
    }
  }, [selectedIds, bulkDeleteMutation])

  const handleBulkPublish = useCallback(async () => {
    const ids = Array.from(selectedIds) as Id<'tours'>[]
    try {
      await bulkPublishMutation({ tourIds: ids })
      setSelectedIds(new Set())
      toast.success(`${ids.length} tours published`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish tours')
    }
  }, [selectedIds, bulkPublishMutation])

  const handleSelectAll = useCallback(() => {
    const list = (tours ?? []) as Tour[]
    if (selectedIds.size === list.length && list.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(list.map((t) => t._id)))
    }
  }, [tours, selectedIds.size])

  // ─── Computed ────────────────────────────────────────────────────
  const isLoading = tours === undefined
  const tourList = (tours ?? []) as Tour[]
  const filterCounts = stats ?? { total: 0, draft: 0, published: 0, archived: 0 }

  function getFilterCount(filter: StatusFilter): number {
    if (filter === 'all') return filterCounts.total
    return filterCounts[filter]
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div>
      {/* ─── Header Row ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between flex-wrap gap-4"
        style={{ marginBottom: 24 }}
      >
        {/* Left: Title + count */}
        <div className="flex items-center gap-3">
          <h1
            className="font-bold"
            style={{
              fontSize: 28,
              color: '#F5F3EF',
              fontFamily: 'var(--font-display)',
            }}
          >
            My Tours
          </h1>
          {stats && (
            <span
              className="inline-flex items-center justify-center rounded-full"
              style={{
                minWidth: 28,
                height: 24,
                padding: '0 8px',
                fontSize: 12,
                fontWeight: 600,
                color: '#D4A017',
                backgroundColor: 'rgba(212,160,23,0.1)',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              {stats.total}
            </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(212,160,23,0.15)' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 36,
                height: 36,
                backgroundColor: viewMode === 'grid' ? 'rgba(212,160,23,0.12)' : 'transparent',
                color: viewMode === 'grid' ? '#D4A017' : '#6B6560',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 36,
                height: 36,
                backgroundColor: viewMode === 'list' ? 'rgba(212,160,23,0.12)' : 'transparent',
                color: viewMode === 'list' ? '#D4A017' : '#6B6560',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>

          {/* Sort */}
          <SortDropdown value={sortOption} onChange={setSortOption} />

          {/* Search */}
          <div className="relative flex items-center" style={{ width: 240 }}>
            <Search
              size={16}
              className="absolute left-3 pointer-events-none"
              style={{ color: '#6B6560' }}
            />
            <input
              type="text"
              placeholder="Search tours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full outline-none text-sm transition-colors"
              style={{
                backgroundColor: '#12100E',
                border: '1px solid rgba(212,160,23,0.15)',
                borderRadius: 8,
                padding: '8px 12px 8px 36px',
                color: '#F5F3EF',
                fontFamily: 'var(--font-dmsans)',
                fontSize: 14,
                height: 38,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#D4A017'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,160,23,0.15)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 flex items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                  backgroundColor: '#2E2A24',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#A8A29E',
                }}
                aria-label="Clear search"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Create button */}
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 font-semibold text-sm whitespace-nowrap transition-colors"
            style={{
              backgroundColor: '#D4A017',
              color: '#0A0908',
              borderRadius: 8,
              padding: '0 16px',
              fontFamily: 'var(--font-dmsans)',
              fontSize: 14,
              height: 38,
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5B120'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#D4A017'
            }}
          >
            <Plus size={16} />
            New Tour
          </button>
        </div>
      </div>

      {/* ─── Filter Tabs ────────────────────────────────────────── */}
      <div
        style={{ borderBottom: '1px solid rgba(212,160,23,0.08)', marginBottom: 24 }}
      >
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((filter) => {
            const isActive = activeStatus === filter.value
            const count = getFilterCount(filter.value)
            return (
              <button
                key={filter.value}
                onClick={() => setActiveStatus(filter.value)}
                className="relative flex items-center gap-2 transition-colors"
                style={{
                  color: isActive ? '#D4A017' : '#6B6560',
                  fontFamily: 'var(--font-dmsans)',
                  fontSize: 14,
                  fontWeight: 500,
                  padding: '8px 16px 12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: isActive ? '2px solid #D4A017' : '2px solid transparent',
                }}
              >
                {filter.label}
                <span
                  className="inline-flex items-center justify-center rounded-full"
                  style={{
                    minWidth: 20,
                    height: 18,
                    padding: '0 5px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: isActive ? '#D4A017' : '#6B6560',
                    backgroundColor: isActive
                      ? 'rgba(212,160,23,0.1)'
                      : 'rgba(107,101,96,0.1)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Content ────────────────────────────────────────────── */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: '#12100E', border: '1px solid rgba(212,160,23,0.08)' }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )
      ) : tourList.length === 0 ? (
        <EmptyState
          activeStatus={activeStatus}
          hasSearch={!!debouncedSearch}
          onClearSearch={() => setSearchQuery('')}
          onCreateTour={() => setShowCreateDialog(true)}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 20 }}>
          {tourList.map((tour) => (
            <TourCard
              key={tour._id}
              tour={tour}
              isSelected={selectedIds.has(tour._id)}
              onToggleSelect={() => toggleSelect(tour._id)}
              onEdit={() => router.push(`/tours/${tour._id}/edit`)}
              onPreview={() => window.open(`/tour/${tour.slug}`, '_blank')}
              onCopyLink={() => handleCopyLink(tour)}
              onDuplicate={() => handleDuplicate(tour._id)}
              onArchive={() => handleArchive(tour._id)}
              onDelete={() => handleDelete(tour)}
            />
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: '#12100E',
            border: '1px solid rgba(212,160,23,0.08)',
          }}
        >
          {/* List header */}
          <div
            className="flex items-center gap-4"
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid rgba(212,160,23,0.08)',
              fontSize: 11,
              fontWeight: 600,
              color: '#6B6560',
              fontFamily: 'var(--font-dmsans)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <button
              onClick={handleSelectAll}
              className="flex items-center justify-center rounded shrink-0 transition-colors"
              style={{
                width: 20,
                height: 20,
                backgroundColor:
                  selectedIds.size === tourList.length && tourList.length > 0
                    ? '#D4A017'
                    : 'transparent',
                border:
                  selectedIds.size === tourList.length && tourList.length > 0
                    ? '2px solid #D4A017'
                    : '2px solid #6B6560',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              aria-label={
                selectedIds.size === tourList.length ? 'Deselect all' : 'Select all'
              }
            >
              {selectedIds.size === tourList.length && tourList.length > 0 && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6L5 8.5L9.5 3.5"
                    stroke="#0A0908"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {selectedIds.size > 0 &&
                selectedIds.size < tourList.length && (
                  <div
                    style={{
                      width: 8,
                      height: 2,
                      backgroundColor: '#D4A017',
                      borderRadius: 1,
                    }}
                  />
                )}
            </button>
            <div style={{ width: 64 }} />
            <div className="flex-1">Title</div>
            <div className="shrink-0">Status</div>
            <div className="shrink-0" style={{ minWidth: 80 }}>
              Views
            </div>
            <div className="shrink-0" style={{ width: 32 }} />
          </div>

          {tourList.map((tour) => (
            <TourRow
              key={tour._id}
              tour={tour}
              isSelected={selectedIds.has(tour._id)}
              onToggleSelect={() => toggleSelect(tour._id)}
              onEdit={() => router.push(`/tours/${tour._id}/edit`)}
              onPreview={() => window.open(`/tour/${tour.slug}`, '_blank')}
              onCopyLink={() => handleCopyLink(tour)}
              onDuplicate={() => handleDuplicate(tour._id)}
              onArchive={() => handleArchive(tour._id)}
              onDelete={() => handleDelete(tour)}
            />
          ))}
        </div>
      )}

      {/* ─── Copy Link Toast ────────────────────────────────────── */}
      {copiedId && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(52,211,153,0.3)',
            padding: '10px 16px',
            boxShadow: '0 10px 15px rgba(0,0,0,0.2)',
            fontSize: 13,
            color: '#34D399',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <Link2 size={14} />
          Link copied to clipboard
        </div>
      )}

      {/* ─── Bulk Actions ───────────────────────────────────────── */}
      <BulkActionsBar
        count={selectedIds.size}
        onPublish={handleBulkPublish}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* ─── Dialogs ────────────────────────────────────────────── */}
      <CreateTourDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <DeleteTourDialog
        tour={tourToDelete}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// PAGE EXPORT — Suspense boundary for useSearchParams (Next.js 15+)
// ═════════════════════════════════════════════════════════════════════

export default function ToursPage() {
  return (
    <Suspense fallback={<ToursPageSkeleton />}>
      <ToursPageContent />
    </Suspense>
  )
}

function ToursPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#1B1916]" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-[#1B1916]" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-lg bg-[#1B1916]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-[#1B1916]" />
        ))}
      </div>
    </div>
  )
}
