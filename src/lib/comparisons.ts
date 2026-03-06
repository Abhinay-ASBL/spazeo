export interface CompetitorFeature {
  label: string
  spazeo: boolean | string
  competitor: boolean | string
}

export interface CompetitorData {
  slug: string
  name: string
  tagline: string
  features: CompetitorFeature[]
  pricing: {
    spazeo: string
    competitor: string
    spazeoNote: string
    competitorNote: string
  }
}

export const COMPETITORS: CompetitorData[] = [
  {
    slug: 'matterport',
    name: 'Matterport',
    tagline: 'Powerful 3D capture, but expensive and hardware-locked',
    features: [
      { label: 'AI-powered scene analysis', spazeo: true, competitor: false },
      { label: 'AI virtual staging', spazeo: true, competitor: false },
      { label: 'AI-generated descriptions', spazeo: true, competitor: false },
      { label: 'No proprietary hardware required', spazeo: true, competitor: false },
      { label: '360 panorama viewer', spazeo: true, competitor: true },
      { label: '3D dollhouse view', spazeo: 'Coming soon', competitor: true },
      { label: 'Floor plan generation', spazeo: true, competitor: true },
      { label: 'Lead capture forms', spazeo: true, competitor: true },
      { label: 'Custom branding', spazeo: true, competitor: 'Pro plan only' },
      { label: 'API access', spazeo: 'Professional+', competitor: 'Enterprise only' },
      { label: 'White-label option', spazeo: true, competitor: false },
      { label: 'Free plan available', spazeo: '3 tours free', competitor: '1 space free' },
      { label: 'INR pricing for India', spazeo: true, competitor: false },
      { label: 'Gaussian Splatting support', spazeo: true, competitor: false },
    ],
    pricing: {
      spazeo: 'From $0/mo',
      competitor: 'From $11.99/mo',
      spazeoNote: 'Free plan with 3 tours. Pro from $19/mo. No hardware costs.',
      competitorNote: 'Requires Matterport-compatible camera ($400+). Plans start at $11.99/mo for limited features.',
    },
  },
  {
    slug: 'cloudpano',
    name: 'CloudPano',
    tagline: 'Basic virtual tours without AI intelligence',
    features: [
      { label: 'AI-powered scene analysis', spazeo: true, competitor: false },
      { label: 'AI virtual staging', spazeo: true, competitor: false },
      { label: 'AI-generated descriptions', spazeo: true, competitor: false },
      { label: '360 panorama viewer', spazeo: true, competitor: true },
      { label: 'Hotspot navigation', spazeo: true, competitor: true },
      { label: 'Lead capture forms', spazeo: true, competitor: true },
      { label: 'Custom branding', spazeo: true, competitor: true },
      { label: 'Floor plan generation', spazeo: true, competitor: false },
      { label: 'Real-time analytics', spazeo: true, competitor: 'Basic only' },
      { label: 'Gaussian Splatting support', spazeo: true, competitor: false },
      { label: 'Team collaboration', spazeo: true, competitor: 'Limited' },
      { label: 'API access', spazeo: 'Professional+', competitor: false },
      { label: 'White-label option', spazeo: true, competitor: 'Extra cost' },
      { label: 'Free plan available', spazeo: '3 tours free', competitor: 'Trial only' },
    ],
    pricing: {
      spazeo: 'From $0/mo',
      competitor: 'From $19.95/mo',
      spazeoNote: 'Free plan with 3 tours. AI features included in all paid plans.',
      competitorNote: 'No free plan. Basic plan starts at $19.95/mo without AI features.',
    },
  },
  {
    slug: 'kuula',
    name: 'Kuula',
    tagline: 'Simple tours, limited AI and analytics',
    features: [
      { label: 'AI-powered scene analysis', spazeo: true, competitor: false },
      { label: 'AI virtual staging', spazeo: true, competitor: false },
      { label: 'AI-generated descriptions', spazeo: true, competitor: false },
      { label: '360 panorama viewer', spazeo: true, competitor: true },
      { label: 'Hotspot navigation', spazeo: true, competitor: true },
      { label: 'VR headset support', spazeo: true, competitor: true },
      { label: 'Lead capture forms', spazeo: true, competitor: 'Pro plan only' },
      { label: 'Custom branding', spazeo: true, competitor: 'Pro plan only' },
      { label: 'Floor plan generation', spazeo: true, competitor: false },
      { label: 'Advanced analytics', spazeo: true, competitor: false },
      { label: 'Gaussian Splatting support', spazeo: true, competitor: false },
      { label: 'API access', spazeo: 'Professional+', competitor: false },
      { label: 'Team collaboration', spazeo: true, competitor: 'Business only' },
      { label: 'Free plan available', spazeo: '3 tours free', competitor: '1 tour free' },
    ],
    pricing: {
      spazeo: 'From $0/mo',
      competitor: 'From $7.99/mo',
      spazeoNote: 'Free plan with 3 tours and AI analysis. Full AI suite from $19/mo.',
      competitorNote: 'Low entry price but no AI features. Pro plan ($15.99/mo) needed for lead capture.',
    },
  },
  {
    slug: 'ricoh360',
    name: 'RICOH360 Tours',
    tagline: 'Hardware-dependent with limited software features',
    features: [
      { label: 'AI-powered scene analysis', spazeo: true, competitor: false },
      { label: 'AI virtual staging', spazeo: true, competitor: false },
      { label: 'AI-generated descriptions', spazeo: true, competitor: false },
      { label: 'No proprietary hardware required', spazeo: true, competitor: false },
      { label: '360 panorama viewer', spazeo: true, competitor: true },
      { label: 'Hotspot navigation', spazeo: true, competitor: true },
      { label: 'Floor plan generation', spazeo: true, competitor: 'Schematic only' },
      { label: 'Lead capture forms', spazeo: true, competitor: false },
      { label: 'Custom branding', spazeo: true, competitor: 'Limited' },
      { label: 'Advanced analytics', spazeo: true, competitor: false },
      { label: 'Gaussian Splatting support', spazeo: true, competitor: false },
      { label: 'API access', spazeo: 'Professional+', competitor: false },
      { label: 'White-label option', spazeo: true, competitor: false },
      { label: 'Free plan available', spazeo: '3 tours free', competitor: 'With camera purchase' },
    ],
    pricing: {
      spazeo: 'From $0/mo',
      competitor: 'From $49.99/mo',
      spazeoNote: 'Use any 360 camera. Free plan available. AI included in all paid tiers.',
      competitorNote: 'Requires Ricoh Theta camera ($400+). Software plans start at $49.99/mo.',
    },
  },
  {
    slug: '3dvista',
    name: '3DVista',
    tagline: 'Desktop software with a steep learning curve',
    features: [
      { label: 'AI-powered scene analysis', spazeo: true, competitor: false },
      { label: 'AI virtual staging', spazeo: true, competitor: false },
      { label: 'AI-generated descriptions', spazeo: true, competitor: false },
      { label: 'Cloud-based (no install needed)', spazeo: true, competitor: false },
      { label: '360 panorama viewer', spazeo: true, competitor: true },
      { label: 'Hotspot navigation', spazeo: true, competitor: true },
      { label: 'Floor plan integration', spazeo: true, competitor: true },
      { label: 'Lead capture forms', spazeo: true, competitor: 'Requires setup' },
      { label: 'Custom branding', spazeo: true, competitor: true },
      { label: 'Real-time analytics', spazeo: true, competitor: false },
      { label: 'Gaussian Splatting support', spazeo: true, competitor: false },
      { label: 'Team collaboration', spazeo: true, competitor: false },
      { label: 'Automatic updates', spazeo: true, competitor: false },
      { label: 'Free plan available', spazeo: '3 tours free', competitor: false },
    ],
    pricing: {
      spazeo: 'From $0/mo',
      competitor: '$498 one-time',
      spazeoNote: 'Free plan to start. Subscription includes hosting, updates, and AI.',
      competitorNote: 'One-time purchase ($498) but requires separate hosting. No AI features included.',
    },
  },
  {
    slug: 'eyespy360',
    name: 'EyeSpy360',
    tagline: 'Basic tours without modern AI capabilities',
    features: [
      { label: 'AI-powered scene analysis', spazeo: true, competitor: false },
      { label: 'AI virtual staging', spazeo: true, competitor: false },
      { label: 'AI-generated descriptions', spazeo: true, competitor: false },
      { label: '360 panorama viewer', spazeo: true, competitor: true },
      { label: 'Hotspot navigation', spazeo: true, competitor: true },
      { label: 'Floor plan generation', spazeo: true, competitor: false },
      { label: 'Lead capture forms', spazeo: true, competitor: true },
      { label: 'Custom branding', spazeo: true, competitor: 'Paid plans only' },
      { label: 'Advanced analytics', spazeo: true, competitor: 'Basic only' },
      { label: 'Gaussian Splatting support', spazeo: true, competitor: false },
      { label: 'API access', spazeo: 'Professional+', competitor: false },
      { label: 'White-label option', spazeo: true, competitor: false },
      { label: 'Team collaboration', spazeo: true, competitor: 'Limited' },
      { label: 'Free plan available', spazeo: '3 tours free', competitor: 'Trial only' },
    ],
    pricing: {
      spazeo: 'From $0/mo',
      competitor: 'From $14.99/mo',
      spazeoNote: 'Free plan with 3 tours. AI features included in all paid plans.',
      competitorNote: 'No free plan after trial. No AI features at any price point.',
    },
  },
]

export function getCompetitorBySlug(slug: string): CompetitorData | undefined {
  return COMPETITORS.find((c) => c.slug === slug)
}

export function getAllCompetitorSlugs(): string[] {
  return COMPETITORS.map((c) => c.slug)
}
