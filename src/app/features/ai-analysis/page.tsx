'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  ArrowRight,
  ScanSearch,
  Tags,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Gauge,
  Eye,
  Layers,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

interface ScoreCategory {
  icon: LucideIcon
  label: string
  description: string
  color: string
}

const SCORE_CATEGORIES: ScoreCategory[] = [
  {
    icon: Eye,
    label: 'Image Clarity',
    description:
      'Measures sharpness, resolution, and blur detection across the entire panorama.',
    color: '#2DD4BF',
  },
  {
    icon: Lightbulb,
    label: 'Lighting Quality',
    description:
      'Evaluates exposure balance, dynamic range, and identifies over/under-exposed areas.',
    color: '#D4A017',
  },
  {
    icon: Layers,
    label: 'Composition',
    description:
      'Analyzes framing, vertical alignment, and optimal camera placement within the scene.',
    color: '#FB7A54',
  },
  {
    icon: Gauge,
    label: 'Overall Score',
    description:
      'Weighted composite score from 0-100 combining all quality metrics into a single rating.',
    color: '#34D399',
  },
]

const AUTO_TAG_FEATURES = [
  {
    title: 'Room Type Detection',
    description:
      'Automatically identifies whether the scene is a living room, bedroom, kitchen, bathroom, office, or outdoor space.',
  },
  {
    title: 'Object Recognition',
    description:
      'Detects furniture, fixtures, appliances, and architectural features within the panorama for rich metadata.',
  },
  {
    title: 'Material Identification',
    description:
      'Recognizes flooring types, wall finishes, countertop materials, and other surface textures.',
  },
  {
    title: 'Spatial Estimation',
    description:
      'Estimates approximate room dimensions and spatial layout from the panoramic image alone.',
  },
]

interface ImprovementStep {
  icon: LucideIcon
  title: string
  description: string
}

const IMPROVEMENT_STEPS: ImprovementStep[] = [
  {
    icon: ScanSearch,
    title: 'AI Analyzes Your Scene',
    description:
      'Upload a panorama and our vision AI scans every pixel for quality issues, composition problems, and missed opportunities.',
  },
  {
    icon: AlertCircle,
    title: 'Issues Are Flagged',
    description:
      'The system highlights specific problems: overexposed windows, blurry areas, poor framing, visible tripod, or cluttered spaces.',
  },
  {
    icon: CheckCircle2,
    title: 'Get Actionable Suggestions',
    description:
      'Receive prioritized, specific recommendations to improve your scene: retake angles, adjust settings, or apply AI enhancements.',
  },
  {
    icon: TrendingUp,
    title: 'Track Improvement',
    description:
      'Re-upload the improved panorama and watch your quality score increase. Build a portfolio of consistently high-quality tours.',
  },
]

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function AIAnalysisPage() {
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
                'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(45,212,191,0.07) 0%, transparent 70%), #0A0908',
            }}
          />
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <div
              className="inline-flex items-center rounded-full px-4 py-1.5 mb-6 animate-on-scroll"
              style={{
                background: 'rgba(45,212,191,0.05)',
                border: '1px solid rgba(45,212,191,0.20)',
              }}
            >
              <ScanSearch size={14} className="mr-2" style={{ color: '#2DD4BF' }} />
              <span
                className="text-[13px] font-medium"
                style={{ color: '#2DD4BF', fontFamily: 'var(--font-dmsans)' }}
              >
                AI Scene Analysis
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
              Intelligent Quality Scoring for Every Scene
            </h1>

            <p
              className="mt-6 text-lg leading-relaxed max-w-[640px] mx-auto animate-on-scroll"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Our computer vision AI evaluates image quality, detects objects, classifies rooms,
              and suggests improvements — automatically, for every panorama you upload.
            </p>

            <div className="flex gap-4 flex-wrap items-center justify-center mt-8 animate-on-scroll">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:shadow-[0_8px_32px_rgba(45,212,191,0.3)] hover:-translate-y-0.5"
                style={{
                  background: '#2DD4BF',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Try Scene Analysis
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/features"
                className="flex items-center justify-center font-medium text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:bg-[rgba(45,212,191,0.06)]"
                style={{
                  border: '1px solid rgba(45,212,191,0.20)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                All Features
              </Link>
            </div>
          </div>
        </section>

        {/* ── Scene Quality Scoring ──────────────────────────── */}
        <section style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-4 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Scene Quality Scoring
            </h2>
            <p
              className="text-center text-base mb-14 max-w-[560px] mx-auto animate-on-scroll"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              Every panorama receives a detailed quality assessment across multiple dimensions,
              giving you clear data on what to improve.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {SCORE_CATEGORIES.map((cat, i) => {
                const Icon = cat.icon
                return (
                  <div
                    key={cat.label}
                    className="rounded-2xl p-6 animate-on-scroll"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <Icon size={24} style={{ color: cat.color }} />
                    </div>
                    <h3
                      className="text-base font-bold mb-2"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {cat.label}
                    </h3>
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {cat.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Auto-Tagging & Metadata ────────────────────────── */}
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
              Auto-Tagging and Metadata Extraction
            </h2>
            <p
              className="text-center text-base mb-14 max-w-[560px] mx-auto animate-on-scroll"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              Our AI automatically extracts rich metadata from every scene, saving you time
              and improving discoverability.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {AUTO_TAG_FEATURES.map((feat, i) => (
                <div
                  key={feat.title}
                  className="rounded-2xl p-6 flex gap-4 items-start animate-on-scroll"
                  style={{
                    backgroundColor: '#0A0908',
                    border: '1px solid rgba(212,160,23,0.12)',
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: 'rgba(45,212,191,0.1)' }}
                  >
                    <Tags size={20} style={{ color: '#2DD4BF' }} />
                  </div>
                  <div>
                    <h3
                      className="text-base font-bold mb-1.5"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {feat.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Improvement Suggestions Flow ────────────────────── */}
        <section style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-4 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Continuous Improvement Flow
            </h2>
            <p
              className="text-center text-base mb-14 max-w-[560px] mx-auto animate-on-scroll"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              From initial analysis to actionable feedback, our AI guides you to
              consistently better panoramas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {IMPROVEMENT_STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.title}
                    className="rounded-2xl p-6 relative animate-on-scroll"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 100}ms`,
                    }}
                  >
                    <span
                      className="absolute top-4 right-4 text-xs font-bold"
                      style={{ color: '#3D3830', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: 'rgba(45,212,191,0.1)' }}
                    >
                      <Icon size={22} style={{ color: '#2DD4BF' }} />
                    </div>
                    <h3
                      className="text-base font-bold mb-2"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {step.description}
                    </p>
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
                'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(45,212,191,0.08) 0%, transparent 70%), #0A0908',
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
              Elevate Your Tour Quality
            </h2>
            <p
              className="text-lg leading-relaxed mb-10 max-w-[500px] mx-auto animate-on-scroll"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Let AI analyze your panoramas and guide you toward professional-grade virtual
              tours every time.
            </p>
            <div className="flex gap-4 flex-wrap items-center justify-center animate-on-scroll">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:shadow-[0_8px_32px_rgba(45,212,191,0.3)] hover:-translate-y-0.5"
                style={{
                  background: '#2DD4BF',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Start Free Trial
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/pricing"
                className="flex items-center justify-center font-medium text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:bg-[rgba(45,212,191,0.06)]"
                style={{
                  border: '1px solid rgba(45,212,191,0.20)',
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
