import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Scene Analysis | Spazeo Features',
  description:
    'Automatic scene quality scoring, object detection, room classification, and improvement suggestions powered by computer vision AI.',
  openGraph: {
    title: 'AI Scene Analysis | Spazeo Features',
    description:
      'Automatic scene quality scoring, object detection, and improvement suggestions powered by AI.',
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function AIAnalysisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
