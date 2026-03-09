'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const GaussianSplatViewer = dynamic(
  () =>
    import('@/components/viewer/GaussianSplatViewer').then(
      (mod) => mod.GaussianSplatViewer
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#2DD4BF' }} />
          <p
            className="text-sm"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            Loading splat viewer...
          </p>
        </div>
      </div>
    ),
  }
)

// Public .spz demo file from spark.js examples
const TEST_SPLAT_URL = 'https://sparkjsdev.github.io/spark/examples/guitar/bonsai.spz'

export default function SplatTestPage() {
  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        backgroundColor: '#0A0908',
        fontFamily: 'var(--font-dmsans)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid #2E2A24' }}
      >
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
          >
            Spark.js Compatibility Test
          </h1>
          <p className="text-sm" style={{ color: '#A8A29E' }}>
            Gaussian Splat rendering via spark.js + R3F in Next.js Turbopack
          </p>
        </div>
        <div
          className="rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{
            backgroundColor: 'rgba(45,212,191,0.15)',
            color: '#2DD4BF',
            border: '1px solid rgba(45,212,191,0.3)',
          }}
        >
          Test Page
        </div>
      </div>

      {/* Viewer fills remaining height */}
      <div className="flex-1 relative">
        <GaussianSplatViewer splatUrl={TEST_SPLAT_URL} />
      </div>
    </div>
  )
}
