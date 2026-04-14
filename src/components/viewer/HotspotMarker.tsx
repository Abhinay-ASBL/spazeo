'use client'

import { useState, useRef, useCallback } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import {
  Navigation,
  Info,
  Play,
  ExternalLink,
  ChevronRight,
  Home,
  Bed,
  Bath,
  Car,
  Wifi,
  Camera,
  Star,
  DollarSign,
  Ruler,
  Trees,
  Sun,
  Building2,
  Key,
} from 'lucide-react'
import { useViewerStore } from '@/hooks/useViewerStore'

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
  // Phase 6 fields
  iconName?: string
  panelLayout?: 'compact' | 'rich' | 'video'
  videoUrl?: string
  ctaLabel?: string
  ctaUrl?: string
  accentColor?: string
  markerStyle?: 'ring' | 'arrow' | 'dot' | 'label'
  lineHeight?: number
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

const ICON_REGISTRY: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  navigation: Navigation,
  info: Info,
  play: Play,
  link: ExternalLink,
  home: Home,
  bed: Bed,
  bath: Bath,
  car: Car,
  wifi: Wifi,
  camera: Camera,
  star: Star,
  price: DollarSign,
  area: Ruler,
  garden: Trees,
  balcony: Sun,
  building: Building2,
  key: Key,
}

/* ── LabelMarker ─────────────────────────────────────────────────────────
 * Separate component so hooks (useFrame, useThree) are always called at
 * the component top level, not inside a conditional.
 *
 * Spring physics:
 *   springPos/springVel drive opacity + scale.
 *   When a hotspot enters camera view the spring overshoots slightly,
 *   creating a natural "pop" bounce.  When the camera rotates away the
 *   spring decays to 0 (auto-hide).
 * ─────────────────────────────────────────────────────────────────────── */
function LabelMarker({
  hotspot,
  config,
  onClick,
}: {
  hotspot: HotspotData
  config: (typeof TYPE_CONFIG)[keyof typeof TYPE_CONFIG]
  onClick: () => void
}) {
  const { camera } = useThree()
  const setActiveHotspot = useViewerStore((s) => s.setActiveHotspot)
  const [isHovered, setIsHovered] = useState(false)

  const wrapRef   = useRef<HTMLDivElement>(null)
  const springPos = useRef(0)   // current animated value  0→1
  const springVel = useRef(0)   // velocity (for spring overshoot)
  const hotVec    = useRef(new Vector3(hotspot.position.x, hotspot.position.y, hotspot.position.z))

  const labelColor   = hotspot.accentColor || config.color
  const displayTitle = hotspot.title || hotspot.tooltip
  const displaySub   = hotspot.description || hotspot.content

  // Per-frame spring update — no React state, direct DOM mutation for performance
  useFrame((_, delta) => {
    if (!wrapRef.current) return

    // Camera direction (from camera toward sphere center)
    const camDir = camera.position.clone().normalize().negate()
    const dot    = camDir.dot(hotVec.current.clone().normalize())

    // Target: fully visible when dot > 0.30 (≈72° from cam center)
    //         start fading in at dot > 0.10
    const target = dot > 0.10 ? Math.min(1, (dot - 0.10) / 0.35) : 0

    // Frame-rate-independent spring step
    const dt          = Math.min(delta, 0.05) * 60          // normalize to 60 fps
    const stiffness   = 0.18 * dt
    const damping     = 0.72

    springVel.current += (target - springPos.current) * stiffness
    springVel.current *= damping
    springPos.current  = Math.max(0, springPos.current + springVel.current)

    const s       = springPos.current
    // Scale: ease-out-back gives the "pop" overshoot on enter
    const scale   = 0.3 + 0.7 * (s < 1 ? s * s * (3 - 2 * s) : s)  // smoothstep but allows >1
    const opacity = Math.min(1, s * s)

    wrapRef.current.style.opacity        = opacity.toFixed(3)
    wrapRef.current.style.transform      = `scale(${scale.toFixed(3)})`
    wrapRef.current.style.pointerEvents  = s > 0.35 ? 'auto' : 'none'
  })

  const handleClick = useCallback(() => {
    if (hotspot.type === 'navigation') {
      onClick()
    } else {
      setActiveHotspot(hotspot._id)
    }
  }, [hotspot.type, hotspot._id, onClick, setActiveHotspot])

  const lineHeight = typeof hotspot.lineHeight === 'number' ? hotspot.lineHeight : 32
  const DOT_SIZE = 14
  const DOT_HALF = DOT_SIZE / 2

  return (
    <Html
      position={[hotspot.position.x, hotspot.position.y, hotspot.position.z]}
      zIndexRange={[10, 0]}
    >
      {/*
        Callout layout — the DOT sits exactly at the click point, a vertical
        line rises from the dot's top edge, and the label pill sits on top
        of the line. The whole structure is anchored from a zero-size div so
        children positioned with `bottom:` and `transform: translate(-50%…)`
        measure from the click point (0,0 in this local box).
      */}
      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          width: 0,
          height: 0,
          opacity: 0,
          transform: 'scale(0.3)',
          transformOrigin: '0 0', // scale out from the click point
          pointerEvents: 'none',
        }}
      >
        {/* Anchor dot — center at (0, 0) = click point */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: DOT_SIZE,
          height: DOT_SIZE,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}>
          {/* Pulse ring */}
          <span style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: `1.5px solid ${labelColor}`,
            animation: 'hotspot-pulse 2s ease-out infinite',
          }} />
          {/* Solid dot */}
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: labelColor,
            border: '2px solid rgba(255,255,255,0.9)',
            boxShadow: `0 0 0 2px ${labelColor}60, 0 2px 6px rgba(0,0,0,0.5)`,
          }} />
        </div>

        {/* Connecting line — bottom touches the dot's top edge, goes up */}
        <div style={{
          position: 'absolute',
          left: 0,
          bottom: DOT_HALF,
          width: 1.5,
          height: lineHeight,
          transform: 'translateX(-50%)',
          background: `linear-gradient(to top, ${labelColor}DD, ${labelColor}60)`,
          pointerEvents: 'none',
        }} />

        {/* Label pill — sits directly above the top of the line */}
        <div style={{
          position: 'absolute',
          left: 0,
          bottom: DOT_HALF + lineHeight,
          transform: 'translateX(-50%)',
        }}>
          <button
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={displayTitle ?? config.label}
            style={{
              background: `linear-gradient(135deg, ${labelColor}F5 0%, ${labelColor}CC 100%)`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 9999,
              padding: displaySub ? '6px 14px 5px' : '7px 14px',
              cursor: 'pointer',
              outline: 'none',
              transition: 'box-shadow 180ms ease, transform 180ms ease',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: isHovered
                ? `0 8px 24px rgba(0,0,0,0.55), 0 0 0 1.5px ${labelColor}80`
                : `0 3px 14px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
              maxWidth: 200,
              minWidth: 80,
              textAlign: 'center',
            }}
          >
            {displayTitle && (
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'var(--font-dmsans)',
                lineHeight: 1.35,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 185,
                display: 'block',
                letterSpacing: '0.01em',
              }}>
                {displayTitle}
              </span>
            )}
            {displaySub && (
              <span style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.88)',
                fontFamily: 'var(--font-dmsans)',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 185,
                display: 'block',
                marginTop: 1,
              }}>
                {displaySub}
              </span>
            )}
          </button>
        </div>
      </div>
    </Html>
  )
}

export function HotspotMarker({ hotspot, onClick, isSelected }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const setActiveHotspot = useViewerStore((s) => s.setActiveHotspot)
  const config = TYPE_CONFIG[hotspot.type] ?? TYPE_CONFIG.navigation
  const IconComponent = hotspot.iconName
    ? (ICON_REGISTRY[hotspot.iconName] ?? (hotspot.type === 'navigation' ? ChevronRight : config.icon))
    : hotspot.type === 'navigation'
      ? ChevronRight
      : config.icon
  const markerColor = hotspot.accentColor ?? config.color

  // Visibility toggle — return null to skip rendering hidden hotspots
  if (hotspot.visible === false) return null

  /* ── Label style OR info type — pill anchored at click point ── */
  if (hotspot.markerStyle === 'label' || hotspot.type === 'info') {
    return <LabelMarker hotspot={hotspot} config={config} onClick={onClick} />
  }

  if (hotspot.type === 'navigation') {
    // Derive horizontal yaw angle from position on sphere
    const yawDeg = Math.round((Math.atan2(hotspot.position.x, -hotspot.position.z) * 180) / Math.PI)
    const navStyle = hotspot.markerStyle ?? 'ring'

    // --- dot style ---
    if (navStyle === 'dot') {
      return (
        <Html
          position={[hotspot.position.x, hotspot.position.y, hotspot.position.z]}
          center
          zIndexRange={[10, 0]}
        >
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            <button
              onClick={onClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              aria-label={hotspot.tooltip ?? hotspot.title ?? 'Navigate'}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: markerColor,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'hotspot-pulse-inner 2.4s ease-in-out infinite',
                boxShadow: `0 0 0 4px ${markerColor}30`,
                outline: 'none',
              }}
            />
          </div>
        </Html>
      )
    }

    // --- arrow style ---
    if (navStyle === 'arrow') {
      return (
        <Html
          position={[hotspot.position.x, hotspot.position.y, hotspot.position.z]}
          center
          zIndexRange={[10, 0]}
        >
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            <button
              onClick={onClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              aria-label={hotspot.tooltip ?? hotspot.title ?? 'Navigate'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: markerColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                outline: 'none',
              }}
            >
              <IconComponent size={28} strokeWidth={2} style={{ transform: `rotate(${yawDeg}deg)` }} />
            </button>
          </div>
        </Html>
      )
    }

    // --- ring style (default) ---
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
                border: `2px solid ${markerColor}`,
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
                border: `2px solid ${markerColor}`,
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
                backgroundColor: markerColor,
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
              <IconComponent size={14} strokeWidth={2} style={{ transform: `rotate(${yawDeg}deg)` }} />
            </button>
          </div>
        </div>
      </Html>
    )
  }

  // Info / Media / Link types — delegate panel open to Zustand store
  return (
    <Html
      position={[hotspot.position.x, hotspot.position.y, hotspot.position.z]}
      center
      zIndexRange={[10, 0]}
    >
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Tooltip label — shown on hover */}
        {isHovered && (hotspot.title || hotspot.tooltip || config.label) && (
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
          onClick={() => setActiveHotspot(hotspot._id)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={hotspot.tooltip ?? hotspot.title ?? config.label}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: markerColor,
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
              backgroundColor: `${markerColor}40`,
              animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
          <IconComponent size={16} strokeWidth={1.5} style={{ position: 'relative', zIndex: 10 }} />
        </button>
      </div>
    </Html>
  )
}

export default HotspotMarker
