/* eslint-disable @next/next/no-img-element */
'use client'

import { motion } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'

interface HotspotData {
  _id: string
  type: 'info' | 'media' | 'link' | 'navigation'
  title?: string
  description?: string
  content?: string
  imageUrl?: string | null
  iconName?: string
  panelLayout?: 'compact' | 'rich' | 'video'
  ctaLabel?: string
  ctaUrl?: string
  accentColor?: string
  targetSceneId?: string
}

interface Props {
  hotspot: HotspotData
  onClose: () => void
  onNavigate?: (targetSceneId: string) => void
  targetSceneTitle?: string
}

export function HotspotInfoPanel({ hotspot, onClose, onNavigate, targetSceneTitle }: Props) {
  // Navigation hotspots do not support video panel layout — fall back to compact
  const effectivePanelLayout =
    hotspot.type === 'navigation' && hotspot.panelLayout === 'video'
      ? 'compact'
      : hotspot.panelLayout

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed sm:right-0 sm:top-0 sm:h-full sm:w-80 inset-x-0 bottom-0 sm:bottom-auto max-h-[75vh] sm:max-h-full overflow-y-auto z-50"
      style={{
        backgroundColor: '#12100E',
        borderLeft: '1px solid rgba(212,160,23,0.15)',
        fontFamily: 'var(--font-dmsans)',
        padding: '24px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2
          style={{
            color: '#F5F3EF',
            fontSize: 15,
            fontWeight: 600,
            margin: 0,
            paddingRight: 8,
          }}
        >
          {hotspot.title}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6B6560',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Image — skip in compact layout for navigation, or show when layout allows */}
      {hotspot.imageUrl && effectivePanelLayout !== 'compact' && (
        <img
          src={hotspot.imageUrl}
          alt={hotspot.title || 'Hotspot image'}
          style={{
            width: '100%',
            borderRadius: 8,
            objectFit: 'cover',
            maxHeight: 180,
            marginTop: 16,
            marginBottom: 12,
          }}
        />
      )}

      {/* Image — compact layout still shows image when present */}
      {hotspot.imageUrl && effectivePanelLayout === 'compact' && (
        <img
          src={hotspot.imageUrl}
          alt={hotspot.title || 'Hotspot image'}
          style={{
            width: '100%',
            borderRadius: 8,
            objectFit: 'cover',
            maxHeight: 180,
            marginTop: 16,
            marginBottom: 12,
          }}
        />
      )}

      {/* Description */}
      {hotspot.description && (
        <p style={{ color: '#A8A29E', fontSize: 13, lineHeight: 1.6, margin: '12px 0 0' }}>
          {hotspot.description}
        </p>
      )}

      {/* Content text (info type only) */}
      {hotspot.content && hotspot.type === 'info' && (
        <p style={{ color: '#A8A29E', fontSize: 13, lineHeight: 1.6, margin: '12px 0 0' }}>
          {hotspot.content}
        </p>
      )}

      {/* External link (link type with http content) */}
      {hotspot.type === 'link' && hotspot.content && hotspot.content.startsWith('http') && (
        <a
          href={hotspot.content}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            color: '#2DD4BF',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={14} /> Visit Link
        </a>
      )}

      {/* CTA button */}
      {hotspot.ctaLabel && hotspot.ctaUrl && (
        <a
          href={hotspot.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 20,
            height: 40,
            borderRadius: 8,
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          {hotspot.ctaLabel}
        </a>
      )}

      {/* Go-to button for navigation hotspots */}
      {hotspot.type === 'navigation' && onNavigate && hotspot.targetSceneId && (
        <button
          onClick={() => onNavigate(hotspot.targetSceneId!)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 12,
            height: 40,
            width: '100%',
            borderRadius: 8,
            backgroundColor: '#2DD4BF',
            color: '#0A0908',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          Go to {targetSceneTitle ?? 'Next Room'} &rarr;
        </button>
      )}
    </motion.div>
  )
}
