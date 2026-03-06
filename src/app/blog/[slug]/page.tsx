'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  Twitter,
  Linkedin,
  Facebook,
  Link2,
  User,
  Tag,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST DATA
   ═══════════════════════════════════════════════════════════════════ */

interface BlogPostData {
  slug: string
  title: string
  excerpt: string
  author: string
  authorRole: string
  authorBio: string
  date: string
  readingTime: string
  category: string
  tableOfContents: { id: string; label: string }[]
  content: string[]
}

const BLOG_POSTS: Record<string, BlogPostData> = {
  'introducing-ai-virtual-staging': {
    slug: 'introducing-ai-virtual-staging',
    title: 'Introducing AI Virtual Staging: Transform Empty Spaces in Seconds',
    excerpt:
      'Our latest AI feature lets you stage any room with photorealistic furniture and decor.',
    author: 'Sarah Chen',
    authorRole: 'Product Lead',
    authorBio:
      'Sarah leads product development at Spazeo, focusing on AI-powered features that help real estate professionals create stunning virtual tours.',
    date: 'Feb 28, 2026',
    readingTime: '5 min read',
    category: 'Product Updates',
    tableOfContents: [
      { id: 'the-problem', label: 'The Problem with Empty Spaces' },
      { id: 'how-it-works', label: 'How AI Virtual Staging Works' },
      { id: 'supported-styles', label: 'Supported Design Styles' },
      { id: 'results', label: 'Real Results from Beta Users' },
      { id: 'getting-started', label: 'Getting Started' },
    ],
    content: [
      'Virtual staging has long been a pain point for real estate professionals. Traditional staging costs thousands of dollars per property, and manual digital staging takes hours of skilled design work. We built AI Virtual Staging to solve this problem once and for all.',
      'Empty rooms are the biggest conversion killer in real estate listings. Studies show that staged homes sell 73% faster and for 6-25% more than unstaged homes. But physical staging is expensive, time-consuming, and impractical for many listings.',
      'Our AI analyzes the room geometry, lighting conditions, and architectural style to generate photorealistic furniture and decor placements. The entire process takes less than 30 seconds per scene, and you can choose from multiple design styles to match your target demographic.',
      'We support over 15 design styles including Modern Minimalist, Scandinavian, Industrial, Mid-Century Modern, Traditional, Coastal, Bohemian, and more. Each style has been trained on thousands of professional interior design photos to ensure authentic-looking results.',
      'During our beta period, real estate agents using AI Virtual Staging reported an average 65% increase in listing engagement and a 40% reduction in time to first showing. Properties with AI-staged tours received 3x more inquiries than those with empty room photos.',
      'Getting started is simple. Upload your 360-degree panorama to Spazeo, navigate to the scene you want to stage, and click the "AI Stage" button. Select your preferred style, and our AI will generate a beautifully staged version in seconds. You can generate multiple versions to compare different looks.',
    ],
  },
  'complete-guide-360-photography': {
    slug: 'complete-guide-360-photography',
    title: 'The Complete Guide to 360° Photography for Real Estate',
    excerpt:
      'Everything you need to know about capturing professional panoramic photos.',
    author: 'Marcus Rivera',
    authorRole: 'Content Strategist',
    authorBio:
      'Marcus creates educational content for the virtual tour industry, helping professionals master the tools and techniques that drive results.',
    date: 'Feb 21, 2026',
    readingTime: '8 min read',
    category: 'Tutorials',
    tableOfContents: [
      { id: 'equipment', label: 'Choosing the Right Equipment' },
      { id: 'shooting-tips', label: 'Shooting Techniques' },
      { id: 'lighting', label: 'Mastering Lighting' },
      { id: 'post-processing', label: 'Post-Processing Workflow' },
      { id: 'best-practices', label: 'Best Practices' },
    ],
    content: [
      'Creating professional 360-degree photography requires the right combination of equipment, technique, and post-processing. This guide covers everything you need to know to capture stunning panoramic photos for your virtual tours.',
      'The most important piece of equipment is your 360-degree camera. For professional results, we recommend cameras like the Ricoh Theta Z1, Insta360 ONE X3, or the professional-grade Insta360 Titan. Each offers different resolution, dynamic range, and price points to match your needs.',
      'When shooting, always use a tripod at a consistent height (typically 5 feet) to maintain a natural perspective. Shoot in the center of each room, and ensure the camera is level. For best results, use HDR mode to capture the full dynamic range of each scene.',
      'Lighting is critical for quality panoramas. Open all blinds and curtains to maximize natural light. Turn on all interior lights to eliminate dark spots. Avoid shooting with direct sunlight streaming through windows, as this creates harsh contrast that even HDR cannot fully resolve.',
      'Post-processing your panoramas involves stitching (if using a multi-lens setup), color correction, exposure balancing, and nadir/zenith patching. Tools like PTGui, Adobe Lightroom, and Spazeo built-in processing help you achieve professional results efficiently.',
      'Follow these best practices: shoot during golden hour for the most flattering light, remove personal items and clutter before shooting, capture at least 8-10 scenes per property, and always include key selling points like kitchens, master bedrooms, and outdoor spaces.',
    ],
  },
}

const FALLBACK_POST: BlogPostData = {
  slug: 'sample-post',
  title: 'Blog Post',
  excerpt: 'This blog post is coming soon.',
  author: 'Spazeo Team',
  authorRole: 'Team',
  authorBio: 'The Spazeo team is building the future of virtual tours.',
  date: 'Jan 1, 2026',
  readingTime: '5 min read',
  category: 'Product Updates',
  tableOfContents: [
    { id: 'introduction', label: 'Introduction' },
    { id: 'details', label: 'Details' },
    { id: 'conclusion', label: 'Conclusion' },
  ],
  content: [
    'This blog post is currently being written. Check back soon for the full article.',
    'We are working on bringing you the best content about virtual tours, AI technology, and the real estate industry.',
    'In the meantime, explore our other blog posts for insights and tutorials on creating stunning virtual experiences.',
  ],
}

const RELATED_SLUGS = [
  {
    slug: 'introducing-ai-virtual-staging',
    title: 'Introducing AI Virtual Staging: Transform Empty Spaces in Seconds',
    category: 'Product Updates',
    readingTime: '5 min read',
  },
  {
    slug: 'complete-guide-360-photography',
    title: 'The Complete Guide to 360° Photography for Real Estate',
    category: 'Tutorials',
    readingTime: '8 min read',
  },
  {
    slug: 'gaussian-splatting-explained',
    title: 'Gaussian Splatting Explained: The Future of 3D Scene Reconstruction',
    category: 'AI Technology',
    readingTime: '10 min read',
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

function handleCopyLink() {
  if (typeof window !== 'undefined') {
    navigator.clipboard.writeText(window.location.href).catch(() => {
      // Silently fail
    })
  }
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function BlogPostPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const post = BLOG_POSTS[slug] ?? FALLBACK_POST
  const catColor = getCategoryColor(post.category)

  const relatedPosts = RELATED_SLUGS.filter((r) => r.slug !== slug).slice(0, 3)

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: '#0A0908', minHeight: '100vh' }}>

        {/* ── Post Header ────────────────────────────────────── */}
        <section
          className="pt-32 pb-12"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,160,23,0.06) 0%, transparent 70%)',
          }}
        >
          <div className="max-w-3xl mx-auto px-6">
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm mb-8 transition-colors duration-200 hover:text-[#F5F3EF]"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              <ArrowLeft size={16} />
              Back to Blog
            </Link>

            {/* Category */}
            <span
              className="inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
              style={{
                color: catColor,
                backgroundColor: `${catColor}12`,
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              {post.category}
            </span>

            {/* Title */}
            <h1
              className="font-bold leading-tight mb-6"
              style={{
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1.5px',
              }}
            >
              {post.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              {/* Author */}
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#1B1916' }}
                >
                  <User size={18} style={{ color: '#A8A29E' }} />
                </div>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {post.author}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {post.authorRole}
                  </p>
                </div>
              </div>

              <span style={{ color: '#3D3830' }}>|</span>

              <span className="flex items-center gap-1.5 text-sm" style={{ color: '#6B6560' }}>
                <Calendar size={14} />
                <span style={{ fontFamily: 'var(--font-dmsans)' }}>{post.date}</span>
              </span>

              <span className="flex items-center gap-1.5 text-sm" style={{ color: '#6B6560' }}>
                <Clock size={14} />
                <span style={{ fontFamily: 'var(--font-dmsans)' }}>{post.readingTime}</span>
              </span>
            </div>

            {/* Social Share */}
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-medium"
                style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
              >
                Share:
              </span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on Twitter"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-[rgba(212,160,23,0.1)]"
                style={{ border: '1px solid rgba(212,160,23,0.12)' }}
              >
                <Twitter size={14} style={{ color: '#A8A29E' }} />
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on LinkedIn"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-[rgba(212,160,23,0.1)]"
                style={{ border: '1px solid rgba(212,160,23,0.12)' }}
              >
                <Linkedin size={14} style={{ color: '#A8A29E' }} />
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on Facebook"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-[rgba(212,160,23,0.1)]"
                style={{ border: '1px solid rgba(212,160,23,0.12)' }}
              >
                <Facebook size={14} style={{ color: '#A8A29E' }} />
              </a>
              <button
                onClick={handleCopyLink}
                aria-label="Copy link"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-[rgba(212,160,23,0.1)]"
                style={{ border: '1px solid rgba(212,160,23,0.12)' }}
              >
                <Link2 size={14} style={{ color: '#A8A29E' }} />
              </button>
            </div>
          </div>
        </section>

        {/* ── Post Body + Sidebar ────────────────────────────── */}
        <section className="pb-20 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">

            {/* Article Body */}
            <article className="max-w-3xl">
              {/* Featured image placeholder */}
              <div
                className="w-full rounded-2xl mb-10 flex items-center justify-center"
                style={{
                  aspectRatio: '16/9',
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.12)',
                }}
              >
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${catColor}15` }}
                >
                  <Tag size={36} style={{ color: catColor }} />
                </div>
              </div>

              {/* Prose content */}
              <div className="space-y-8">
                {post.content.map((paragraph, i) => {
                  const tocItem = post.tableOfContents[i]
                  return (
                    <div key={i}>
                      {tocItem && (
                        <h2
                          id={tocItem.id}
                          className="font-bold mb-4 scroll-mt-24"
                          style={{
                            fontSize: 'clamp(22px, 3vw, 28px)',
                            fontFamily: 'var(--font-display)',
                            color: '#F5F3EF',
                            letterSpacing: '-0.5px',
                          }}
                        >
                          {tocItem.label}
                        </h2>
                      )}
                      <p
                        className="text-base leading-[1.8]"
                        style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                      >
                        {paragraph}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Author Bio */}
              <div
                className="mt-12 p-6 rounded-2xl flex flex-col sm:flex-row gap-4"
                style={{
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.12)',
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#1B1916' }}
                >
                  <User size={24} style={{ color: '#A8A29E' }} />
                </div>
                <div>
                  <p
                    className="text-base font-bold mb-1"
                    style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                  >
                    {post.author}
                  </p>
                  <p
                    className="text-xs mb-2"
                    style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {post.authorRole}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {post.authorBio}
                  </p>
                </div>
              </div>
            </article>

            {/* Sidebar — Table of Contents (desktop) */}
            <aside className="hidden lg:block">
              <div
                className="sticky top-24 rounded-2xl p-6"
                style={{
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.12)',
                }}
              >
                <h4
                  className="text-sm font-bold mb-4"
                  style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                >
                  Table of Contents
                </h4>
                <nav className="flex flex-col gap-2">
                  {post.tableOfContents.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="text-sm py-1.5 transition-colors duration-200 hover:text-[#D4A017]"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </section>

        {/* ── CTA Banner ─────────────────────────────────────── */}
        <section
          className="py-16 px-6"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(212,160,23,0.08) 0%, transparent 70%), #12100E',
          }}
        >
          <div className="max-w-2xl mx-auto text-center">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1px',
              }}
            >
              Ready to create your own virtual tours?
            </h2>
            <p
              className="text-base mb-8"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              Start building immersive 360-degree experiences with AI-powered tools.
              Free to get started.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-[0_0_24px_rgba(212,160,23,0.3)]"
              style={{
                backgroundColor: '#D4A017',
                color: '#0A0908',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Start Free Trial
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* ── Related Posts ───────────────────────────────────── */}
        <section className="py-20 px-6" style={{ backgroundColor: '#0A0908' }}>
          <div className="max-w-7xl mx-auto">
            <h2
              className="font-bold mb-10 text-center"
              style={{
                fontSize: 'clamp(24px, 3vw, 32px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-0.5px',
              }}
            >
              Related Articles
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => {
                const relCatColor = getCategoryColor(related.category)
                return (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="group rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                    }}
                  >
                    <div
                      className="w-full flex items-center justify-center"
                      style={{ aspectRatio: '16/9', backgroundColor: '#1B1916' }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${relCatColor}15` }}
                      >
                        <Tag size={24} style={{ color: relCatColor }} />
                      </div>
                    </div>
                    <div className="p-5">
                      <span
                        className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
                        style={{
                          color: relCatColor,
                          backgroundColor: `${relCatColor}12`,
                          fontFamily: 'var(--font-dmsans)',
                        }}
                      >
                        {related.category}
                      </span>
                      <h3
                        className="text-sm font-bold leading-snug group-hover:text-[#D4A017] transition-colors duration-200"
                        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                      >
                        {related.title}
                      </h3>
                      <p
                        className="text-xs mt-2"
                        style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                      >
                        {related.readingTime}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
