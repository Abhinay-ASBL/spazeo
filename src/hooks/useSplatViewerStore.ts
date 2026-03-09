'use client'

import { create } from 'zustand'

export type NavMode = 'dollhouse' | 'freeRoam' | 'hotspot'

interface SplatViewerState {
  navMode: NavMode
  transitioning: boolean
  controlsVisible: boolean
  joystickVector: { x: number; y: number }
  setNavMode: (mode: NavMode) => void
  setTransitioning: (v: boolean) => void
  setControlsVisible: (v: boolean) => void
  setJoystickVector: (v: { x: number; y: number }) => void
}

export const useSplatViewerStore = create<SplatViewerState>((set, get) => ({
  navMode: 'dollhouse',
  transitioning: false,
  controlsVisible: true,
  joystickVector: { x: 0, y: 0 },
  setNavMode: (mode) => {
    const state = get()
    if (state.transitioning || state.navMode === mode) return
    set({ navMode: mode })
  },
  setTransitioning: (v) => set({ transitioning: v }),
  setControlsVisible: (v) => set({ controlsVisible: v }),
  setJoystickVector: (v) => set({ joystickVector: v }),
}))
