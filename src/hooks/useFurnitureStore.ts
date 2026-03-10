'use client'

import { create } from 'zustand'

export interface GhostMetadata {
  name: string
  price: number
  amazonUrl?: string
}

export interface PlacedItem {
  instanceId: string
  furnitureItemId: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  name: string
  price: number
  amazonUrl?: string
  glbUrl: string
}

export type UndoAction =
  | { type: 'place'; item: PlacedItem }
  | { type: 'remove'; item: PlacedItem }
  | {
      type: 'transform'
      instanceId: string
      prevPosition: [number, number, number]
      prevRotation: [number, number, number]
      prevScale: [number, number, number]
    }

export type InteractionMode = 'navigate' | 'furnish'
export type TransformMode = 'rotate' | 'scale'

interface FurnitureState {
  mode: InteractionMode
  setMode: (mode: InteractionMode) => void

  ghostItemId: string | null
  ghostGlbUrl: string | null
  ghostMetadata: GhostMetadata | null
  setGhostItem: (id: string, url: string, metadata: GhostMetadata) => void
  clearGhost: () => void

  placedItems: PlacedItem[]
  addItem: (item: PlacedItem) => void
  removeItem: (instanceId: string) => void
  updateTransform: (
    instanceId: string,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => void

  selectedId: string | null
  setSelectedId: (id: string | null) => void

  centerOnItem: [number, number, number] | null
  setCenterOnItem: (position: [number, number, number] | null) => void

  transformMode: TransformMode
  setTransformMode: (mode: TransformMode) => void

  undoStack: UndoAction[]
  undo: () => void

  totalCost: number

  loadFromSaved: (items: PlacedItem[]) => void
  reset: () => void
}

const UNDO_STACK_LIMIT = 50

const pushUndo = (stack: UndoAction[], action: UndoAction): UndoAction[] => {
  const newStack = [...stack, action]
  if (newStack.length > UNDO_STACK_LIMIT) {
    newStack.shift()
  }
  return newStack
}

const computeTotalCost = (items: PlacedItem[]): number =>
  items.reduce((sum, item) => sum + item.price, 0)

export const useFurnitureStore = create<FurnitureState>((set, get) => ({
  mode: 'navigate',
  setMode: (mode) => set({ mode }),

  ghostItemId: null,
  ghostGlbUrl: null,
  ghostMetadata: null,
  setGhostItem: (id, url, metadata) =>
    set({
      ghostItemId: id,
      ghostGlbUrl: url,
      ghostMetadata: metadata,
      mode: 'furnish',
    }),
  clearGhost: () =>
    set({ ghostItemId: null, ghostGlbUrl: null, ghostMetadata: null }),

  placedItems: [],
  addItem: (item) => {
    const state = get()
    const newItems = [...state.placedItems, item]
    set({
      placedItems: newItems,
      undoStack: pushUndo(state.undoStack, { type: 'place', item }),
      totalCost: computeTotalCost(newItems),
    })
  },
  removeItem: (instanceId) => {
    const state = get()
    const item = state.placedItems.find((i) => i.instanceId === instanceId)
    if (!item) return
    const newItems = state.placedItems.filter(
      (i) => i.instanceId !== instanceId
    )
    set({
      placedItems: newItems,
      undoStack: pushUndo(state.undoStack, { type: 'remove', item }),
      selectedId: state.selectedId === instanceId ? null : state.selectedId,
      totalCost: computeTotalCost(newItems),
    })
  },
  updateTransform: (instanceId, position, rotation, scale) => {
    const state = get()
    const item = state.placedItems.find((i) => i.instanceId === instanceId)
    if (!item) return
    const undoAction: UndoAction = {
      type: 'transform',
      instanceId,
      prevPosition: item.position,
      prevRotation: item.rotation,
      prevScale: item.scale,
    }
    const newItems = state.placedItems.map((i) =>
      i.instanceId === instanceId ? { ...i, position, rotation, scale } : i
    )
    set({
      placedItems: newItems,
      undoStack: pushUndo(state.undoStack, undoAction),
    })
  },

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

  centerOnItem: null,
  setCenterOnItem: (position) => set({ centerOnItem: position }),

  transformMode: 'rotate',
  setTransformMode: (mode) => set({ transformMode: mode }),

  undoStack: [],
  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return

    const newStack = [...state.undoStack]
    const action = newStack.pop()!

    switch (action.type) {
      case 'place': {
        // Undo a placement = remove the item
        const newItems = state.placedItems.filter(
          (i) => i.instanceId !== action.item.instanceId
        )
        set({
          placedItems: newItems,
          undoStack: newStack,
          selectedId:
            state.selectedId === action.item.instanceId
              ? null
              : state.selectedId,
          totalCost: computeTotalCost(newItems),
        })
        break
      }
      case 'remove': {
        // Undo a removal = re-add the item
        const newItems = [...state.placedItems, action.item]
        set({
          placedItems: newItems,
          undoStack: newStack,
          totalCost: computeTotalCost(newItems),
        })
        break
      }
      case 'transform': {
        // Undo a transform = restore previous position/rotation/scale
        const newItems = state.placedItems.map((i) =>
          i.instanceId === action.instanceId
            ? {
                ...i,
                position: action.prevPosition,
                rotation: action.prevRotation,
                scale: action.prevScale,
              }
            : i
        )
        set({
          placedItems: newItems,
          undoStack: newStack,
        })
        break
      }
    }
  },

  totalCost: 0,

  loadFromSaved: (items) =>
    set({
      placedItems: items,
      undoStack: [],
      totalCost: computeTotalCost(items),
    }),

  reset: () =>
    set({
      mode: 'navigate',
      ghostItemId: null,
      ghostGlbUrl: null,
      ghostMetadata: null,
      placedItems: [],
      selectedId: null,
      centerOnItem: null,
      transformMode: 'rotate',
      undoStack: [],
      totalCost: 0,
    }),
}))
