'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import Link from 'next/link'
import { Plus, Map, Clock, Layers, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, { bg: string; text: string; animate?: boolean }> = {
  uploading: { bg: 'rgba(251,191,36,0.12)', text: '#FBBF24' },
  extracting: { bg: 'rgba(45,212,191,0.12)', text: '#2DD4BF', animate: true },
  editing: { bg: 'rgba(212,160,23,0.12)', text: '#D4A017' },
  completed: { bg: 'rgba(52,211,153,0.12)', text: '#34D399' },
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function FloorPlansPage() {
  const projects = useQuery(api.floorPlanProjects.listByUser)
  const removeProject = useMutation(api.floorPlanProjects.remove)
  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<'floorPlanProjects'> | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (projectId: Id<'floorPlanProjects'>) => {
    setDeleting(true)
    try {
      await removeProject({ projectId })
      toast.success('Floor plan deleted')
    } catch (err) {
      toast.error('Failed to delete floor plan')
      console.error(err)
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
        >
          Floor Plans
        </h1>
        <Link
          href="/floor-plans/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <Plus size={16} strokeWidth={2} />
          New Floor Plan
        </Link>
      </div>

      {/* Loading state */}
      {projects === undefined && (
        <div className="flex items-center justify-center py-16">
          <div
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#D4A017', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {/* Empty state */}
      {projects !== undefined && projects.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{
            backgroundColor: '#12100E',
            border: '1px solid rgba(212,160,23,0.08)',
          }}
        >
          <Map size={48} style={{ color: '#2E2A24' }} strokeWidth={1.5} />
          <h2
            className="text-lg font-medium mt-4"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
          >
            No floor plans yet
          </h2>
          <p className="text-sm mt-1 mb-6" style={{ color: '#6B6560' }}>
            Upload a floor plan image or PDF to get started
          </p>
          <Link
            href="/floor-plans/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
            style={{
              backgroundColor: '#D4A017',
              color: '#0A0908',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            <Plus size={16} strokeWidth={2} />
            Upload Your First Floor Plan
          </Link>
        </div>
      )}

      {/* Project grid */}
      {projects !== undefined && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const statusStyle = STATUS_COLORS[project.status] ?? STATUS_COLORS.uploading

            const isConfirming = confirmDeleteId === project._id

            return (
              <div
                key={project._id}
                className="group relative rounded-xl p-5 transition-all duration-200 hover:border-[rgba(212,160,23,0.2)]"
                style={{
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.08)',
                }}
              >
                <Link
                  href={`/floor-plans/${project._id}/edit`}
                  className="block"
                >
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3
                      className="text-sm font-medium truncate"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
                    >
                      {project.name}
                    </h3>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium capitalize${statusStyle.animate ? ' animate-pulse' : ''}`}
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {project.status}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6B6560' }}>
                      <Layers size={12} strokeWidth={1.5} />
                      {project.floorCount} floor{project.floorCount > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6B6560' }}>
                      <Clock size={12} strokeWidth={1.5} />
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                </Link>

                {/* Delete button */}
                {isConfirming ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl"
                    style={{ backgroundColor: 'rgba(10,9,8,0.92)' }}
                  >
                    <p className="text-xs" style={{ color: '#A8A29E' }}>Delete this floor plan?</p>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1 text-xs rounded-md transition-colors"
                      style={{ color: '#A8A29E', border: '1px solid #2E2A24' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(project._id)}
                      disabled={deleting}
                      className="px-3 py-1 text-xs rounded-md font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#F87171', color: '#FFFFFF' }}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setConfirmDeleteId(project._id)
                    }}
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-150"
                    style={{ backgroundColor: 'rgba(248,113,113,0.1)' }}
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 size={14} strokeWidth={1.5} style={{ color: '#F87171' }} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
