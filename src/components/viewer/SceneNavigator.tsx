'use client'

import { useState } from 'react'

/* eslint-disable @next/next/no-img-element */

interface SceneData {
  _id: string
  title: string
  imageUrl?: string | null
  thumbnailUrl?: string | null
  order: number
}

interface Props {
  scenes: SceneData[]
  activeSceneId: string | null
  onSceneChange: (sceneId: string) => void
}

export function SceneNavigator({ scenes, activeSceneId, onSceneChange }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

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
          const isActive = scene._id === activeSceneId
          const isHovered = hoveredId === scene._id
          const thumbSrc = scene.thumbnailUrl || scene.imageUrl

          return (
            <button
              key={scene._id}
              onClick={() => onSceneChange(scene._id)}
              onMouseEnter={() => setHoveredId(scene._id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={`Go to scene: ${scene.title}`}
              aria-pressed={isActive}
              className="relative w-20 h-14 rounded-lg overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-150 focus-visible:outline-none"
              style={{
                border: isActive
                  ? '2px solid #D4A017'
                  : isHovered
                    ? '2px solid rgba(255,255,255,0.3)'
                    : '2px solid transparent',
              }}
            >
              {thumbSrc ? (
                <img
                  src={thumbSrc}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: '#1B1916' }}
                >
                  <span
                    className="text-[10px] text-center px-1 leading-tight"
                    style={{ color: '#6B6560' }}
                  >
                    {scene.title}
                  </span>
                </div>
              )}

              {/* Hover tooltip with scene title */}
              {isHovered && (
                <div
                  className="absolute top-0 left-0 right-0 px-1 py-0.5 z-10"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                >
                  <span className="block text-[10px] text-white truncate leading-tight">
                    {scene.title}
                  </span>
                </div>
              )}

              {/* Active overlay tint */}
              {isActive && (
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default SceneNavigator
