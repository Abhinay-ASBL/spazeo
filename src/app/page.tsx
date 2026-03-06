import type { Metadata } from 'next'
import { LandingPageContent } from '@/components/landing/LandingPageContent'

export const metadata: Metadata = {
  title: 'Spazeo — Step Inside Any Space | AI-Powered 360° Virtual Tours',
  description:
    'Create immersive 360° virtual tours with AI-powered features. Perfect for real estate, hospitality, and commercial spaces.',
  openGraph: {
    title: 'Spazeo — Step Inside Any Space | AI-Powered 360° Virtual Tours',
    description:
      'Create immersive 360° virtual tours with AI-powered features. Perfect for real estate, hospitality, and commercial spaces.',
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-screen bg-[#0A0908]">
      <LandingPageContent />
    </main>
  )
}
