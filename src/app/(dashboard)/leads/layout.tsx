import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leads',
  description: 'Manage and follow up on captured leads from your Spazeo virtual tours.',
  openGraph: {
    title: 'Leads — Spazeo',
    description: 'Manage and follow up on captured leads from your Spazeo virtual tours.',
    siteName: 'Spazeo',
  },
}

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
