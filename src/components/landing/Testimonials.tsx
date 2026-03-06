import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote:
      'Spazeo completely transformed how we showcase properties. Our listings with virtual tours get 3x more inquiries than those without.',
    name: 'Sarah Chen',
    role: 'Senior Agent, Coldwell Banker',
    rating: 5,
  },
  {
    quote:
      'The AI scene analysis saves us hours of manual work. Upload the panoramas and everything is organized, described, and optimized automatically.',
    name: 'Marcus Rivera',
    role: 'Broker, Rivera Realty Group',
    rating: 5,
  },
  {
    quote:
      'Our clients love being able to walk through properties from their couch. The lead capture feature alone has paid for the subscription ten times over.',
    name: 'Emily Patel',
    role: 'Team Lead, RE/MAX Elite',
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            className="inline-block text-sm font-semibold text-[#D4A017] tracking-wider uppercase mb-4"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            Testimonials
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F5F3EF] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Trusted by top agents
          </h2>
          <p
            className="max-w-xl mx-auto text-base md:text-lg text-[#A8A29E] leading-relaxed"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            See how real estate professionals are closing more deals with Spazeo.
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bento-card p-8 flex flex-col justify-between"
            >
              {/* Stars */}
              <div className="flex items-center gap-1 mb-5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className="text-[#D4A017] fill-[#D4A017]"
                  />
                ))}
              </div>

              {/* Quote */}
              <p
                className="text-[15px] text-[#F5F3EF] leading-relaxed mb-8 flex-1"
                style={{ fontFamily: 'var(--font-dmsans)' }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[rgba(212,160,23,0.12)] border border-[rgba(212,160,23,0.2)] flex items-center justify-center">
                  <span
                    className="text-sm font-semibold text-[#D4A017]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {t.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                </div>
                <div>
                  <p
                    className="text-sm font-semibold text-[#F5F3EF]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {t.name}
                  </p>
                  <p
                    className="text-xs text-[#6B6560]"
                    style={{ fontFamily: 'var(--font-dmsans)' }}
                  >
                    {t.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
