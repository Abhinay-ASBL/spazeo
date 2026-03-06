import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Product | Spazeo',
  description:
    'The Spazeo platform: AI-powered 360° virtual tours, Gaussian splatting, real-time analytics, and seamless integrations with MLS, Zillow, Realtor.com, WordPress, and more.',
  openGraph: {
    title: 'Product | Spazeo',
    description:
      'The Spazeo platform: AI-powered 360° virtual tours, Gaussian splatting, real-time analytics, and seamless integrations with MLS, Zillow, Realtor.com, WordPress, and more.',
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
