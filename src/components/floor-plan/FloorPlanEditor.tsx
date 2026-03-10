'use client'

import { useEffect, useCallback, useState, lazy, Suspense } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useFloorPlanEditorStore, type FloorPlanGeometry } from '@/stores/floorPlanEditorStore'
import { DrawingToolbar } from './DrawingToolbar'
import { EditorMiniMap } from './EditorMiniMap'
import { OriginalOverlay } from './OriginalOverlay'
import { PropertiesPanel } from './PropertiesPanel'
import { VersionHistory } from './VersionHistory'
import toast from 'react-hot-toast'

const DiagramCanvas = lazy(() =>
  import('./DiagramCanvas').then((m) => ({ default: m.DiagramCanvas }))
)

interface FloorPlanEditorProps {
  geometry: FloorPlanGeometry
  imageUrl: string
  floorPlanId: Id<'floorPlanDetails'>
}

export function FloorPlanEditor({ geometry, imageUrl, floorPlanId }: FloorPlanEditorProps) {
  const setGeometry = useFloorPlanEditorStore((s) => s.setGeometry)
  const currentGeometry = useFloorPlanEditorStore((s) => s.geometry)
  const isDirty = useFloorPlanEditorStore((s) => s.isDirty)
  const undo = useFloorPlanEditorStore((s) => s.undo)
  const redo = useFloorPlanEditorStore((s) => s.redo)
  const [isSaving, setIsSaving] = useState(false)
  const [showProperties, setShowProperties] = useState(true)

  const updateGeometry = useMutation(api.floorPlanDetails.updateGeometry)
  const resetToAi = useMutation(api.floorPlanDetails.resetToAiVersion)

  // Initialize store with geometry from props
  useEffect(() => {
    setGeometry(geometry)
  }, [geometry, setGeometry])

  // Unsaved changes warning on page leave
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await updateGeometry({
        floorPlanId,
        geometry: currentGeometry,
      })
      useFloorPlanEditorStore.setState({ isDirty: false })
      toast.success('Floor plan saved')
    } catch (err) {
      console.error('Failed to save floor plan:', err)
      toast.error('Failed to save floor plan')
    } finally {
      setIsSaving(false)
    }
  }, [floorPlanId, currentGeometry, updateGeometry])

  // Keyboard shortcuts (Undo/Redo + Ctrl+S save)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey
      if (isCtrl && e.key === 's') {
        e.preventDefault()
        if (isDirty && !isSaving) {
          handleSave()
        }
      } else if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (isCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      } else if (isCtrl && e.key === 'Z') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, isDirty, isSaving, handleSave])

  const handleReset = useCallback(async () => {
    try {
      const result = await resetToAi({ floorPlanId })
      if (result && typeof result === 'object' && 'geometry' in result) {
        setGeometry(result.geometry as FloorPlanGeometry)
        toast.success('Restored to AI extraction')
      }
    } catch (err) {
      console.error('Failed to reset to AI version:', err)
      toast.error('Failed to reset to AI version')
    }
  }, [floorPlanId, resetToAi, setGeometry])

  const handleVersionRestore = useCallback(
    async (restoredGeometry: FloorPlanGeometry) => {
      // Save current geometry first (as new version), then restore selected version
      if (isDirty) {
        try {
          await updateGeometry({
            floorPlanId,
            geometry: currentGeometry,
          })
        } catch {
          // Non-blocking: current save failed but proceed with restore
        }
      }
      setGeometry(restoredGeometry)
      toast.success('Version restored')
    },
    [isDirty, updateGeometry, floorPlanId, currentGeometry, setGeometry]
  )

  return (
    <div className="flex flex-col h-full bg-[#0A0908]">
      {/* Toolbar */}
      <DrawingToolbar onSave={handleSave} onReset={handleReset} isSaving={isSaving} />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Split view */}
        <div className="flex flex-1 min-w-0">
          {/* Left: Original image with overlay */}
          <div className="flex-1 min-w-0 border-r border-[#2E2A24] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#12100E] border-b border-[#2E2A24]">
              <span className="text-xs font-medium text-[#6B6560] uppercase tracking-wider">Original</span>
            </div>
            <div className="relative h-[calc(100%-32px)]">
              <OriginalOverlay imageUrl={imageUrl} />
            </div>
          </div>

          {/* Right: Editable diagram */}
          <div className="flex-1 min-w-0 overflow-hidden relative">
            <div className="px-3 py-1.5 bg-[#12100E] border-b border-[#2E2A24]">
              <span className="text-xs font-medium text-[#6B6560] uppercase tracking-wider">Editable Diagram</span>
            </div>
            <div className="relative h-[calc(100%-32px)]">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full text-[#6B6560] text-sm">
                    Loading editor...
                  </div>
                }
              >
                <DiagramCanvas />
              </Suspense>
              <EditorMiniMap />
            </div>
          </div>
        </div>

        {/* Properties + Version History panel */}
        {showProperties && (
          <div className="w-[280px] flex-shrink-0 border-l border-[#2E2A24] overflow-y-auto bg-[#12100E] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <PropertiesPanel />
            </div>
            <VersionHistory
              floorPlanId={floorPlanId}
              onRestore={handleVersionRestore}
            />
          </div>
        )}
      </div>

      {/* Properties toggle */}
      <button
        onClick={() => setShowProperties(!showProperties)}
        className="absolute top-14 right-2 z-10 p-1 rounded bg-[#1B1916] border border-[#2E2A24] text-[#6B6560] hover:text-[#F5F3EF] text-xs"
        aria-label={showProperties ? 'Hide properties' : 'Show properties'}
      >
        {showProperties ? 'Hide' : 'Props'}
      </button>
    </div>
  )
}
