import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of your Spazeo virtual tours, views, leads, and recent activity.',
  openGraph: {
    title: 'Dashboard — Spazeo',
    description: 'Overview of your Spazeo virtual tours, views, leads, and recent activity.',
    siteName: 'Spazeo',
  },
}

export default function DashboardPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
