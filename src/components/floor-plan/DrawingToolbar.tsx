'use client'

import { MousePointer2, Minus, Square, DoorOpen, AppWindow, Eraser, Undo2, Redo2, Save, RotateCcw } from 'lucide-react'
import { useFloorPlanEditorStore, type EditorTool } from '@/stores/floorPlanEditorStore'
import { useState } from 'react'

const TOOLS: { id: EditorTool; label: string; icon: typeof MousePointer2; shortcut?: string }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, shortcut: 'V' },
  { id: 'wall', label: 'Wall', icon: Minus, shortcut: 'W' },
  { id: 'room', label: 'Room', icon: Square, shortcut: 'R' },
  { id: 'door', label: 'Door', icon: DoorOpen, shortcut: 'D' },
  { id: 'window', label: 'Window', icon: AppWindow },
  { id: 'eraser', label: 'Eraser', icon: Eraser, shortcut: 'E' },
]

interface DrawingToolbarProps {
  onSave: () => void
  onReset: () => void
  isSaving?: boolean
}

export function DrawingToolbar({ onSave, onReset, isSaving }: DrawingToolbarProps) {
  const activeTool = useFloorPlanEditorStore((s) => s.activeTool)
  const setActiveTool = useFloorPlanEditorStore((s) => s.setActiveTool)
  const undo = useFloorPlanEditorStore((s) => s.undo)
  const redo = useFloorPlanEditorStore((s) => s.redo)
  const undoStack = useFloorPlanEditorStore((s) => s.undoStack)
  const redoStack = useFloorPlanEditorStore((s) => s.redoStack)
  const isDirty = useFloorPlanEditorStore((s) => s.isDirty)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-[#12100E] border-b border-[#2E2A24]">
      {/* Tool buttons */}
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          const isActive = activeTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#D4A017] text-[#0A0908]'
                  : 'text-[#A8A29E] hover:text-[#F5F3EF] hover:bg-[#1B1916]'
              }`}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              aria-label={tool.label}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="hidden sm:inline">{tool.label}</span>
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[#2E2A24] mx-2" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#F5F3EF] hover:bg-[#1B1916] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#F5F3EF] hover:bg-[#1B1916] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save status */}
      <span className={`text-xs mr-3 ${isDirty ? 'text-[#FBBF24]' : 'text-[#6B6560]'}`}>
        {isDirty ? 'Unsaved changes' : 'Saved'}
      </span>

      {/* Reset button */}
      <div className="relative">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#A8A29E] hover:text-[#F5F3EF] hover:bg-[#1B1916] transition-colors"
          aria-label="Reset to AI result"
        >
          <RotateCcw size={14} strokeWidth={1.5} />
          <span className="hidden sm:inline">Reset to AI</span>
        </button>
        {showResetConfirm && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-[#1B1916] border border-[#2E2A24] rounded-lg p-3 shadow-lg w-64">
            <p className="text-sm text-[#F5F3EF] mb-3">Reset all changes back to the original AI extraction? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1 text-xs rounded-md text-[#A8A29E] hover:text-[#F5F3EF] hover:bg-[#2E2A24]"
              >
                Cancel
              </button>
              <button
                onClick={() => { onReset(); setShowResetConfirm(false) }}
                className="px-3 py-1 text-xs rounded-md bg-[#F87171] text-white hover:bg-[#EF4444]"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={!isDirty || isSaving}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold bg-[#D4A017] text-[#0A0908] hover:bg-[#E5B120] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Save floor plan"
      >
        <Save size={14} strokeWidth={1.5} />
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
