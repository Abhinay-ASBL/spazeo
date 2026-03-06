import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Descriptions | Spazeo Features',
  description:
    'Generate compelling, accurate property descriptions from panoramic photos. Customize tone, length, and emphasis with AI-powered copy generation.',
  openGraph: {
    title: 'AI Descriptions | Spazeo Features',
    description:
      'Generate compelling property descriptions from panoramic photos with AI-powered copy generation.',
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function AIDescriptionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
