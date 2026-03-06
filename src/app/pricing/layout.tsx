import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — Spazeo | Plans for Every Business',
  description:
    'Choose the right Spazeo plan for your business. Start free, scale as you grow with AI-powered 360° virtual tours, lead capture, and analytics.',
  openGraph: {
    title: 'Pricing — Spazeo | Plans for Every Business',
    description:
      'Choose the right Spazeo plan for your business. Start free, scale as you grow with AI-powered 360° virtual tours, lead capture, and analytics.',
    siteName: 'Spazeo',
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
