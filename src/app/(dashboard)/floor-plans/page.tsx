'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import Link from 'next/link'
import { Plus, Map, Clock, Layers } from 'lucide-react'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  uploading: { bg: 'rgba(251,191,36,0.12)', text: '#FBBF24' },
  extracting: { bg: 'rgba(45,212,191,0.12)', text: '#2DD4BF' },
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

            return (
              <Link
                key={project._id}
                href={`/floor-plans`}
                className="rounded-xl p-5 transition-all duration-200 hover:border-[rgba(212,160,23,0.2)]"
                style={{
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.08)',
                }}
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
                    className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium capitalize"
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
            )
          })}
        </div>
      )}
    </div>
  )
}
