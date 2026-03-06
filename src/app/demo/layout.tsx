import { Navbar } from '@/components/layout/Navbar'

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-16">
        {children}
      </main>
    </>
  )
}
