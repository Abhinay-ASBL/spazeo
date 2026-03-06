'use client'

import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out Spazeo with your first virtual tour.',
    features: [
      '1 virtual tour',
      'Up to 10 scenes',
      'Basic 360° viewer',
      'Spazeo watermark',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/sign-up',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For active agents who need unlimited tours and full features.',
    features: [
      'Unlimited tours',
      'Unlimited scenes',
      'AI scene analysis',
      'Virtual staging',
      'Lead capture forms',
      'Analytics dashboard',
      'Custom branding',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/sign-up?plan=pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For brokerages and teams that need advanced control and scale.',
    features: [
      'Everything in Pro',
      'Team management',
      'SSO & SAML',
      'API access',
      'White-label option',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    href: '/pricing',
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 md:py-32 bg-gradient-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            className="inline-block text-sm font-semibold text-[#D4A017] tracking-wider uppercase mb-4"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            Pricing
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F5F3EF] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Simple, transparent pricing
          </h2>
          <p
            className="max-w-xl mx-auto text-base md:text-lg text-[#A8A29E] leading-relaxed"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            Start free, upgrade when you need more. No hidden fees.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? 'bg-[#12100E] border-2 border-[#D4A017] shadow-glow-gold'
                  : 'bento-card'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-block px-4 py-1 rounded-full bg-[#D4A017] text-xs font-bold text-[#0A0908] tracking-wider uppercase"
                    style={{ fontFamily: 'var(--font-dmsans)' }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className="text-lg font-semibold text-[#F5F3EF] mb-2"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-4xl font-bold text-[#F5F3EF]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className="text-sm text-[#6B6560]"
                      style={{ fontFamily: 'var(--font-dmsans)' }}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
                <p
                  className="text-sm text-[#A8A29E] mt-2"
                  style={{ fontFamily: 'var(--font-dmsans)' }}
                >
                  {plan.description}
                </p>
              </div>

              {/* Features list */}
              <ul className="flex-1 flex flex-col gap-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      size={16}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: plan.highlight ? '#D4A017' : '#2DD4BF' }}
                    />
                    <span
                      className="text-sm text-[#A8A29E]"
                      style={{ fontFamily: 'var(--font-dmsans)' }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.href}
                onClick={() => trackEvent('plan_selected', { plan: plan.name, location: 'landing' })}
                className={`inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-[#D4A017] text-[#0A0908] hover:bg-[#E5B120] hover:shadow-[0_0_20px_rgba(212,160,23,0.25)]'
                    : 'border border-[rgba(212,160,23,0.3)] text-[#F5F3EF] hover:border-[rgba(212,160,23,0.5)] hover:bg-[rgba(212,160,23,0.06)]'
                }`}
                style={{ fontFamily: 'var(--font-dmsans)' }}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
