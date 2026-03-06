import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Spazeo Blog',
    default: 'Blog | Spazeo',
  },
  description:
    'Insights, tutorials, and product updates for virtual tour professionals. Learn how to create stunning 360° experiences with AI-powered tools.',
  openGraph: {
    title: 'Spazeo Blog — Insights for Virtual Tour Professionals',
    description:
      'Insights, tutorials, and product updates for virtual tour professionals. Learn how to create stunning 360° experiences with AI-powered tools.',
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
