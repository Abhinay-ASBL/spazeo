import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Features | Spazeo',
  description:
    "Explore Spazeo's powerful features: 360° panorama engine, AI virtual staging, smart analytics, and more. Everything you need to create stunning virtual tours.",
  openGraph: {
    title: 'Features | Spazeo',
    description:
      "Explore Spazeo's powerful features: 360° panorama engine, AI virtual staging, smart analytics, and more. Everything you need to create stunning virtual tours.",
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
