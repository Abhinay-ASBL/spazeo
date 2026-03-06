import {
  Brain,
  Eye,
  Users,
  BarChart3,
  Sparkles,
  Globe,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Scene Analysis',
    description:
      'Automatically detect rooms, objects, and spatial layout. AI generates descriptions, tags, and optimization suggestions.',
    color: '#D4A017',
  },
  {
    icon: Eye,
    title: 'Interactive 360° Viewer',
    description:
      'Smooth panoramic navigation with hotspot-based scene transitions. Works beautifully on desktop, tablet, and mobile.',
    color: '#2DD4BF',
  },
  {
    icon: Users,
    title: 'Smart Lead Capture',
    description:
      'Capture visitor information at the perfect moment. Integrated forms, scheduling links, and instant agent notifications.',
    color: '#FB7A54',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description:
      'Track views, engagement time, popular scenes, and conversion rates. Understand exactly how buyers explore your tours.',
    color: '#D4A017',
  },
  {
    icon: Sparkles,
    title: 'Virtual Staging',
    description:
      'Transform empty rooms with AI-generated furniture and decor. Multiple design styles, photorealistic results in seconds.',
    color: '#2DD4BF',
  },
  {
    icon: Globe,
    title: 'One-Click Publishing',
    description:
      'Share tours with a single link. Embed on your website, post to social media, or integrate with MLS platforms.',
    color: '#FB7A54',
  },
]

export function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            className="inline-block text-sm font-semibold text-[#D4A017] tracking-wider uppercase mb-4"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            Features
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F5F3EF] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Everything you need to create
            <br className="hidden sm:block" />
            <span className="text-gradient"> stunning virtual tours</span>
          </h2>
          <p
            className="max-w-2xl mx-auto text-base md:text-lg text-[#A8A29E] leading-relaxed"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            From AI scene analysis to one-click publishing, Spazeo gives you
            the tools to create immersive experiences that convert.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group bento-card p-8 flex flex-col"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    backgroundColor: `${feature.color}12`,
                    border: `1px solid ${feature.color}20`,
                  }}
                >
                  <Icon size={22} style={{ color: feature.color }} />
                </div>
                <h3
                  className="text-lg font-semibold text-[#F5F3EF] mb-2"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm text-[#A8A29E] leading-relaxed"
                  style={{ fontFamily: 'var(--font-dmsans)' }}
                >
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
