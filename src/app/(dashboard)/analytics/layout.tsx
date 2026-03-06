import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Track your virtual tour performance, viewer engagement, and conversion metrics on Spazeo.',
  openGraph: {
    title: 'Analytics — Spazeo',
    description: 'Track your virtual tour performance, viewer engagement, and conversion metrics on Spazeo.',
    siteName: 'Spazeo',
  },
}

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
