'use client'

import { useState } from 'react'
import { Html } from '@react-three/drei'
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
