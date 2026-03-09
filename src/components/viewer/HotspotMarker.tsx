'use client'

import { useState } from 'react'
import { Html } from '@react-three/drei'
import { Navigation, Info, Play, ExternalLink, ChevronRight, X } from 'lucide-react'

interface HotspotData {
  _id: string
  sceneId: string
  targetSceneId?: string
  type: 'navigation' | 'info' | 'media' | 'link'
  position: { x: number; y: number; z: number }
  tooltip?: string
  icon?: string
  content?: string
  title?: string
  description?: string
  imageUrl?: string | null
  visible?: boolean
}

interface Props {
  hotspot: HotspotData
  onClick: () => void
  isSelected?: boolean
}

const TYPE_CONFIG = {
  navigation: { icon: Navigation, color: '#2DD4BF', label: 'Navigate' },
  info: { icon: Info, color: '#D4A017', label: 'Info' },
  media: { icon: Play, color: '#FB7A54', label: 'Media' },
  link: { icon: ExternalLink, color: '#8B5CF6', label: 'Link' },
}

export function HotspotMarker({ hotspot, onClick, isSelected }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const config = TYPE_CONFIG[hotspot.type] ?? TYPE_CONFIG.navigation

  // Visibility toggle — return null to skip rendering hidden hotspots
  if (hotspot.visible === false) return null

  if (hotspot.type === 'navigation') {
    // Derive horizontal yaw angle from position on sphere
    const yawDeg = Math.round((Math.atan2(hotspot.position.x, -hotspot.position.z) * 180) / Math.PI)

    return (
      <Html
        position={[hotspot.position.x, hotspot.position.y, hotspot.position.z]}
        center
        zIndexRange={[10, 0]}
      >
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Tooltip label — shown on hover */}
          {isHovered && (hotspot.title || hotspot.tooltip) && (
            <div
              style={{
                position: 'absolute',
                top: -40,
                left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                pointerEvents: 'none',
                backgroundColor: 'rgba(10,9,8,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-dmsans)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
              }}
            >
              {hotspot.title || hotspot.tooltip}
            </div>
          )}

          {/* Gold pulse ring container */}
          <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer ring 1 — pulse animation */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid #D4A017',
                animation: 'hotspot-pulse 1.8s ease-out infinite',
              }}
            />
            {/* Outer ring 2 — staggered pulse */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid #D4A017',
                animation: 'hotspot-pulse 1.8s ease-out infinite',
                animationDelay: '0.6s',
              }}
            />
            {/* Inner button */}
            <button
              onClick={onClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              aria-label={hotspot.tooltip ?? hotspot.title ?? 'Navigate'}
              style={{
                position: 'relative',
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#D4A017',
                color: '#0A0908',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 150ms ease',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                animation: 'hotspot-pulse-inner 1.8s ease-in-out infinite',
                boxShadow: isSelected
                  ? '0 0 0 2px #2DD4BF, 0 0 12px rgba(45,212,191,0.4)'
                  : '0 4px 6px rgba(0,0,0,0.07)',
                outline: 'none',
              }}
            >
              <ChevronRight size={14} strokeWidth={2} style={{ transform: `rotate(${yawDeg}deg)` }} />
            </button>
          </div>
        </div>
      </Html>
    )
  }

  // Info / Media / Link types — popup card on click
  const IconComponent = config.icon

  return (
    <Html
      position={[hotspot.position.x, hotspot.position.y, hotspot.position.z]}
      center
      zIndexRange={[10, 0]}
    >
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Tooltip label — shown on hover (when popup is closed) */}
        {isHovered && !isPopupOpen && (hotspot.title || hotspot.tooltip || config.label) && (
          <div
            style={{
              position: 'absolute',
              top: -40,
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              pointerEvents: 'none',
              backgroundColor: 'rgba(10,9,8,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F5F3EF',
              fontFamily: 'var(--font-dmsans)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
            }}
          >
            {hotspot.title || hotspot.tooltip || config.label}
          </div>
        )}

        {/* Marker button */}
        <button
          onClick={() => setIsPopupOpen((prev) => !prev)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={hotspot.tooltip ?? hotspot.title ?? config.label}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: config.color,
            color: '#0A0908',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 150ms ease',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            boxShadow: isSelected
              ? '0 0 0 2px #2DD4BF, 0 0 12px rgba(45,212,191,0.4)'
              : '0 4px 6px rgba(0,0,0,0.07)',
            outline: 'none',
          }}
        >
          {/* Ping animation ring */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: `${config.color}40`,
              animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
          <IconComponent size={16} strokeWidth={1.5} style={{ position: 'relative', zIndex: 10 }} />
        </button>

        {/* Popup card */}
        {isPopupOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 52,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 240,
              backgroundColor: '#12100E',
              border: '1px solid rgba(212,160,23,0.2)',
              borderRadius: 8,
              padding: '12px 14px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              fontFamily: 'var(--font-dmsans)',
              zIndex: 20,
            }}
          >
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsPopupOpen(false) }}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#6B6560',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>

            {/* Title */}
            {(hotspot.title || hotspot.tooltip) && (
              <p style={{ color: '#F5F3EF', fontSize: 13, fontWeight: 600, margin: '0 0 6px', paddingRight: 20 }}>
                {hotspot.title || hotspot.tooltip}
              </p>
            )}

            {/* Description text */}
            {hotspot.description && (
              <p style={{ color: '#A8A29E', fontSize: 12, lineHeight: 1.5, margin: '0 0 8px' }}>
                {hotspot.description}
              </p>
            )}

            {/* Content: video player for media type, plain text for info type */}
            {!hotspot.description && hotspot.content && hotspot.type !== 'link' && (() => {
              if (hotspot.type === 'media' && hotspot.content) {
                const isYoutube = /youtube\.com|youtu\.be/.test(hotspot.content)
                const isVimeo = /vimeo\.com/.test(hotspot.content)
                if (isYoutube || isVimeo) {
                  // Build embed URL
                  let embedSrc = hotspot.content
                  if (isYoutube) {
                    const vidId = hotspot.content.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
                    if (vidId) embedSrc = `https://www.youtube.com/embed/${vidId}`
                  } else if (isVimeo) {
                    const vidId = hotspot.content.match(/vimeo\.com\/(\d+)/)?.[1]
                    if (vidId) embedSrc = `https://player.vimeo.com/video/${vidId}`
                  }
                  return (
                    <iframe
                      src={embedSrc}
                      style={{ width: '100%', height: 135, borderRadius: 6, marginBottom: 8, border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={hotspot.title || 'Video'}
                    />
                  )
                }
                // Direct video file URL (.mp4, .webm, .ogg)
                if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(hotspot.content)) {
                  return (
                    <video
                      src={hotspot.content}
                      controls
                      style={{ width: '100%', borderRadius: 6, marginBottom: 8, maxHeight: 160 }}
                    />
                  )
                }
                // Fallback: render as text if URL pattern not matched
                return (
                  <p style={{ color: '#A8A29E', fontSize: 12, lineHeight: 1.5, margin: '0 0 8px' }}>
                    {hotspot.content}
                  </p>
                )
              }
              // info type — plain text
              return (
                <p style={{ color: '#A8A29E', fontSize: 12, lineHeight: 1.5, margin: '0 0 8px' }}>
                  {hotspot.content}
                </p>
              )
            })()}

            {/* Image if provided */}
            {hotspot.imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={hotspot.imageUrl}
                alt={hotspot.title || ''}
                style={{ width: '100%', borderRadius: 6, marginBottom: 8, objectFit: 'cover', maxHeight: 120 }}
              />
            )}

            {/* External link if provided */}
            {hotspot.type === 'link' && hotspot.content && hotspot.content.startsWith('http') && (
              <a
                href={hotspot.content}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: '#D4A017',
                  fontSize: 12,
                  textDecoration: 'none',
                }}
              >
                Open link <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}
      </div>
    </Html>
  )
}

export default HotspotMarker
