import { create } from 'zustand'
import type { Scene } from '@/types'

interface ViewerState {
  isAutoRotating: boolean
  isFullscreen: boolean
  zoomLevel: number
  activeSceneIndex: number
  scenes: Scene[]
  toggleAutoRotate: () => void
  toggleFullscreen: () => void
  setActiveScene: (index: number) => void
  zoomIn: () => void
  zoomOut: () => void
  setScenes: (scenes: Scene[]) => void
}

export const useViewer = create<ViewerState>((set) => ({
  isAutoRotating: true,
  isFullscreen: false,
  zoomLevel: 1,
  activeSceneIndex: 0,
  scenes: [],
  toggleAutoRotate: () => set((s) => ({ isAutoRotating: !s.isAutoRotating })),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  setActiveScene: (index) => set({ activeSceneIndex: index }),
  zoomIn: () => set((s) => ({ zoomLevel: Math.min(3, s.zoomLevel + 0.5) })),
  zoomOut: () => set((s) => ({ zoomLevel: Math.max(0.5, s.zoomLevel - 0.5) })),
  setScenes: (scenes) => set({ scenes }),
}))
