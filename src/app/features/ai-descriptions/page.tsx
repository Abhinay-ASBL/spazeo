'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  ArrowRight,
  FileText,
  Sparkles,
  SlidersHorizontal,
  Globe,
  Pencil,
  Building,
  Home,
  Hotel,
  type LucideIcon,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Scene Understanding',
    description:
      'Our AI analyzes your panorama to identify the room type, key features, architectural style, and notable elements that should be highlighted in the description.',
  },
  {
    step: '02',
    title: 'Contextual Generation',
    description:
      'Using the visual analysis, GPT-4o generates compelling, accurate descriptions that highlight selling points while maintaining a professional, engaging tone.',
  },
  {
    step: '03',
    title: 'Review and Customize',
    description:
      'Edit the generated description, adjust the tone, length, and emphasis. Regenerate with different parameters until you have the perfect copy.',
  },
]

interface CustomizationOption {
  icon: LucideIcon
  title: string
  description: string
}

const CUSTOMIZATION_OPTIONS: CustomizationOption[] = [
  {
    icon: SlidersHorizontal,
    title: 'Tone Control',
    description:
      'Choose from professional, casual, luxury, or conversational tones to match your brand voice and target audience.',
  },
  {
    icon: Pencil,
    title: 'Length Presets',
    description:
      'Generate short taglines, medium descriptions for listings, or detailed long-form copy for marketing materials.',
  },
  {
    icon: FileText,
    title: 'Emphasis Selection',
    description:
      'Highlight specific features like natural lighting, spaciousness, architectural details, or recent renovations.',
  },
  {
    icon: Sparkles,
    title: 'SEO Optimization',
    description:
      'Include relevant keywords and phrases that help your tour listings rank higher in search results.',
  },
]

interface PropertyType {
  icon: LucideIcon
  label: string
  example: string
}

const PROPERTY_TYPES: PropertyType[] = [
  {
    icon: Home,
    label: 'Residential',
    example:
      '"Step into this sun-drenched open-plan living space, where floor-to-ceiling windows frame panoramic city views..."',
  },
  {
    icon: Building,
    label: 'Commercial',
    example:
      '"A modern, 2,400 sq ft office space featuring an open floor plan with dedicated meeting areas and natural light throughout..."',
  },
  {
    icon: Hotel,
    label: 'Hospitality',
    example:
      '"Welcome to the Presidential Suite, where contemporary elegance meets timeless comfort across 1,800 square feet of luxury..."',
  },
]

const LANGUAGES_ROADMAP = [
  { name: 'English', status: 'Available' as const },
  { name: 'Spanish', status: 'Coming Soon' as const },
  { name: 'French', status: 'Coming Soon' as const },
  { name: 'German', status: 'Coming Soon' as const },
  { name: 'Portuguese', status: 'Coming Soon' as const },
  { name: 'Mandarin', status: 'Planned' as const },
  { name: 'Japanese', status: 'Planned' as const },
  { name: 'Arabic', status: 'Planned' as const },
]

function getStatusColor(status: string): string {
  switch (status) {
    case 'Available':
      return '#34D399'
    case 'Coming Soon':
      return '#D4A017'
    case 'Planned':
      return '#6B6560'
    default:
      return '#6B6560'
  }
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function AIDescriptionsPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('in-view')
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: '#0A0908', minHeight: '100vh' }}>

        {/* ── Hero ───────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ paddingTop: 164, paddingBottom: 60 }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(251,122,84,0.06) 0%, transparent 70%), #0A0908',
            }}
          />
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <div
              className="inline-flex items-center rounded-full px-4 py-1.5 mb-6 animate-on-scroll"
              style={{
                background: 'rgba(251,122,84,0.05)',
                border: '1px solid rgba(251,122,84,0.20)',
              }}
            >
              <FileText size={14} className="mr-2" style={{ color: '#FB7A54' }} />
              <span
                className="text-[13px] font-medium"
                style={{ color: '#FB7A54', fontFamily: 'var(--font-dmsans)' }}
              >
                AI Descriptions
              </span>
            </div>

            <h1
              className="font-black leading-[1.1] tracking-tight animate-on-scroll"
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              AI-Powered Descriptions That Sell
            </h1>

            <p
              className="mt-6 text-lg leading-relaxed max-w-[640px] mx-auto animate-on-scroll"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Generate compelling, accurate property descriptions from your panoramic photos.
              Our AI sees what the camera captures and writes copy that converts.
            </p>

            <div className="flex gap-4 flex-wrap items-center justify-center mt-8 animate-on-scroll">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:shadow-[0_8px_32px_rgba(251,122,84,0.3)] hover:-translate-y-0.5"
                style={{
                  background: '#FB7A54',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Try AI Descriptions
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/features"
                className="flex items-center justify-center font-medium text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:bg-[rgba(251,122,84,0.06)]"
                style={{
                  border: '1px solid rgba(251,122,84,0.20)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                All Features
              </Link>
            </div>
          </div>
        </section>

        {/* ── Generation Process ──────────────────────────────── */}
        <section style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-14 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              How AI Description Generation Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PROCESS_STEPS.map((step, i) => (
                <div
                  key={step.step}
                  className="rounded-2xl p-8 text-center animate-on-scroll"
                  style={{
                    backgroundColor: '#12100E',
                    border: '1px solid rgba(212,160,23,0.12)',
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-5 text-lg font-black"
                    style={{
                      backgroundColor: 'rgba(251,122,84,0.1)',
                      color: '#FB7A54',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {step.step}
                  </span>
                  <h3
                    className="text-lg font-bold mb-3"
                    style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Customization Options ───────────────────────────── */}
        <section
          style={{ paddingTop: 80, paddingBottom: 80, backgroundColor: '#12100E' }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-4 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Customization Options
            </h2>
            <p
              className="text-center text-base mb-14 max-w-[560px] mx-auto animate-on-scroll"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              Fine-tune every aspect of the generated descriptions to match your brand and
              audience expectations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {CUSTOMIZATION_OPTIONS.map((opt, i) => {
                const Icon = opt.icon
                return (
                  <div
                    key={opt.title}
                    className="rounded-2xl p-6 flex gap-4 items-start animate-on-scroll"
                    style={{
                      backgroundColor: '#0A0908',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(251,122,84,0.1)' }}
                    >
                      <Icon size={22} style={{ color: '#FB7A54' }} />
                    </div>
                    <div>
                      <h3
                        className="text-base font-bold mb-1.5"
                        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                      >
                        {opt.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                      >
                        {opt.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Property Type Examples ──────────────────────────── */}
        <section style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-14 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Works for Every Property Type
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PROPERTY_TYPES.map((prop, i) => {
                const Icon = prop.icon
                return (
                  <div
                    key={prop.label}
                    className="rounded-2xl p-6 animate-on-scroll"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 100}ms`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: 'rgba(251,122,84,0.1)' }}
                    >
                      <Icon size={24} style={{ color: '#FB7A54' }} />
                    </div>
                    <h3
                      className="text-lg font-bold mb-3"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {prop.label}
                    </h3>
                    <p
                      className="text-sm leading-relaxed italic"
                      style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {prop.example}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Multi-Language Roadmap ──────────────────────────── */}
        <section
          style={{ paddingTop: 80, paddingBottom: 80, backgroundColor: '#12100E' }}
        >
          <div className="max-w-3xl mx-auto px-6 lg:px-[60px]">
            <div className="flex items-center justify-center gap-2 mb-4 animate-on-scroll">
              <Globe size={20} style={{ color: '#FB7A54' }} />
              <h2
                className="text-center font-extrabold tracking-tight"
                style={{
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Multi-Language Support
              </h2>
            </div>
            <p
              className="text-center text-base mb-10 max-w-[480px] mx-auto animate-on-scroll"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              Generate descriptions in multiple languages to reach international buyers.
              More languages coming soon.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-on-scroll">
              {LANGUAGES_ROADMAP.map((lang) => {
                const statusColor = getStatusColor(lang.status)
                return (
                  <div
                    key={lang.name}
                    className="rounded-xl p-4 text-center"
                    style={{
                      backgroundColor: '#0A0908',
                      border: '1px solid rgba(212,160,23,0.12)',
                    }}
                  >
                    <p
                      className="text-sm font-medium mb-1"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {lang.name}
                    </p>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: statusColor, fontFamily: 'var(--font-dmsans)' }}
                    >
                      {lang.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ paddingTop: 100, paddingBottom: 100 }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(251,122,84,0.08) 0%, transparent 70%), #0A0908',
            }}
          />
          <div className="max-w-3xl mx-auto px-6 relative z-10 text-center">
            <h2
              className="font-extrabold tracking-tight mb-6 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Write Better Descriptions in Seconds
            </h2>
            <p
              className="text-lg leading-relaxed mb-10 max-w-[500px] mx-auto animate-on-scroll"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Stop spending hours crafting listing copy. Let AI generate compelling
              descriptions that highlight what makes each space special.
            </p>
            <div className="flex gap-4 flex-wrap items-center justify-center animate-on-scroll">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:shadow-[0_8px_32px_rgba(251,122,84,0.3)] hover:-translate-y-0.5"
                style={{
                  background: '#FB7A54',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Start Free Trial
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/pricing"
                className="flex items-center justify-center font-medium text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:bg-[rgba(251,122,84,0.06)]"
                style={{
                  border: '1px solid rgba(251,122,84,0.20)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
