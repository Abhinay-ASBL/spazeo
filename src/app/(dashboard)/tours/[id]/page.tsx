'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
/* eslint-disable @next/next/no-img-element */
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  Pencil,
  Share2,
  Trash2,
  Eye,
  Globe,
  ImageIcon,
  Loader2,
  Clock,
  Users,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { ShareDialog } from '@/components/tour/ShareDialog'

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  draft: { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
  published: { color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  archived: { color: '#6B6560', bg: 'rgba(107,101,96,0.1)' },
}

export default function TourDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tourId = params.id as Id<'tours'>

  const tour = useQuery(api.tours.getById, { tourId })
  const scenes = useQuery(api.scenes.listByTour, { tourId })
  const leads = useQuery(api.leads.listByTour, { tourId })
  const removeTour = useMutation(api.tours.remove)

  const [deleting, setDeleting] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this tour? This cannot be undone.')) return
    setDeleting(true)
    try {
      await removeTour({ tourId })
      toast.success('Tour deleted')
      router.push('/tours')
    } catch {
      toast.error('Failed to delete tour')
      setDeleting(false)
    }
  }, [removeTour, tourId, router])

  if (tour === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    )
  }

  if (tour === null) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
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

  const sceneList = scenes ?? []
  const statusStyle = STATUS_STYLES[tour.status] ?? STATUS_STYLES.draft
  const coverScene = sceneList.find((s) => s._id === tour.coverSceneId) ?? sceneList[0]

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/tours" className="flex items-center justify-center" aria-label="Back to tours">
            <ArrowLeft size={20} style={{ color: '#A8A29E' }} />
          </Link>
          <h1
            className="text-[24px] font-bold"
            style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
          >
            {tour.title}
          </h1>
          <span
            className="text-[12px] font-medium px-3 py-1 rounded-full capitalize"
            style={{
              color: statusStyle.color,
              backgroundColor: statusStyle.bg,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {tour.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/tours/${tourId}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{
              color: '#F5F3EF',
              border: '1px solid rgba(212,160,23,0.2)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            <Pencil size={14} /> Edit
          </Link>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
            style={{
              color: '#F5F3EF',
              border: '1px solid rgba(212,160,23,0.2)',
              fontFamily: 'var(--font-dmsans)',
              backgroundColor: 'transparent',
            }}
          >
            <Share2 size={14} /> Share
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-50"
            style={{
              color: '#F87171',
              border: '1px solid rgba(248,113,113,0.1)',
              fontFamily: 'var(--font-dmsans)',
              backgroundColor: 'transparent',
            }}
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Views', value: (tour.viewCount ?? 0).toLocaleString(), icon: Eye },
          { label: 'Scenes', value: sceneList.length.toString(), icon: ImageIcon },
          { label: 'Status', value: tour.status, icon: tour.status === 'published' ? Globe : Clock },
          {
            label: 'Created',
            value: new Date(tour._creationTime).toLocaleDateString(),
            icon: Clock,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1"
            style={{
              backgroundColor: '#12100E',
              border: '1px solid rgba(212,160,23,0.12)',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[12px]"
                style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
              >
                {stat.label}
              </span>
              <stat.icon size={14} style={{ color: '#6B6560' }} />
            </div>
            <span
              className="text-[24px] font-bold capitalize"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Two Columns: Preview + Scenes ── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left — Preview */}
        <div className="flex-1 flex flex-col gap-3">
          <h2
            className="text-[16px] font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
          >
            Preview
          </h2>
          <div
            className="relative overflow-hidden"
            style={{ height: '300px', borderRadius: '12px', backgroundColor: '#12100E' }}
          >
            {coverScene?.imageUrl ? (
              <img
                src={coverScene.imageUrl}
                alt={`Preview of ${tour.title}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ImageIcon size={40} style={{ color: '#6B6560', margin: '0 auto 8px' }} />
                  <p className="text-sm" style={{ color: '#6B6560' }}>No scenes uploaded yet</p>
                </div>
              </div>
            )}
            {tour.status === 'published' && tour.slug && (
              <Link
                href={`/tour/${tour.slug}`}
                target="_blank"
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: 'rgba(10,9,8,0.8)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(212,160,23,0.2)',
                  color: '#D4A017',
                }}
              >
                <Eye size={13} /> View Live
              </Link>
            )}
          </div>
          {tour.description && (
            <p
              className="text-sm mt-1"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              {tour.description}
            </p>
          )}
        </div>

        {/* Right — Scenes */}
        <div className="flex flex-col gap-3 w-full lg:w-[300px] lg:min-w-[300px]">
          <div className="flex items-center justify-between">
            <h2
              className="text-[16px] font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
            >
              Scenes ({sceneList.length})
            </h2>
            <Link
              href={`/tours/${tourId}/edit`}
              className="text-[12px] font-medium"
              style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
            >
              Manage
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {sceneList.length === 0 && (
              <div
                className="rounded-lg py-8 text-center"
                style={{
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.12)',
                }}
              >
                <ImageIcon size={24} style={{ color: '#6B6560', margin: '0 auto 8px' }} />
                <p className="text-xs" style={{ color: '#6B6560' }}>
                  No scenes yet.{' '}
                  <Link
                    href={`/tours/${tourId}/edit`}
                    className="underline"
                    style={{ color: '#D4A017' }}
                  >
                    Upload panoramas
                  </Link>
                </p>
              </div>
            )}
            {sceneList.map((scene) => (
              <div
                key={scene._id}
                className="flex items-center gap-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.12)',
                  padding: '10px',
                }}
              >
                <div
                  className="relative overflow-hidden flex-shrink-0"
                  style={{ width: '48px', height: '48px', borderRadius: '8px' }}
                >
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
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
                <div className="flex flex-col gap-0.5">
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {scene.title}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                  >
                    Scene {scene.order + 1}
                    {scene.roomType ? ` · ${scene.roomType}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Leads ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: '#D4A017' }} />
            <h2
              className="text-[16px] font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
            >
              Recent Leads
            </h2>
          </div>
          <Link
            href={`/leads?tour=${tourId}`}
            className="text-[12px] font-medium"
            style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
          >
            View All
          </Link>
        </div>

        {(!leads || leads.length === 0) ? (
          <div
            className="rounded-lg py-8 text-center"
            style={{
              backgroundColor: '#12100E',
              border: '1px solid rgba(212,160,23,0.12)',
              borderRadius: '10px',
            }}
          >
            <Users size={24} style={{ color: '#6B6560', margin: '0 auto 8px' }} />
            <p
              className="text-sm"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              No leads captured yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {leads.slice(0, 5).map((lead) => (
              <div
                key={lead._id}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.12)',
                  borderRadius: '10px',
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {lead.name}
                  </span>
                  <span
                    className="text-[12px]"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {lead.email}
                  </span>
                </div>
                <span
                  className="text-[11px]"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  {new Date(lead._creationTime).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Dialog */}
      {tour.slug && (
        <ShareDialog
          tourSlug={tour.slug}
          tourTitle={tour.title}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}
