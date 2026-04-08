'use client'

import { useFloorPlanEditorStore } from '@/stores/floorPlanEditorStore'

const ROOM_TYPES = [
  'living_room', 'bedroom', 'kitchen', 'bathroom', 'hallway',
  'dining_room', 'closet', 'balcony', 'laundry', 'study', 'garage', 'other',
] as const

export function PropertiesPanel() {
  const selectedId = useFloorPlanEditorStore((s) => s.selectedElementId)
  const selectedType = useFloorPlanEditorStore((s) => s.selectedElementType)
  const geometry = useFloorPlanEditorStore((s) => s.geometry)
  const updateWall = useFloorPlanEditorStore((s) => s.updateWall)
  const updateRoom = useFloorPlanEditorStore((s) => s.updateRoom)
  const setOverallDimensions = useFloorPlanEditorStore((s) => s.setOverallDimensions)

  // Find selected element
  const selectedWall = selectedType === 'wall' ? geometry.walls.find((w) => w.id === selectedId) : null
  const selectedRoom = selectedType === 'room' ? geometry.rooms.find((r) => r.id === selectedId) : null
  const selectedDoor = selectedType === 'door' ? geometry.doors.find((d) => d.id === selectedId) : null
  const selectedWindow = selectedType === 'window' ? geometry.windows.find((w) => w.id === selectedId) : null

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-[#F5F3EF] mb-1">Properties</h3>

      {/* Nothing selected - show overall dimensions */}
      {!selectedId && (
        <div className="space-y-3 mt-3">
          <p className="text-xs text-[#6B6560]">Select an element to edit its properties</p>
          <div className="space-y-2">
            <label className="block text-xs text-[#A8A29E]">Overall Width (m)</label>
            <input
              type="number"
              step={0.1}
              value={geometry.overallWidth ?? ''}
              onChange={(e) => setOverallDimensions(parseFloat(e.target.value) || undefined, geometry.overallHeight)}
              className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
              placeholder="Auto"
            />
            <label className="block text-xs text-[#A8A29E]">Overall Height (m)</label>
            <input
              type="number"
              step={0.1}
              value={geometry.overallHeight ?? ''}
              onChange={(e) => setOverallDimensions(geometry.overallWidth, parseFloat(e.target.value) || undefined)}
              className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
              placeholder="Auto"
            />
          </div>
          <div className="pt-2 border-t border-[#2E2A24]">
            <p className="text-xs text-[#6B6560]">
              {geometry.walls.length} walls, {geometry.rooms.length} rooms, {geometry.doors.length} doors, {geometry.windows.length} windows
            </p>
          </div>
        </div>
      )}

      {/* Wall properties */}
      {selectedWall && (
        <div className="space-y-3 mt-3">
          <p className="text-xs text-[#D4A017] font-medium">Wall: {selectedWall.id}</p>
          {selectedWall.confidence === 'low' && (
            <span className="inline-block px-2 py-0.5 text-xs rounded bg-[#FBBF24]/20 text-[#FBBF24]">Low confidence</span>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[#A8A29E] mb-1">Start X</label>
              <input
                type="number"
                step={0.01}
                value={selectedWall.start.x}
                onChange={(e) => updateWall(selectedWall.id, { start: { ...selectedWall.start, x: parseFloat(e.target.value) || 0 } })}
                className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A8A29E] mb-1">Start Y</label>
              <input
                type="number"
                step={0.01}
                value={selectedWall.start.y}
                onChange={(e) => updateWall(selectedWall.id, { start: { ...selectedWall.start, y: parseFloat(e.target.value) || 0 } })}
                className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A8A29E] mb-1">End X</label>
              <input
                type="number"
                step={0.01}
                value={selectedWall.end.x}
                onChange={(e) => updateWall(selectedWall.id, { end: { ...selectedWall.end, x: parseFloat(e.target.value) || 0 } })}
                className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A8A29E] mb-1">End Y</label>
              <input
                type="number"
                step={0.01}
                value={selectedWall.end.y}
                onChange={(e) => updateWall(selectedWall.id, { end: { ...selectedWall.end, y: parseFloat(e.target.value) || 0 } })}
                className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Thickness (m)</label>
            <input
              type="number"
              step={0.01}
              value={selectedWall.thickness}
              onChange={(e) => updateWall(selectedWall.id, { thickness: parseFloat(e.target.value) || 0.1 })}
              className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Room properties */}
      {selectedRoom && (
        <div className="space-y-3 mt-3">
          <p className="text-xs text-[#D4A017] font-medium">Room: {selectedRoom.id}</p>
          {selectedRoom.confidence === 'low' && (
            <span className="inline-block px-2 py-0.5 text-xs rounded bg-[#FBBF24]/20 text-[#FBBF24]">Low confidence</span>
          )}
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Name</label>
            <input
              type="text"
              value={selectedRoom.name}
              onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })}
              className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Type</label>
            <select
              value={selectedRoom.type}
              onChange={(e) => updateRoom(selectedRoom.id, { type: e.target.value as typeof ROOM_TYPES[number] })}
              className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Area (m2)</label>
            <input
              type="text"
              value={selectedRoom.area?.toFixed(2) ?? 'N/A'}
              readOnly
              className="w-full px-2 py-1 rounded bg-[#1B1916]/50 border border-[#2E2A24] text-sm text-[#6B6560] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Floor Material</label>
            <select
              value={selectedRoom.floorMaterial ?? 'unknown'}
              onChange={(e) => updateRoom(selectedRoom.id, { floorMaterial: e.target.value })}
              className="w-full px-2 py-1 rounded bg-[#1B1916] border border-[#2E2A24] text-sm text-[#F5F3EF] focus:border-[#D4A017] focus:outline-none"
            >
              <option value="unknown">Unknown</option>
              <option value="tile">Tile</option>
              <option value="wood">Wood</option>
              <option value="carpet">Carpet</option>
              <option value="marble">Marble</option>
              <option value="concrete">Concrete</option>
              <option value="vinyl">Vinyl</option>
            </select>
          </div>
        </div>
      )}

      {/* Door properties */}
      {selectedDoor && (
        <div className="space-y-3 mt-3">
          <p className="text-xs text-[#D4A017] font-medium">Door: {selectedDoor.id}</p>
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Width (m)</label>
            <input
              type="number"
              step={0.1}
              value={selectedDoor.width}
              readOnly
              className="w-full px-2 py-1 rounded bg-[#1B1916]/50 border border-[#2E2A24] text-sm text-[#6B6560] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Swing Direction</label>
            <p className="text-sm text-[#F5F3EF]">{selectedDoor.swingDirection}</p>
          </div>
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Wall</label>
            <p className="text-sm text-[#F5F3EF]">{selectedDoor.wallId}</p>
          </div>
        </div>
      )}

      {/* Window properties */}
      {selectedWindow && (
        <div className="space-y-3 mt-3">
          <p className="text-xs text-[#D4A017] font-medium">Window: {selectedWindow.id}</p>
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Width (m)</label>
            <input
              type="number"
              step={0.1}
              value={selectedWindow.width}
              readOnly
              className="w-full px-2 py-1 rounded bg-[#1B1916]/50 border border-[#2E2A24] text-sm text-[#6B6560] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-[#A8A29E] mb-1">Wall</label>
            <p className="text-sm text-[#F5F3EF]">{selectedWindow.wallId}</p>
          </div>
        </div>
      )}
    </div>
  )
}
