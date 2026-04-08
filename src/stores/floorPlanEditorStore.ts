'use client'

import { create } from 'zustand'

// --- Geometry types (all coordinates in meters) ---

export interface WallEndpoint {
  x: number
  y: number
}

export interface Wall {
  id: string
  start: WallEndpoint
  end: WallEndpoint
  thickness: number
  confidence?: 'high' | 'medium' | 'low'
}

export interface RoomPoint {
  x: number
  y: number
}

export interface Room {
  id: string
  name: string
  type: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'hallway' | 'dining_room' | 'closet' | 'balcony' | 'laundry' | 'study' | 'garage' | 'other'
  points: RoomPoint[]
  area?: number
  floorMaterial?: string
  confidence?: 'high' | 'medium' | 'low'
}

export interface Door {
  id: string
  wallId: string
  position: number // 0-1 fraction along wall
  width: number // meters
  swingDirection: 'inward' | 'outward'
}

export interface FloorPlanWindow {
  id: string
  wallId: string
  position: number // 0-1 fraction along wall
  width: number // meters
}

export interface DimensionLine {
  id: string
  start: WallEndpoint
  end: WallEndpoint
  value: number // meters
  label?: string
}

export interface FloorPlanGeometry {
  walls: Wall[]
  rooms: Room[]
  doors: Door[]
  windows: FloorPlanWindow[]
  fixtures: unknown[]
  dimensions: DimensionLine[]
  overallWidth?: number
  overallHeight?: number
}

export type EditorTool = 'select' | 'wall' | 'room' | 'door' | 'window' | 'eraser'
export type SelectedElementType = 'wall' | 'room' | 'door' | 'window' | null

const UNDO_STACK_CAP = 50

function createEmptyGeometry(): FloorPlanGeometry {
  return { walls: [], rooms: [], doors: [], windows: [], fixtures: [], dimensions: [] }
}

function calculatePolygonArea(points: RoomPoint[]): number {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area / 2)
}

interface FloorPlanEditorState {
  // Geometry (canonical source of truth, all coordinates in meters)
  geometry: FloorPlanGeometry

  // Tool state
  activeTool: EditorTool

  // Selection
  selectedElementId: string | null
  selectedElementType: SelectedElementType

  // Drawing in progress
  drawingPoints: { x: number; y: number }[]

  // Undo history (50-item cap with shift-oldest eviction)
  undoStack: FloorPlanGeometry[]
  redoStack: FloorPlanGeometry[]

  // Viewport
  viewportScale: number
  viewportPosition: { x: number; y: number }
  stageSize: { width: number; height: number }

  // Dirty flag for save tracking
  isDirty: boolean

  // ID counters
  _wallCounter: number
  _roomCounter: number
  _doorCounter: number
  _windowCounter: number

  // Actions
  setGeometry: (geometry: FloorPlanGeometry) => void
  setActiveTool: (tool: EditorTool) => void
  selectElement: (id: string | null, type: SelectedElementType) => void

  // Drawing
  addDrawingPoint: (point: { x: number; y: number }) => void
  clearDrawingPoints: () => void

  // Geometry mutations
  addWall: (wall: Wall) => void
  updateWall: (wallId: string, updates: Partial<Wall>) => void
  deleteWall: (wallId: string) => void
  moveWallEndpoint: (wallId: string, endpoint: 'start' | 'end', position: { x: number; y: number }) => void

  addRoom: (room: Room) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  deleteRoom: (roomId: string) => void

  addDoor: (door: Door) => void
  addWindow: (win: FloorPlanWindow) => void
  deleteDoor: (doorId: string) => void
  deleteWindow: (windowId: string) => void

  setOverallDimensions: (overallWidth: number | undefined, overallHeight: number | undefined) => void

  // Undo/redo
  undo: () => void
  redo: () => void

  // Viewport
  setViewportScale: (scale: number) => void
  setViewportPosition: (pos: { x: number; y: number }) => void
  setStageSize: (size: { width: number; height: number }) => void

  // Next ID generators
  nextWallId: () => string
  nextRoomId: () => string
  nextDoorId: () => string
  nextWindowId: () => string
}

function pushUndo(state: { undoStack: FloorPlanGeometry[]; geometry: FloorPlanGeometry }) {
  const stack = [...state.undoStack, JSON.parse(JSON.stringify(state.geometry)) as FloorPlanGeometry]
  if (stack.length > UNDO_STACK_CAP) stack.shift()
  return { undoStack: stack, redoStack: [] as FloorPlanGeometry[], isDirty: true }
}

export const useFloorPlanEditorStore = create<FloorPlanEditorState>((set, get) => ({
  geometry: createEmptyGeometry(),
  activeTool: 'select',
  selectedElementId: null,
  selectedElementType: null,
  drawingPoints: [],
  undoStack: [],
  redoStack: [],
  viewportScale: 1,
  viewportPosition: { x: 0, y: 0 },
  stageSize: { width: 800, height: 600 },
  isDirty: false,
  _wallCounter: 0,
  _roomCounter: 0,
  _doorCounter: 0,
  _windowCounter: 0,

  setGeometry: (geometry) => {
    // Count existing IDs to set counters
    let wc = 0, rc = 0, dc = 0, wic = 0
    geometry.walls.forEach((w) => {
      const n = parseInt(w.id.replace(/\D/g, ''), 10)
      if (!isNaN(n) && n > wc) wc = n
    })
    geometry.rooms.forEach((r) => {
      const n = parseInt(r.id.replace(/\D/g, ''), 10)
      if (!isNaN(n) && n > rc) rc = n
    })
    geometry.doors.forEach((d) => {
      const n = parseInt(d.id.replace(/\D/g, ''), 10)
      if (!isNaN(n) && n > dc) dc = n
    })
    geometry.windows.forEach((w) => {
      const n = parseInt(w.id.replace(/\D/g, ''), 10)
      if (!isNaN(n) && n > wic) wic = n
    })
    set({
      geometry,
      undoStack: [],
      redoStack: [],
      isDirty: false,
      _wallCounter: wc,
      _roomCounter: rc,
      _doorCounter: dc,
      _windowCounter: wic,
    })
  },

  setActiveTool: (tool) => set({ activeTool: tool, drawingPoints: [] }),

  selectElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),

  addDrawingPoint: (point) => set((s) => ({ drawingPoints: [...s.drawingPoints, point] })),
  clearDrawingPoints: () => set({ drawingPoints: [] }),

  // --- Geometry mutations ---

  addWall: (wall) => set((s) => ({
    ...pushUndo(s),
    geometry: { ...s.geometry, walls: [...s.geometry.walls, wall] },
  })),

  updateWall: (wallId, updates) => set((s) => ({
    ...pushUndo(s),
    geometry: {
      ...s.geometry,
      walls: s.geometry.walls.map((w) => (w.id === wallId ? { ...w, ...updates } : w)),
    },
  })),

  deleteWall: (wallId) => set((s) => ({
    ...pushUndo(s),
    geometry: {
      ...s.geometry,
      walls: s.geometry.walls.filter((w) => w.id !== wallId),
      // Also remove doors/windows on this wall
      doors: s.geometry.doors.filter((d) => d.wallId !== wallId),
      windows: s.geometry.windows.filter((w) => w.wallId !== wallId),
    },
    selectedElementId: s.selectedElementId === wallId ? null : s.selectedElementId,
    selectedElementType: s.selectedElementId === wallId ? null : s.selectedElementType,
  })),

  moveWallEndpoint: (wallId, endpoint, position) => set((s) => ({
    ...pushUndo(s),
    geometry: {
      ...s.geometry,
      walls: s.geometry.walls.map((w) =>
        w.id === wallId ? { ...w, [endpoint]: position } : w
      ),
    },
  })),

  addRoom: (room) => set((s) => {
    const roomWithArea = { ...room, area: calculatePolygonArea(room.points) }
    return {
      ...pushUndo(s),
      geometry: { ...s.geometry, rooms: [...s.geometry.rooms, roomWithArea] },
    }
  }),

  updateRoom: (roomId, updates) => set((s) => ({
    ...pushUndo(s),
    geometry: {
      ...s.geometry,
      rooms: s.geometry.rooms.map((r) => {
        if (r.id !== roomId) return r
        const updated = { ...r, ...updates }
        if (updates.points) updated.area = calculatePolygonArea(updates.points)
        return updated
      }),
    },
  })),

  deleteRoom: (roomId) => set((s) => ({
    ...pushUndo(s),
    geometry: {
      ...s.geometry,
      rooms: s.geometry.rooms.filter((r) => r.id !== roomId),
    },
    selectedElementId: s.selectedElementId === roomId ? null : s.selectedElementId,
    selectedElementType: s.selectedElementId === roomId ? null : s.selectedElementType,
  })),

  addDoor: (door) => set((s) => ({
    ...pushUndo(s),
    geometry: { ...s.geometry, doors: [...s.geometry.doors, door] },
  })),

  addWindow: (win) => set((s) => ({
    ...pushUndo(s),
    geometry: { ...s.geometry, windows: [...s.geometry.windows, win] },
  })),

  deleteDoor: (doorId) => set((s) => ({
    ...pushUndo(s),
    geometry: {
      ...s.geometry,
      doors: s.geometry.doors.filter((d) => d.id !== doorId),
    },
    selectedElementId: s.selectedElementId === doorId ? null : s.selectedElementId,
    selectedElementType: s.selectedElementId === doorId ? null : s.selectedElementType,
  })),

  deleteWindow: (windowId) => set((s) => ({
    ...pushUndo(s),
    geometry: {
      ...s.geometry,
      windows: s.geometry.windows.filter((w) => w.id !== windowId),
    },
    selectedElementId: s.selectedElementId === windowId ? null : s.selectedElementId,
    selectedElementType: s.selectedElementId === windowId ? null : s.selectedElementType,
  })),

  setOverallDimensions: (overallWidth, overallHeight) => set((s) => ({
    ...pushUndo(s),
    geometry: { ...s.geometry, overallWidth, overallHeight },
  })),

  // --- Undo/Redo ---

  undo: () => set((s) => {
    if (s.undoStack.length === 0) return s
    const prev = s.undoStack[s.undoStack.length - 1]
    return {
      geometry: prev,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, JSON.parse(JSON.stringify(s.geometry)) as FloorPlanGeometry],
      isDirty: true,
    }
  }),

  redo: () => set((s) => {
    if (s.redoStack.length === 0) return s
    const next = s.redoStack[s.redoStack.length - 1]
    return {
      geometry: next,
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, JSON.parse(JSON.stringify(s.geometry)) as FloorPlanGeometry],
      isDirty: true,
    }
  }),

  // --- Viewport ---

  setViewportScale: (scale) => set({ viewportScale: Math.max(0.1, Math.min(5.0, scale)) }),
  setViewportPosition: (pos) => set({ viewportPosition: pos }),
  setStageSize: (size) => set({ stageSize: size }),

  // --- ID generators ---

  nextWallId: () => {
    const c = get()._wallCounter + 1
    set({ _wallCounter: c })
    return `w${c}`
  },
  nextRoomId: () => {
    const c = get()._roomCounter + 1
    set({ _roomCounter: c })
    return `r${c}`
  },
  nextDoorId: () => {
    const c = get()._doorCounter + 1
    set({ _doorCounter: c })
    return `d${c}`
  },
  nextWindowId: () => {
    const c = get()._windowCounter + 1
    set({ _windowCounter: c })
    return `win${c}`
  },
}))
