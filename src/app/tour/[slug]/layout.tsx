import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Virtual Tour — Spazeo',
  description:
    'Experience this immersive 360° virtual tour powered by Spazeo. Step inside any space from anywhere.',
  openGraph: {
    title: 'Virtual Tour — Spazeo',
    description:
      'Experience this immersive 360° virtual tour powered by Spazeo. Step inside any space from anywhere.',
    siteName: 'Spazeo',
  },
}

export default function TourViewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
