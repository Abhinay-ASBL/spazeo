import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Tours',
  description: 'Create, manage, and publish your 360° virtual tours on Spazeo.',
  openGraph: {
    title: 'My Tours — Spazeo',
    description: 'Create, manage, and publish your 360° virtual tours on Spazeo.',
    siteName: 'Spazeo',
  },
}

export default function ToursLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
