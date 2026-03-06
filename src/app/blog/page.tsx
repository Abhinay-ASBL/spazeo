'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ArrowRight, Clock, User, Tag, Send } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   BLOG DATA
   ═══════════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  'All',
  'Product Updates',
  'Tutorials',
  'Industry',
  'Case Studies',
  'AI Technology',
] as const

type Category = (typeof CATEGORIES)[number]

interface BlogPost {
  slug: string
  title: string
  excerpt: string
  author: string
  authorRole: string
  date: string
  readingTime: string
  category: Exclude<Category, 'All'>
  featured: boolean
}

const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'introducing-ai-virtual-staging',
    title: 'Introducing AI Virtual Staging: Transform Empty Spaces in Seconds',
    excerpt:
      'Our latest AI feature lets you stage any room with photorealistic furniture and decor. See how it works and why it changes everything for real estate professionals.',
    author: 'Sarah Chen',
    authorRole: 'Product Lead',
    date: 'Feb 28, 2026',
    readingTime: '5 min read',
    category: 'Product Updates',
    featured: true,
  },
  {
    slug: 'complete-guide-360-photography',
    title: 'The Complete Guide to 360° Photography for Real Estate',
    excerpt:
      'Everything you need to know about capturing professional panoramic photos. From camera selection to shooting techniques and post-processing tips.',
    author: 'Marcus Rivera',
    authorRole: 'Content Strategist',
    date: 'Feb 21, 2026',
    readingTime: '8 min read',
    category: 'Tutorials',
    featured: false,
  },
  {
    slug: 'virtual-tours-hospitality-industry',
    title: 'How Virtual Tours Are Reshaping the Hospitality Industry',
    excerpt:
      'Hotels, resorts, and vacation rentals are seeing 40% higher booking rates with immersive virtual tours. Here is what the data tells us.',
    author: 'Elena Kowalski',
    authorRole: 'Industry Analyst',
    date: 'Feb 14, 2026',
    readingTime: '6 min read',
    category: 'Industry',
    featured: false,
  },
  {
    slug: 'luxury-realty-group-case-study',
    title: 'How Luxury Realty Group Increased Showings by 65% with Spazeo',
    excerpt:
      'A deep dive into how one of the top luxury real estate firms transformed their listing strategy with AI-powered virtual tours and virtual staging.',
    author: 'James Park',
    authorRole: 'Customer Success',
    date: 'Feb 7, 2026',
    readingTime: '7 min read',
    category: 'Case Studies',
    featured: false,
  },
  {
    slug: 'gaussian-splatting-explained',
    title: 'Gaussian Splatting Explained: The Future of 3D Scene Reconstruction',
    excerpt:
      'Gaussian Splatting is revolutionizing how we render 3D environments from photos. Learn the science behind this breakthrough and how Spazeo leverages it.',
    author: 'Dr. Anika Patel',
    authorRole: 'AI Research Lead',
    date: 'Jan 31, 2026',
    readingTime: '10 min read',
    category: 'AI Technology',
    featured: false,
  },
  {
    slug: 'optimizing-tour-engagement',
    title: 'Optimizing Tour Engagement: 7 Data-Driven Strategies',
    excerpt:
      'We analyzed over 50,000 virtual tour sessions to uncover the strategies that keep viewers exploring longer and converting at higher rates.',
    author: 'Marcus Rivera',
    authorRole: 'Content Strategist',
    date: 'Jan 24, 2026',
    readingTime: '6 min read',
    category: 'Tutorials',
    featured: false,
  },
  {
    slug: 'ai-scene-analysis-deep-dive',
    title: 'How Our AI Scene Analysis Scores and Improves Your Photos',
    excerpt:
      'A behind-the-scenes look at how Spazeo uses computer vision to analyze scene quality, detect objects, and suggest improvements for your 360 panoramas.',
    author: 'Dr. Anika Patel',
    authorRole: 'AI Research Lead',
    date: 'Jan 17, 2026',
    readingTime: '9 min read',
    category: 'AI Technology',
    featured: false,
  },
  {
    slug: 'spazeo-analytics-dashboard-launch',
    title: 'New: Advanced Analytics Dashboard with Heatmaps and Funnels',
    excerpt:
      'Track exactly how visitors interact with your tours. Our new analytics dashboard gives you heatmaps, engagement funnels, and exportable reports.',
    author: 'Sarah Chen',
    authorRole: 'Product Lead',
    date: 'Jan 10, 2026',
    readingTime: '4 min read',
    category: 'Product Updates',
    featured: false,
  },
]

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Product Updates':
      return '#D4A017'
    case 'Tutorials':
      return '#2DD4BF'
    case 'Industry':
      return '#FB7A54'
    case 'Case Studies':
      return '#60A5FA'
    case 'AI Technology':
      return '#34D399'
    default:
      return '#A8A29E'
  }
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function BlogIndexPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [email, setEmail] = useState('')

  const filteredPosts =
    activeCategory === 'All'
      ? BLOG_POSTS
      : BLOG_POSTS.filter((p) => p.category === activeCategory)

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

        {/* ── Hero ───────────────────────────────────────────── */}
        <section
          className="pt-32 pb-16 text-center"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,160,23,0.08) 0%, transparent 70%)',
          }}
        >
          <div className="max-w-4xl mx-auto px-6 animate-on-scroll">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-[0.16em] px-4 py-1.5 rounded-full mb-6"
              style={{
                color: '#D4A017',
                border: '1px solid rgba(212,160,23,0.3)',
                background: 'transparent',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Blog
            </span>

            <h1
              className="font-bold leading-tight"
              style={{
                fontSize: 'clamp(36px, 5vw, 52px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1.5px',
              }}
            >
              Insights for Virtual Tour Professionals
            </h1>

            <p
              className="text-lg mt-4 mx-auto"
              style={{
                color: '#A8A29E',
                maxWidth: 560,
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Product updates, tutorials, industry insights, and deep dives into the AI
              technology powering the future of immersive experiences.
            </p>
          </div>
        </section>

        {/* ── Category Tabs ──────────────────────────────────── */}
        <section className="px-6 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-dmsans)',
                    backgroundColor:
                      activeCategory === cat ? '#D4A017' : 'rgba(212,160,23,0.08)',
                    color: activeCategory === cat ? '#0A0908' : '#A8A29E',
                    border:
                      activeCategory === cat
                        ? '1px solid #D4A017'
                        : '1px solid rgba(212,160,23,0.12)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Blog Post Grid ─────────────────────────────────── */}
        <section className="px-6 pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post, i) => {
                const catColor = getCategoryColor(post.category)
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group rounded-2xl overflow-hidden flex flex-col animate-on-scroll transition-all duration-300 hover:-translate-y-1"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    {/* Featured Image Placeholder */}
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: '16/9', backgroundColor: '#1B1916' }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${catColor}15` }}
                        >
                          <Tag size={28} style={{ color: catColor }} />
                        </div>
                      </div>
                      {post.featured && (
                        <span
                          className="absolute top-3 left-3 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                          style={{
                            backgroundColor: 'rgba(212,160,23,0.9)',
                            color: '#0A0908',
                            fontFamily: 'var(--font-dmsans)',
                          }}
                        >
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-1">
                      {/* Category Tag */}
                      <span
                        className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3 self-start"
                        style={{
                          color: catColor,
                          backgroundColor: `${catColor}12`,
                          fontFamily: 'var(--font-dmsans)',
                        }}
                      >
                        {post.category}
                      </span>

                      <h3
                        className="text-lg font-bold leading-snug mb-2 group-hover:text-[#D4A017] transition-colors duration-200"
                        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                      >
                        {post.title}
                      </h3>

                      <p
                        className="text-sm leading-relaxed mb-4 flex-1"
                        style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                      >
                        {post.excerpt}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center justify-between pt-4 border-t border-[rgba(212,160,23,0.08)]">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#1B1916' }}
                          >
                            <User size={12} style={{ color: '#A8A29E' }} />
                          </div>
                          <span
                            className="text-xs"
                            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                          >
                            {post.author}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-xs"
                            style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                          >
                            {post.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} style={{ color: '#6B6560' }} />
                            <span
                              className="text-xs"
                              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                            >
                              {post.readingTime}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-20">
                <p
                  className="text-lg"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  No posts found in this category yet. Check back soon.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Newsletter Signup ───────────────────────────────── */}
        <section
          className="py-20 px-6"
          style={{ backgroundColor: '#12100E' }}
        >
          <div className="max-w-2xl mx-auto text-center animate-on-scroll">
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
              className="font-bold mb-4"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1px',
              }}
            >
              Stay in the Loop
            </h2>

            <p
              className="text-base mb-8"
              style={{
                color: '#6B6560',
                maxWidth: 440,
                margin: '0 auto',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Get the latest insights, tutorials, and product updates delivered to your
              inbox. No spam, unsubscribe anytime.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setEmail('')
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.15)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(212,160,23,0.25)]"
                style={{
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Subscribe
                <Send size={14} />
              </button>
            </form>

            <p
              className="mt-4 text-xs"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              Join 2,000+ virtual tour professionals
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
