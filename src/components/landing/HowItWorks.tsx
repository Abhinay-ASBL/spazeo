import { Upload, Sparkles, Globe } from 'lucide-react'

const STEPS = [
  {
    num: '01',
    title: 'Upload Panoramas',
    description:
      'Drop any 360° panorama or standard photos. We support all major formats including equirectangular, cubemap, and standard images.',
    icon: Upload,
    color: '#D4A017',
  },
  {
    num: '02',
    title: 'Customize & Enhance',
    description:
      'AI automatically analyzes scenes, generates descriptions, and suggests improvements. Add hotspots, virtual staging, and branding.',
    icon: Sparkles,
    color: '#2DD4BF',
  },
  {
    num: '03',
    title: 'Share & Convert',
    description:
      'Publish with one click and get a shareable link. Embed on your site, track analytics, and capture leads automatically.',
    icon: Globe,
    color: '#FB7A54',
  },
]

export function HowItWorks() {
  return (
    <section className="relative py-24 md:py-32 bg-gradient-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            className="inline-block text-sm font-semibold text-[#D4A017] tracking-wider uppercase mb-4"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            How It Works
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F5F3EF] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Three steps to immersive tours
          </h2>
          <p
            className="max-w-xl mx-auto text-base md:text-lg text-[#A8A29E] leading-relaxed"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            Go from raw panoramas to a live, shareable virtual tour in minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.num} className="relative text-center">
                {/* Connector line (not on last) */}
                {index < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+48px)] right-[calc(-50%+48px)] h-px bg-gradient-to-r from-[rgba(212,160,23,0.3)] to-transparent" />
                )}

                <div
                  className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    backgroundColor: `${step.color}0A`,
                    border: `1px solid ${step.color}1A`,
                  }}
                >
                  <Icon size={32} style={{ color: step.color }} />
                </div>

                <span
                  className="inline-block text-xs font-bold tracking-widest uppercase mb-3"
                  style={{ color: step.color, fontFamily: 'var(--font-dmsans)' }}
                >
                  Step {step.num}
                </span>

                <h3
                  className="text-xl font-semibold text-[#F5F3EF] mb-3"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {step.title}
                </h3>

                <p
                  className="text-sm text-[#A8A29E] leading-relaxed max-w-xs mx-auto"
                  style={{ fontFamily: 'var(--font-dmsans)' }}
                >
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
