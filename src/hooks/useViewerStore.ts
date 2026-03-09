'use client'

import { create } from 'zustand'

interface ViewerStore {
  // Active hotspot info panel state
  activeHotspotId: string | null
  setActiveHotspot: (id: string | null) => void
  // Full-screen video modal state
  videoModalUrl: string | null
  videoModalTitle: string | undefined
  openVideoModal: (url: string, title?: string) => void
  closeVideoModal: () => void
}

export const useViewerStore = create<ViewerStore>((set) => ({
  activeHotspotId: null,
  setActiveHotspot: (id) => set({ activeHotspotId: id }),
  videoModalUrl: null,
  videoModalTitle: undefined,
  openVideoModal: (url, title) => set({ videoModalUrl: url, videoModalTitle: title }),
  closeVideoModal: () => set({ videoModalUrl: null, videoModalTitle: undefined }),
}))
