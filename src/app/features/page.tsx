'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  ArrowRight,
  Check,
  X as XIcon,
  Smartphone,
  Palette,
  Users,
  Lock,
  Search,
  Code,
  Terminal,
  Upload,
  Headphones,
  Sparkles,
  ScanSearch,
  FileText,
  Share2,
  BarChart3,
  Building,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

const CORE_FEATURES = [
  {
    title: '360° Panorama Engine',
    desc: 'Our proprietary rendering engine delivers silky-smooth panoramic navigation with zero lag. Built for performance at scale.',
    bullets: [
      'Smooth drag-to-navigate 360° viewing',
      'Interactive hotspot placement system',
      'Multi-scene linking and transitions',
      'WebGL-powered for all modern browsers',
    ],
    imageSrc: '/images/features-panorama.png',
    imageAlt: '360° panorama viewer with interactive hotspots',
  },
  {
    title: 'AI Virtual Staging',
    desc: 'Transform any empty room into a beautifully furnished space. Our AI understands room geometry and style context for photorealistic results.',
    bullets: [
      'Empty-to-furnished in seconds',
      'Automatic style matching to room aesthetics',
      'Photorealistic rendering with proper lighting',
      'Multiple design styles per room',
    ],
    imageSrc: '/images/features-staging.png',
    imageAlt: 'AI virtual staging before and after comparison',
  },
  {
    title: 'Smart Analytics',
    desc: 'Understand exactly how people interact with your tours. Get actionable insights that help you optimize engagement and conversions.',
    bullets: [
      'Real-time visitor tracking and session data',
      'Visual heatmaps of viewer attention',
      'Engagement metrics and conversion tracking',
      'Exportable PDF and CSV reports',
    ],
    imageSrc: '/images/features-analytics.png',
    imageAlt: 'Smart analytics dashboard with heatmaps and metrics',
  },
]

const GRID_FEATURES: { title: string; desc: string; icon: LucideIcon; color: string }[] = [
  { title: 'Multi-device Support', desc: 'Tours look perfect on desktop, tablet, and mobile devices.', icon: Smartphone, color: '#2DD4BF' },
  { title: 'Custom Branding', desc: 'Add your logo, colors, and fonts to every tour.', icon: Palette, color: '#D4A017' },
  { title: 'Team Collaboration', desc: 'Work together with role-based access and shared projects.', icon: Users, color: '#FB7A54' },
  { title: 'Password Protection', desc: 'Restrict tour access with passwords and invite-only links.', icon: Lock, color: '#60A5FA' },
  { title: 'SEO Optimization', desc: 'Built-in SEO tools to help your tours rank in search results.', icon: Search, color: '#34D399' },
  { title: 'Embed Anywhere', desc: 'Drop tours into any website with a single embed code.', icon: Code, color: '#2DD4BF' },
  { title: 'API Access', desc: 'Full RESTful API for custom integrations and automation.', icon: Terminal, color: '#D4A017' },
  { title: 'Bulk Upload', desc: 'Upload hundreds of panoramas at once with batch processing.', icon: Upload, color: '#FB7A54' },
  { title: 'Priority Support', desc: 'Dedicated support team with guaranteed response times.', icon: Headphones, color: '#60A5FA' },
]

type CellValue = 'gold-check' | 'gray-check' | 'red-x'

const COMPARISON_ROWS: { feature: string; spazeo: CellValue; compA: CellValue; compB: CellValue }[] = [
  { feature: 'Gaussian Splatting', spazeo: 'gold-check', compA: 'red-x', compB: 'red-x' },
  { feature: 'AI Staging', spazeo: 'gold-check', compA: 'gray-check', compB: 'red-x' },
  { feature: 'Real-time Analytics', spazeo: 'gold-check', compA: 'gray-check', compB: 'gray-check' },
  { feature: 'One-click Publish', spazeo: 'gold-check', compA: 'red-x', compB: 'gray-check' },
  { feature: 'Custom Branding', spazeo: 'gold-check', compA: 'red-x', compB: 'red-x' },
]


/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

function ComparisonCell({ value }: { value: CellValue }) {
  if (value === 'gold-check') return <Check size={18} style={{ color: '#D4A017' }} />
  if (value === 'gray-check') return <Check size={18} style={{ color: '#6B6560' }} />
  return <XIcon size={18} style={{ color: '#F87171' }} />
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function FeaturesPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    )
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Navbar />
      <main>

        {/* ─── SECTION 1: FEATURES HERO ─────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ paddingTop: 164, paddingBottom: 60 }}
        >
          {/* Teal radial gradient bg */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(45,212,191,0.07) 0%, transparent 70%), #0A0908',
            }}
          />

          <div className="max-w-7xl mx-auto px-6 lg:px-[60px] relative z-10 flex flex-col items-center">
            {/* Teal badge */}
            <div
              className="inline-flex items-center rounded-full px-4 py-1.5 mb-6 animate-on-scroll"
              style={{
                background: 'rgba(45,212,191,0.05)',
                border: '1px solid rgba(45,212,191,0.20)',
              }}
            >
              <span
                className="text-[13px] font-medium"
                style={{ color: '#2DD4BF', fontFamily: 'var(--font-dmsans)' }}
              >
                Features
              </span>
            </div>

            <h1
              className="font-black leading-[1.1] tracking-tight text-center max-w-[900px] animate-on-scroll"
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Everything You Need to Create Stunning Tours
            </h1>

            <p
              className="mt-6 text-lg leading-relaxed text-center max-w-[700px] animate-on-scroll"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              From capture to publish, Spazeo gives you a complete toolkit for building immersive
              virtual experiences that captivate your audience.
            </p>
          </div>
        </section>

        {/* ─── SECTION 2: CORE FEATURES DEEP DIVE ──────────────────── */}
        <section
          className="relative"
          style={{ background: '#0A0908', paddingTop: 80, paddingBottom: 80 }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px] flex flex-col gap-20">
            {CORE_FEATURES.map((feat, i) => {
              const isReversed = i % 2 === 1
              return (
                <div
                  key={feat.title}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-[60px] items-center animate-on-scroll"
                >
                  {/* Image */}
                  <div className={isReversed ? 'lg:order-2' : ''}>
                    <div
                      className="rounded-2xl overflow-hidden relative"
                      style={{
                        width: '100%',
                        maxWidth: 520,
                        aspectRatio: '520/340',
                        background: '#12100E',
                        border: '1px solid rgba(212,160,23,0.12)',
                      }}
                    >
                      <Image
                        src={feat.imageSrc}
                        alt={feat.imageAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 520px"
                      />
                    </div>
                  </div>

                  {/* Text */}
                  <div className={isReversed ? 'lg:order-1' : ''}>
                    <h3
                      className="text-2xl md:text-4xl font-extrabold tracking-tight mb-5"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {feat.title}
                    </h3>
                    <p
                      className="text-lg leading-relaxed mb-6"
                      style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {feat.desc}
                    </p>
                    <ul className="flex flex-col gap-3.5">
                      {feat.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2.5 text-[15px]" style={{ color: '#A8A29E' }}>
                          <Check
                            size={18}
                            className="flex-shrink-0"
                            style={{ color: '#2DD4BF' }}
                          />
                          <span style={{ fontFamily: 'var(--font-dmsans)' }}>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ─── SECTION 3: FEATURE GRID ──────────────────────────────── */}
        <section
          className="relative"
          style={{ background: '#0A0908', paddingTop: 80, paddingBottom: 80 }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-12 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              And So Much More
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {GRID_FEATURES.map((feat, i) => {
                const Icon = feat.icon
                return (
                  <div
                    key={feat.title}
                    className="rounded-2xl p-6 animate-on-scroll"
                    style={{
                      background: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 60}ms`,
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${feat.color}15` }}
                    >
                      <Icon size={22} style={{ color: feat.color }} />
                    </div>
                    <h3
                      className="text-base font-bold mb-2"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {feat.title}
                    </h3>
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {feat.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── SECTION 3.5: AI FEATURE CATEGORIES ─────────────────────── */}
        <section
          className="relative"
          style={{ background: '#12100E', paddingTop: 80, paddingBottom: 80 }}
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
              AI-Powered Feature Categories
            </h2>
            <p
              className="text-center text-base mb-14 max-w-[560px] mx-auto animate-on-scroll"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              Explore each AI capability in depth. Click any card to learn more.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: Sparkles, title: '360\u00B0 Tour Creation', desc: 'Upload panoramas, arrange scenes, add hotspots, and publish immersive tours in minutes.', href: '/features', color: '#D4A017' },
                { icon: ScanSearch, title: 'AI-Powered Enhancements', desc: 'Virtual staging, scene analysis, and AI descriptions that transform your tours.', href: '/features/ai-staging', color: '#2DD4BF' },
                { icon: Share2, title: 'Sharing & Embedding', desc: 'One-click publish, embed codes, custom domains, and social sharing tools.', href: '/features', color: '#FB7A54' },
                { icon: BarChart3, title: 'Analytics & Insights', desc: 'Visitor tracking, heatmaps, engagement funnels, and exportable reports.', href: '/features', color: '#60A5FA' },
              ].map((cat, i) => {
                const Icon = cat.icon
                return (
                  <Link
                    key={cat.title}
                    href={cat.href}
                    className="group rounded-2xl p-6 animate-on-scroll transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: '#0A0908',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${cat.color}15` }}
                    >
                      <Icon size={24} style={{ color: cat.color }} />
                    </div>
                    <h3
                      className="text-base font-bold mb-2 group-hover:text-[#D4A017] transition-colors duration-200"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {cat.title}
                    </h3>
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {cat.desc}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── SECTION 3.6: AI STAGING BEFORE/AFTER ─────────────────────── */}
        <section
          className="relative"
          style={{ background: '#0A0908', paddingTop: 80, paddingBottom: 80 }}
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
              AI Staging: Before & After
            </h2>
            <p
              className="text-center text-base mb-14 max-w-[560px] mx-auto animate-on-scroll"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              See how our AI transforms empty rooms into beautifully furnished spaces.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-on-scroll">
              {/* Before placeholder */}
              <div
                className="rounded-2xl overflow-hidden flex flex-col items-center justify-center"
                style={{
                  aspectRatio: '16/10',
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.12)',
                }}
              >
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  Before
                </p>
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(107,101,96,0.15)' }}
                >
                  <Building size={32} style={{ color: '#6B6560' }} />
                </div>
                <p
                  className="text-xs mt-3"
                  style={{ color: '#3D3830', fontFamily: 'var(--font-dmsans)' }}
                >
                  Empty room panorama
                </p>
              </div>

              {/* After placeholder */}
              <div
                className="rounded-2xl overflow-hidden flex flex-col items-center justify-center"
                style={{
                  aspectRatio: '16/10',
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.2)',
                }}
              >
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
                >
                  After AI Staging
                </p>
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
                >
                  <Sparkles size={32} style={{ color: '#D4A017' }} />
                </div>
                <p
                  className="text-xs mt-3"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  AI-staged with photorealistic furniture
                </p>
              </div>
            </div>

            <div className="text-center mt-8 animate-on-scroll">
              <Link
                href="/features/ai-staging"
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 hover:text-[#D4A017]"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                Learn more about AI Virtual Staging
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── SECTION 3.7: WHY SPAZEO CALLOUT ──────────────────────────── */}
        <section
          className="relative"
          style={{ background: '#12100E', paddingTop: 60, paddingBottom: 60 }}
        >
          <div className="max-w-4xl mx-auto px-6 lg:px-[60px] text-center animate-on-scroll">
            <div
              className="rounded-2xl p-10"
              style={{
                background: 'linear-gradient(135deg, rgba(212,160,23,0.08) 0%, rgba(45,212,191,0.05) 100%)',
                border: '1px solid rgba(212,160,23,0.15)',
              }}
            >
              <h3
                className="font-extrabold tracking-tight mb-3"
                style={{
                  fontSize: 'clamp(22px, 3vw, 32px)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Why Spazeo?
              </h3>
              <p
                className="text-base mb-6 max-w-[480px] mx-auto"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                See how Spazeo stacks up against other virtual tour platforms on features,
                AI capabilities, and pricing.
              </p>
              <Link
                href="/compare"
                className="inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_rgba(212,160,23,0.25)]"
                style={{
                  background: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Compare Spazeo
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: COMPARISON TABLE ──────────────────────────── */}
        <section
          className="relative"
          style={{ background: '#0A0908', paddingTop: 80, paddingBottom: 80 }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-12 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Spazeo vs Others
            </h2>

            <div
              className="rounded-2xl overflow-hidden animate-on-scroll"
              style={{ border: '1px solid rgba(212,160,23,0.12)' }}
            >
              {/* Table Header */}
              <div
                className="grid grid-cols-4 py-4"
                style={{ background: '#12100E' }}
              >
                <div className="px-6 flex items-center">
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-display)' }}
                  >
                    Feature
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: '#D4A017', fontFamily: 'var(--font-display)' }}
                  >
                    Spazeo
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-display)' }}
                  >
                    Competitor A
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-display)' }}
                  >
                    Competitor B
                  </span>
                </div>
              </div>

              {/* Table Rows */}
              {COMPARISON_ROWS.map((row, i) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-4 py-3.5"
                  style={{
                    background: i % 2 === 0 ? '#0A0908' : '#12100E',
                    borderTop: '1px solid rgba(212,160,23,0.12)',
                  }}
                >
                  <div className="px-6 flex items-center">
                    <span
                      className="text-sm"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {row.feature}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <ComparisonCell value={row.spazeo} />
                  </div>
                  <div className="flex items-center justify-center">
                    <ComparisonCell value={row.compA} />
                  </div>
                  <div className="flex items-center justify-center">
                    <ComparisonCell value={row.compB} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SECTION 5: CTA ───────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ paddingTop: 100, paddingBottom: 100 }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,160,23,0.13) 0%, transparent 70%), #0A0908',
            }}
          />

          <div className="max-w-3xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
            <h2
              className="font-extrabold tracking-tight mb-8 animate-on-scroll"
              style={{
                fontSize: 'clamp(32px, 4vw, 44px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Ready to Explore Every Feature?
            </h2>
            <p
              className="text-lg leading-relaxed mb-10 max-w-[600px] animate-on-scroll"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Start your free trial today and discover why teams choose Spazeo for their virtual
              tour needs.
            </p>

            <div className="flex gap-4 flex-wrap items-center justify-center animate-on-scroll">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:shadow-[0_8px_32px_rgba(212,160,23,0.35)] hover:-translate-y-0.5"
                style={{
                  background: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Start Free Trial
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/contact"
                className="flex items-center justify-center font-medium text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:bg-[rgba(212,160,23,0.06)]"
                style={{
                  border: '1px solid rgba(212,160,23,0.20)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>

        <Footer />

      </main>
    </>
  )
}
