import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compare Spazeo vs Competitors',
  description:
    'See how Spazeo compares to Matterport, CloudPano, Kuula, RICOH360, 3DVista, and EyeSpy360. AI-powered virtual tours at a better price.',
  openGraph: {
    title: 'Compare Spazeo vs Competitors',
    description:
      'See how Spazeo compares to Matterport, CloudPano, Kuula, RICOH360, 3DVista, and EyeSpy360.',
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
