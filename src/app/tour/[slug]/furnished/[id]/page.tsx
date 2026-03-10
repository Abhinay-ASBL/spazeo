'use client'

import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const FurnishedRoomViewer = dynamic(
  () =>
    import('@/components/furnished/FurnishedRoomViewer').then(
      (m) => m.FurnishedRoomViewer
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center w-full h-screen"
        style={{ backgroundColor: '#0A0908' }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: '#D4A017' }}
        />
      </div>
    ),
  }
)

export default function FurnishedRoomPage() {
  const params = useParams()
  const tourSlug = params.slug as string
  const furnishedRoomSlug = params.id as string

  return (
    <div className="w-full h-screen" style={{ backgroundColor: '#0A0908' }}>
      <FurnishedRoomViewer
        tourSlug={tourSlug}
        furnishedRoomSlug={furnishedRoomSlug}
      />
    </div>
  )
}
