import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Virtual Staging | Spazeo Features',
  description:
    'Transform empty rooms into beautifully staged spaces in seconds. Spazeo AI Virtual Staging uses advanced AI to generate photorealistic furniture and decor placements.',
  openGraph: {
    title: 'AI Virtual Staging | Spazeo Features',
    description:
      'Transform empty rooms into beautifully staged spaces in seconds with AI-powered virtual staging.',
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function AIStagingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
