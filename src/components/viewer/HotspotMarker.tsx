'use client'

import { useState } from 'react'
import { Html } from '@react-three/drei'
import { Navigation, Info, Play, ExternalLink } from 'lucide-react'

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
}

interface Props {
  hotspot: HotspotData
  onClick: () => void
}

const TYPE_CONFIG = {
  navigation: { icon: Navigation, color: '#2DD4BF', label: 'Navigate' },
  info: { icon: Info, color: '#D4A017', label: 'Info' },
  media: { icon: Play, color: '#FB7A54', label: 'Media' },
  link: { icon: ExternalLink, color: '#8B5CF6', label: 'Link' },
}

export function HotspotMarker({ hotspot, onClick }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const config = TYPE_CONFIG[hotspot.type] ?? TYPE_CONFIG.navigation
  const IconComponent = config.icon

  return (
    <Html
      position={[hotspot.position.x, hotspot.position.y, hotspot.position.z]}
      center
      zIndexRange={[10, 0]}
    >
      <div className="relative flex flex-col items-center">
        {/* Tooltip label — shown on hover */}
        {isHovered && (hotspot.title || hotspot.tooltip || config.label) && (
          <div
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-[4px] text-xs font-medium shadow-lg pointer-events-none"
            style={{
              backgroundColor: 'rgba(10,9,8,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F5F3EF',
            }}
          >
            {hotspot.title || hotspot.tooltip || config.label}
          </div>
        )}

        {/* Marker button */}
        <button
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={hotspot.tooltip ?? config.label}
          className="relative w-9 h-9 flex items-center justify-center rounded-full shadow-lg transition-transform duration-150 hover:scale-110 focus-visible:outline-none"
          style={{
            backgroundColor: config.color,
            color: '#0A0908',
            cursor: 'pointer',
          }}
        >
          {/* Ping animation ring */}
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: `${config.color}40` }}
            aria-hidden="true"
          />
          <IconComponent size={16} strokeWidth={1.5} className="relative z-10" />
        </button>
      </div>
    </Html>
  )
}

export default HotspotMarker
