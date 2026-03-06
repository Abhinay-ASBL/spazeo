'use client'

import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { GripVertical, Image, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Scene {
  _id: Id<'scenes'>
  title: string
  order: number
  imageUrl: string | null
  thumbnailUrl: string | null
}

interface SceneListProps {
  scenes: Scene[]
  tourId: Id<'tours'>
}

export function SceneList({ scenes, tourId }: SceneListProps) {
  const removeScene = useMutation(api.scenes.remove)

  const handleDelete = async (sceneId: Id<'scenes'>, title: string) => {
    try {
      await removeScene({ sceneId })
      toast.success(`Removed "${title}"`)
    } catch {
      toast.error('Failed to remove scene')
    }
  }

  return (
    <div className="space-y-2">
      {scenes.map((scene, index) => {
        const sceneNumber = String(index + 1).padStart(2, '0')

        return (
          <div
            key={scene._id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl group transition-colors duration-150',
              'hover:bg-[rgba(212,160,23,0.04)]'
            )}
            style={{
              backgroundColor: '#12100E',
              border: '1px solid rgba(212,160,23,0.08)',
            }}
          >
            <GripVertical
              size={16}
              strokeWidth={1.5}
              className="shrink-0 cursor-grab"
              style={{ color: '#3D3830' }}
            />

            <div
              className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{
                backgroundColor: '#1B1916',
                border: '1px solid rgba(212,160,23,0.06)',
              }}
            >
              {scene.thumbnailUrl || scene.imageUrl ? (
                <img
                  src={(scene.thumbnailUrl || scene.imageUrl)!}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Image size={14} strokeWidth={1.5} style={{ color: '#3D3830' }} />
              )}
            </div>

            <span
              className="text-sm font-medium truncate flex-1"
              style={{ color: '#F5F3EF' }}
            >
              {scene.title}
            </span>

            <span className="text-[10px] shrink-0" style={{ color: '#5A5248' }}>
              {sceneNumber}
            </span>

            <button
              type="button"
              aria-label={`Delete scene: ${scene.title}`}
              onClick={() => handleDelete(scene._id, scene.title)}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <Trash2
                size={14}
                strokeWidth={1.5}
                className="hover:text-red-400 transition-colors"
                style={{ color: '#5A5248' }}
              />
            </button>
          </div>
        )
      })}
    </div>
  )
}
