'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import {
  Heart,
  Target,
  Sparkles,
  Eye,
  Rocket,
  Users,
  ShieldCheck,
  ArrowRight,
  Mail,
} from 'lucide-react'

const STATS = [
  { value: '50K+', label: 'Virtual Tours Created', color: '#D4A017' },
  { value: '10K+', label: 'Active Creators', color: '#2DD4BF' },
  { value: '120+', label: 'Countries Reached', color: '#FB7A54' },
]

const VALUES = [
  {
    icon: Eye,
    title: 'Transparency',
    description:
      'We build in the open and communicate honestly with our users, partners, and team members.',
    iconColor: '#D4A017',
    iconBg: 'rgba(212,160,23,0.1)',
  },
  {
    icon: Rocket,
    title: 'Innovation',
    description:
      'We push boundaries to create tools that redefine how people experience and share physical spaces.',
    iconColor: '#2DD4BF',
    iconBg: 'rgba(45,212,191,0.1)',
  },
  {
    icon: Users,
    title: 'Community',
    description:
      'Our creators are at the heart of everything we do. We listen, learn, and build together with our community.',
    iconColor: '#FB7A54',
    iconBg: 'rgba(251,122,84,0.1)',
  },
  {
    icon: ShieldCheck,
    title: 'Quality',
    description:
      'We never compromise on the quality of our platform. Every pixel, every interaction is crafted with care.',
    iconColor: '#D4A017',
    iconBg: 'rgba(212,160,23,0.1)',
  },
]

const TEAM = [
  {
    name: 'Alex Chen',
    role: 'Co-Founder & CEO',
    roleColor: '#D4A017',
    image: '/images/team-alex.png',
  },
  {
    name: 'Sarah Mitchell',
    role: 'Co-Founder & CTO',
    roleColor: '#2DD4BF',
    image: '/images/team-sarah.png',
  },
  {
    name: 'Marcus Rivera',
    role: 'Head of Design',
    roleColor: '#FB7A54',
    image: '/images/team-marcus.png',
  },
  {
    name: 'Emma Nakamura',
    role: 'VP of Engineering',
    roleColor: '#D4A017',
    image: '/images/team-emma.png',
  },
]

const FOOTER_LINKS = {
  Product: ['Virtual Tours', '360° Viewer', 'AI Staging', 'Analytics', 'Integrations'],
  Company: ['About', 'Careers', 'Blog', 'Press'],
  Resources: ['Documentation', 'Help Center', 'API Reference', 'Status'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
}

export default function AboutPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
          }
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
        {/* ── About Hero ── */}
        <section
          className="pt-32 pb-20 text-center"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,160,23,0.08) 0%, transparent 70%)',
          }}
        >
          <div className="max-w-5xl mx-auto px-6 animate-on-scroll">
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
              <Heart size={14} />
              Our Story
            </span>

            <h1
              className="font-extrabold leading-tight mx-auto"
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1.5px',
                maxWidth: 900,
              }}
            >
              Making Spaces Accessible
              <br />
              to Everyone, Everywhere
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
              We believe every space has a story worth sharing. Spazeo empowers creators,
              businesses, and explorers to capture, share, and experience spaces like never
              before.
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-16 pt-10">
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1">
                  <span
                    className="font-extrabold"
                    style={{
                      fontSize: 40,
                      fontFamily: 'var(--font-display)',
                      color: stat.color,
                    }}
                  >
                    {stat.value}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Our Mission ── */}
        <section style={{ backgroundColor: '#12100E' }}>
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="animate-on-scroll flex flex-col lg:flex-row items-center gap-16">
              {/* Image */}
              <div
                className="w-full lg:w-[560px] flex-shrink-0 rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(212,160,23,0.12)' }}
              >
                <Image
                  src="/images/about-mission.png"
                  alt="Spazeo mission — immersive spatial experiences"
                  width={560}
                  height={420}
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Content */}
              <div className="flex flex-col gap-6">
                <span
                  className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full w-fit"
                  style={{
                    color: '#2DD4BF',
                    border: '1px solid rgba(45,212,191,0.12)',
                    background: 'transparent',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  <Target size={14} />
                  Our Mission
                </span>

                <h2
                  className="font-extrabold leading-tight"
                  style={{
                    fontSize: 'clamp(28px, 4vw, 36px)',
                    fontFamily: 'var(--font-display)',
                    color: '#F5F3EF',
                    letterSpacing: '-1px',
                    maxWidth: 500,
                    lineHeight: 1.2,
                  }}
                >
                  Bridging Physical Spaces
                  <br />
                  with Digital Experiences
                </h2>

                <p
                  className="text-base leading-relaxed"
                  style={{
                    color: '#A8A29E',
                    maxWidth: 500,
                    lineHeight: 1.7,
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  At Spazeo, we&apos;re on a mission to democratize spatial content creation.
                  We believe that every space—from a cozy caf&eacute; to a grand museum—deserves
                  to be experienced by anyone, anywhere in the world.
                </p>

                <p
                  className="text-base leading-relaxed"
                  style={{
                    color: '#6B6560',
                    maxWidth: 500,
                    lineHeight: 1.7,
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  Our platform combines cutting-edge 360° technology with intuitive tools,
                  making professional virtual tours accessible to everyone—no technical
                  expertise required.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Our Values ── */}
        <section className="py-20 px-6" style={{ backgroundColor: '#0A0908' }}>
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 animate-on-scroll">
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
                Our Values
              </span>

              <h2
                className="font-extrabold"
                style={{
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  fontFamily: 'var(--font-display)',
                  color: '#F5F3EF',
                  letterSpacing: '-1px',
                }}
              >
                What Drives Us Forward
              </h2>

              <p
                className="mt-4 text-base"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                The principles that guide every decision we make
              </p>
            </div>

            {/* Values Grid (2x2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {VALUES.map((val, i) => {
                const Icon = val.icon
                return (
                  <div
                    key={val.title}
                    className="animate-on-scroll rounded-2xl p-8 flex flex-col gap-4"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 100}ms`,
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-xl"
                      style={{
                        width: 48,
                        height: 48,
                        backgroundColor: val.iconBg,
                      }}
                    >
                      <Icon size={22} style={{ color: val.iconColor }} />
                    </div>

                    <h3
                      className="text-xl font-bold"
                      style={{
                        color: '#F5F3EF',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {val.title}
                    </h3>

                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: '#A8A29E',
                        lineHeight: 1.6,
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {val.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Our Team ── */}
        <section className="py-20 px-6" style={{ backgroundColor: '#12100E' }}>
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 animate-on-scroll">
              <span
                className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full mb-6"
                style={{
                  color: '#2DD4BF',
                  border: '1px solid rgba(45,212,191,0.12)',
                  background: 'transparent',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                <Users size={14} />
                Our Team
              </span>

              <h2
                className="font-extrabold"
                style={{
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  fontFamily: 'var(--font-display)',
                  color: '#F5F3EF',
                  letterSpacing: '-1px',
                }}
              >
                Meet the People Behind Spazeo
              </h2>

              <p
                className="mt-4 text-base mx-auto"
                style={{
                  color: '#A8A29E',
                  maxWidth: 600,
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                A passionate team of engineers, designers, and dreamers building the future of
                spatial experiences
              </p>
            </div>

            {/* Team Grid (4 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {TEAM.map((member, i) => (
                <div
                  key={member.name}
                  className="animate-on-scroll rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: '#1B1916',
                    border: '1px solid rgba(212,160,23,0.12)',
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  <div className="w-full h-[260px] relative">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="px-6 py-5">
                    <h4
                      className="text-lg font-bold"
                      style={{
                        color: '#F5F3EF',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {member.name}
                    </h4>
                    <p
                      className="text-sm font-medium mt-1"
                      style={{
                        color: member.roleColor,
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {member.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          className="py-20 px-6 text-center"
          style={{
            backgroundColor: '#0A0908',
            background:
              'radial-gradient(ellipse 50% 50% at 50% 100%, rgba(212,160,23,0.06) 0%, transparent 70%)',
          }}
        >
          <div className="max-w-2xl mx-auto animate-on-scroll">
            {/* Gold accent line */}
            <div
              className="mx-auto mb-6"
              style={{
                width: 60,
                height: 3,
                borderRadius: 2,
                backgroundColor: '#D4A017',
              }}
            />

            <h2
              className="font-extrabold"
              style={{
                fontSize: 'clamp(32px, 4vw, 44px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1px',
              }}
            >
              Join Our Journey
            </h2>

            <p
              className="mt-4 text-lg mx-auto"
              style={{
                color: '#A8A29E',
                maxWidth: 600,
                lineHeight: 1.6,
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Be part of the revolution in spatial content creation.
              <br />
              Start building immersive experiences today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200"
                style={{
                  backgroundColor: '#FB7A54',
                  color: '#FFFFFF',
                  boxShadow: '0 0 24px rgba(251,122,84,0.3)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                <Rocket size={18} />
                Start Free Trial
              </Link>

              <Link
                href="/#contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200"
                style={{
                  color: '#D4A017',
                  border: '1px solid rgba(212,160,23,0.4)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                <Mail size={18} />
                Contact Us
              </Link>
            </div>

            <p
              className="mt-6 text-[13px]"
              style={{ color: '#5A5248', fontFamily: 'var(--font-dmsans)' }}
            >
              No credit card required &bull; 14-day free trial &bull; Cancel anytime
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          className="border-t px-6 pt-16 pb-8"
          style={{
            borderColor: 'rgba(212,160,23,0.08)',
            backgroundColor: '#12100E',
          }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
              {/* Brand */}
              <div className="col-span-2">
                <Link
                  href="/"
                  className="text-xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
                >
                  Spazeo
                </Link>
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{
                    color: '#6B6560',
                    maxWidth: 260,
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  <em>Step Inside Any Space.</em> AI-powered 360° virtual tours for real estate
                  professionals.
                </p>

                {/* Social icons */}
                <div className="flex items-center gap-4 mt-5">
                  {['twitter', 'linkedin', 'youtube', 'instagram'].map((social) => (
                    <a
                      key={social}
                      href={`#${social}`}
                      className="transition-colors duration-200"
                      style={{ color: '#6B6560' }}
                      aria-label={social}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = '#D4A017')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = '#6B6560')
                      }
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {social === 'twitter' && (
                          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                        )}
                        {social === 'linkedin' && (
                          <>
                            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                            <rect width="4" height="12" x="2" y="9" />
                            <circle cx="4" cy="4" r="2" />
                          </>
                        )}
                        {social === 'youtube' && (
                          <>
                            <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                            <path d="m10 15 5-3-5-3z" />
                          </>
                        )}
                        {social === 'instagram' && (
                          <>
                            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                          </>
                        )}
                      </svg>
                    </a>
                  ))}
                </div>
              </div>

              {/* Link columns */}
              {Object.entries(FOOTER_LINKS).map(([title, links]) => (
                <div key={title}>
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-4"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {title}
                  </h4>
                  <ul className="space-y-2.5">
                    {links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-sm transition-colors duration-200"
                          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = '#F5F3EF')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = '#6B6560')
                          }
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom bar */}
            <div
              className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ borderTop: '1px solid rgba(212,160,23,0.06)' }}
            >
              <p
                className="text-xs"
                style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
              >
                &copy; {new Date().getFullYear()} Spazeo. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                {['Privacy', 'Terms', 'Cookies'].map((item) => (
                  <a
                    key={item}
                    href="#"
                    className="text-xs transition-colors duration-200"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = '#F5F3EF')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = '#6B6560')
                    }
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
