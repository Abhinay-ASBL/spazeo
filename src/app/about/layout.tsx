import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About | Spazeo',
  description:
    "Learn about Spazeo's mission to democratize spatial content creation. Meet our team of engineers, designers, and innovators building the future of immersive experiences.",
  openGraph: {
    title: 'About | Spazeo',
    description:
      "Learn about Spazeo's mission to democratize spatial content creation. Meet our team of engineers, designers, and innovators building the future of immersive experiences.",
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
