import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Building Showcase | Spazeo',
}

export default function BuildingViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
