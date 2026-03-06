import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import {
  ArrowLeft,
  Compass,
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

interface DemoTour {
  slug: string
  title: string
  propertyType: string
  sceneCount: number
  aiFeatures: string[]
  description: string
}

const DEMO_TOURS: Record<string, DemoTour> = {
  'luxury-condo': {
    slug: 'luxury-condo',
    title: 'Luxury Downtown Condo',
    propertyType: 'luxury',
    sceneCount: 12,
    aiFeatures: ['AI Staging', 'AI Analysis'],
    description:
      'Experience this stunning 3-bedroom luxury condo with panoramic city views. Featuring high-end finishes, modern architecture, and breathtaking skyline vistas.',
  },
  'suburban-home': {
    slug: 'suburban-home',
    title: 'Modern Suburban Home',
    propertyType: 'residential',
    sceneCount: 8,
    aiFeatures: ['AI Descriptions'],
    description:
      'Tour this beautiful 4-bedroom family home in a quiet suburban neighborhood. Perfect for families with spacious rooms and a large backyard.',
  },
  'commercial-office': {
    slug: 'commercial-office',
    title: 'Premium Office Space',
    propertyType: 'commercial',
    sceneCount: 10,
    aiFeatures: ['AI Analysis', 'AI Staging'],
    description:
      'Explore this modern open-plan office space in the business district. Featuring collaborative workspaces, state-of-the-art amenities, and natural lighting.',
  },
  'fine-dining': {
    slug: 'fine-dining',
    title: 'Fine Dining Restaurant',
    propertyType: 'restaurant',
    sceneCount: 6,
    aiFeatures: ['AI Staging'],
    description:
      'Step inside this elegant fine dining restaurant with private rooms. Discover the ambiance and culinary atmosphere of fine dining.',
  },
  'student-apartment': {
    slug: 'student-apartment',
    title: 'Student Living Complex',
    propertyType: 'student',
    sceneCount: 5,
    aiFeatures: ['AI Descriptions', 'AI Analysis'],
    description:
      'Browse the amenities of this modern student housing complex. Featuring shared spaces, study areas, and comfortable living quarters.',
  },
  'beachfront-villa': {
    slug: 'beachfront-villa',
    title: 'Beachfront Luxury Villa',
    propertyType: 'luxury',
    sceneCount: 15,
    aiFeatures: ['AI Staging', 'AI Analysis', 'AI Descriptions'],
    description:
      'Tour this breathtaking beachfront villa with infinity pool and ocean views. An ultimate luxury destination with unparalleled coastal beauty.',
  },
}

function getPropertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    residential: 'Residential',
    commercial: 'Commercial',
    luxury: 'Luxury',
    restaurant: 'Restaurant',
    student: 'Student Housing',
  }
  return labels[type] || type
}

function getPropertyTypeColor(type: string): string {
  const colors: Record<string, string> = {
    residential: '#2DD4BF',
    commercial: '#FB7A54',
    luxury: '#D4A017',
    restaurant: '#60A5FA',
    student: '#34D399',
  }
  return colors[type] || '#A8A29E'
}

interface Params {
  slug: string
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const p = await params
  const tour = DEMO_TOURS[p.slug]

  if (!tour) {
    return {
      title: 'Tour Not Found | Spazeo',
      description: 'This demo tour could not be found.',
    }
  }

  return {
    title: `${tour.title} | Spazeo Demo Tours`,
    description: tour.description,
  }
}

export default function DemoTourPage() {
  const params = useParams()
  const slug = params.slug as string

  const tour = DEMO_TOURS[slug]

  if (!tour) {
    return (
      <main style={{ backgroundColor: '#0A0908', minHeight: '100vh' }}>
        <div className="pt-32 pb-16 px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h1
              className="text-4xl font-extrabold mb-4"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              Tour Not Found
            </h1>
            <p className="text-lg mb-8" style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}>
              The demo tour you're looking for doesn't exist.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
              style={{
                backgroundColor: '#D4A017',
                color: '#0A0908',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              <ArrowLeft size={18} />
              Back to Gallery
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <>
      <main style={{ backgroundColor: '#0A0908', minHeight: '100vh' }}>
        {/* Back Link */}
        <div className="pt-8 px-6" style={{ backgroundColor: '#0A0908' }}>
          <div className="max-w-7xl mx-auto">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 hover:text-[#D4A017]"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              <ArrowLeft size={16} />
              Back to Gallery
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column - Viewer and Info */}
            <div className="lg:col-span-2">
              {/* 360° Viewer Placeholder */}
              <div
                className="rounded-2xl overflow-hidden mb-8 flex items-center justify-center"
                style={{
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.12)',
                  aspectRatio: '16/9',
                }}
              >
                <div className="text-center">
                  <Compass
                    size={48}
                    style={{
                      color: '#D4A017',
                      opacity: 0.6,
                      margin: '0 auto mb-4',
                    }}
                  />
                  <p
                    className="text-lg font-medium"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                  >
                    360° Tour Viewer
                  </p>
                  <p
                    className="text-sm mt-2"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                  >
                    Drag to navigate • Scroll to zoom
                  </p>
                </div>
              </div>

              {/* Tour Info */}
              <div>
                <h1
                  className="text-4xl font-extrabold mb-4"
                  style={{
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-1px',
                  }}
                >
                  {tour.title}
                </h1>

                <p
                  className="text-lg leading-relaxed mb-6"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  {tour.description}
                </p>

                {/* Metadata Row */}
                <div className="flex flex-wrap gap-8 py-6" style={{ borderTop: '1px solid rgba(212,160,23,0.12)', borderBottom: '1px solid rgba(212,160,23,0.12)' }}>
                  {/* Property Type */}
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      Property Type
                    </p>
                    <div
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${getPropertyTypeColor(tour.propertyType)}15`,
                        color: getPropertyTypeColor(tour.propertyType),
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {getPropertyTypeLabel(tour.propertyType)}
                    </div>
                  </div>

                  {/* Scene Count */}
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      Scenes
                    </p>
                    <p
                      className="text-lg font-bold"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {tour.sceneCount}
                    </p>
                  </div>

                  {/* AI Features */}
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      AI Features
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tour.aiFeatures.map((feature) => (
                        <span
                          key={feature}
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: 'rgba(45,212,191,0.1)',
                            color: '#2DD4BF',
                            fontFamily: 'var(--font-dmsans)',
                          }}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="mt-8 flex items-center gap-4">
                  <p
                    className="text-sm font-medium"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                  >
                    Share this tour:
                  </p>
                  <div className="flex gap-3">
                    <button
                      className="p-2.5 rounded-lg transition-all duration-200 hover:text-[#D4A017]"
                      style={{
                        backgroundColor: 'rgba(212,160,23,0.08)',
                        color: '#A8A29E',
                      }}
                      aria-label="Share on Twitter"
                    >
                      <Twitter size={18} />
                    </button>
                    <button
                      className="p-2.5 rounded-lg transition-all duration-200 hover:text-[#D4A017]"
                      style={{
                        backgroundColor: 'rgba(212,160,23,0.08)',
                        color: '#A8A29E',
                      }}
                      aria-label="Share on LinkedIn"
                    >
                      <Linkedin size={18} />
                    </button>
                    <button
                      className="p-2.5 rounded-lg transition-all duration-200 hover:text-[#D4A017]"
                      style={{
                        backgroundColor: 'rgba(212,160,23,0.08)',
                        color: '#A8A29E',
                      }}
                      aria-label="Share on Facebook"
                    >
                      <Facebook size={18} />
                    </button>
                    <button
                      className="p-2.5 rounded-lg transition-all duration-200 hover:text-[#D4A017]"
                      style={{
                        backgroundColor: 'rgba(212,160,23,0.08)',
                        color: '#A8A29E',
                      }}
                      aria-label="Copy share link"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1">
              {/* CTA Card */}
              <div
                className="rounded-2xl p-8 sticky top-24"
                style={{
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.12)',
                }}
              >
                <div
                  className="mb-4 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(45,212,191,0.1)' }}
                >
                  <Sparkles size={22} style={{ color: '#2DD4BF' }} />
                </div>

                <h3
                  className="text-xl font-bold mb-2"
                  style={{
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Like what you see?
                </h3>

                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Create your own stunning 360° virtual tours with Spazeo. Professional results, no
                  technical experience required.
                </p>

                <Link
                  href="/sign-up"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-[0_0_24px_rgba(212,160,23,0.3)]"
                  style={{
                    backgroundColor: '#D4A017',
                    color: '#0A0908',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  Create Your Own Free Tour
                  <ArrowRight size={16} />
                </Link>

                <p
                  className="text-xs mt-4 text-center"
                  style={{ color: '#5A5248', fontFamily: 'var(--font-dmsans)' }}
                >
                  14-day free trial • No credit card
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </main>
    </>
  )
}
