'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { ArrowRight, Sparkles } from 'lucide-react'

type PropertyType = 'all' | 'residential' | 'commercial' | 'luxury' | 'ai-enhanced'

interface DemoTour {
  slug: string
  title: string
  propertyType: string
  sceneCount: number
  aiFeatures: string[]
  description: string
  thumbnail?: string
}

const DEMO_TOURS: DemoTour[] = [
  {
    slug: 'luxury-condo',
    title: 'Luxury Downtown Condo',
    propertyType: 'luxury',
    sceneCount: 12,
    aiFeatures: ['AI Staging', 'AI Analysis'],
    description: 'Experience this stunning 3-bedroom luxury condo with panoramic city views.',
  },
  {
    slug: 'suburban-home',
    title: 'Modern Suburban Home',
    propertyType: 'residential',
    sceneCount: 8,
    aiFeatures: ['AI Descriptions'],
    description: 'Tour this beautiful 4-bedroom family home in a quiet suburban neighborhood.',
  },
  {
    slug: 'commercial-office',
    title: 'Premium Office Space',
    propertyType: 'commercial',
    sceneCount: 10,
    aiFeatures: ['AI Analysis', 'AI Staging'],
    description: 'Explore this modern open-plan office space in the business district.',
  },
  {
    slug: 'fine-dining',
    title: 'Fine Dining Restaurant',
    propertyType: 'restaurant',
    sceneCount: 6,
    aiFeatures: ['AI Staging'],
    description: 'Step inside this elegant fine dining restaurant with private rooms.',
  },
  {
    slug: 'student-apartment',
    title: 'Student Living Complex',
    propertyType: 'student',
    sceneCount: 5,
    aiFeatures: ['AI Descriptions', 'AI Analysis'],
    description: 'Browse the amenities of this modern student housing complex.',
  },
  {
    slug: 'beachfront-villa',
    title: 'Beachfront Luxury Villa',
    propertyType: 'luxury',
    sceneCount: 15,
    aiFeatures: ['AI Staging', 'AI Analysis', 'AI Descriptions'],
    description: 'Tour this breathtaking beachfront villa with infinity pool and ocean views.',
  },
]

const FILTER_TABS: { id: PropertyType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'residential', label: 'Residential' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'ai-enhanced', label: 'AI-Enhanced' },
]

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

function DemoCard({ tour }: { tour: DemoTour }) {
  return (
    <Link href={`/demo/${tour.slug}`}>
      <div
        className="rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 h-full flex flex-col"
        style={{
          border: '1px solid rgba(212,160,23,0.12)',
          backgroundColor: '#12100E',
        }}
      >
        {/* Thumbnail */}
        <div
          className="w-full h-48 relative overflow-hidden bg-gradient-to-br"
          style={{
            background: `linear-gradient(135deg, rgba(45,212,191,0.1) 0%, rgba(212,160,23,0.1) 100%)`,
          }}
        >
          <div className="w-full h-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <div
              className="text-center"
              style={{
                background: `linear-gradient(135deg, rgba(212,160,23,0.2) 0%, rgba(45,212,191,0.2) 100%)`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <Sparkles size={32} style={{ color: '#D4A017', margin: '0 auto' }} />
              <p className="text-xs mt-2" style={{ color: '#A8A29E' }}>
                360° Tour
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 flex-grow">
          {/* Title */}
          <div>
            <h3
              className="text-lg font-bold mb-2 transition-colors duration-200 group-hover:text-[#D4A017]"
              style={{
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              {tour.title}
            </h3>

            {/* Property Type Badge */}
            <div
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${getPropertyTypeColor(tour.propertyType)}15`,
                color: getPropertyTypeColor(tour.propertyType),
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              {getPropertyTypeLabel(tour.propertyType)}
            </div>
          </div>

          {/* Description */}
          <p
            className="text-sm leading-relaxed"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            {tour.description}
          </p>

          {/* Scene count */}
          <div
            className="text-xs"
            style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
          >
            {tour.sceneCount} scenes
          </div>

          {/* AI Features */}
          {tour.aiFeatures.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {tour.aiFeatures.map((feature) => (
                <span
                  key={feature}
                  className="text-xs px-2 py-1 rounded-full"
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
          )}

          {/* CTA */}
          <div className="mt-auto pt-4 flex items-center gap-2 text-sm font-medium transition-colors duration-200 group-hover:text-[#D4A017]" style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}>
            View Tour
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function DemoPage() {
  const [activeFilter, setActiveFilter] = useState<PropertyType>('all')
  const [filteredTours, setFilteredTours] = useState<DemoTour[]>(DEMO_TOURS)

  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredTours(DEMO_TOURS)
    } else if (activeFilter === 'ai-enhanced') {
      setFilteredTours(DEMO_TOURS.filter((tour) => tour.aiFeatures.length >= 2))
    } else {
      setFilteredTours(DEMO_TOURS.filter((tour) => tour.propertyType === activeFilter))
    }
  }, [activeFilter])

  return (
    <>
      <main style={{ backgroundColor: '#0A0908', minHeight: '100vh' }}>
        {/* Hero Section */}
        <section
          className="pt-24 pb-16 px-6 text-center"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,160,23,0.08) 0%, transparent 70%)',
          }}
        >
          <div className="max-w-4xl mx-auto">
            {/* Badge */}
            <span
              className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full mb-6"
              style={{
                color: '#D4A017',
                border: '1px solid rgba(212,160,23,0.4)',
                background: 'transparent',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              <Sparkles size={14} />
              Demo Tours
            </span>

            <h1
              className="font-extrabold leading-tight"
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1.5px',
              }}
            >
              Experience Spazeo
            </h1>

            <p
              className="text-lg mt-6 mx-auto"
              style={{
                color: '#A8A29E',
                maxWidth: 700,
                lineHeight: 1.6,
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Explore our showcase of 360° virtual tours and see the power of immersive spatial
              experiences in action.
            </p>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="px-6 py-12" style={{ backgroundColor: '#0A0908' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
                  style={{
                    backgroundColor:
                      activeFilter === tab.id ? '#D4A017' : 'rgba(212,160,23,0.08)',
                    color: activeFilter === tab.id ? '#0A0908' : '#F5F3EF',
                    border:
                      activeFilter === tab.id
                        ? 'none'
                        : '1px solid rgba(212,160,23,0.2)',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="px-6 py-16" style={{ backgroundColor: '#0A0908' }}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTours.map((tour) => (
                <DemoCard key={tour.slug} tour={tour} />
              ))}
            </div>

            {filteredTours.length === 0 && (
              <div className="text-center py-16">
                <p
                  className="text-lg"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  No tours found for this filter.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Banner */}
        <section
          className="px-6 py-20 text-center"
          style={{
            backgroundColor: '#12100E',
            background:
              'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(212,160,23,0.06) 0%, transparent 70%)',
          }}
        >
          <div className="max-w-2xl mx-auto">
            <h2
              className="font-extrabold mb-4"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1px',
              }}
            >
              Ready to create your own?
            </h2>

            <p
              className="text-base mb-8 mx-auto"
              style={{
                color: '#A8A29E',
                maxWidth: 500,
                lineHeight: 1.6,
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Start building immersive 360° virtual tours today with Spazeo. No technical
              experience required.
            </p>

            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200 hover:shadow-[0_0_24px_rgba(212,160,23,0.3)]"
              style={{
                backgroundColor: '#D4A017',
                color: '#0A0908',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>

            <p
              className="mt-6 text-[13px]"
              style={{ color: '#5A5248', fontFamily: 'var(--font-dmsans)' }}
            >
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </main>
    </>
  )
}
