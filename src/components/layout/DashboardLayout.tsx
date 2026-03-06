'use client'

import { Sidebar } from '@/components/layout/Sidebar'

interface DashboardShellProps {
  children: React.ReactNode
}

/**
 * DashboardShell — wrapper used by (dashboard)/layout.tsx.
 * Renders the Sidebar + main content area.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0908' }}>
      <Sidebar />
      <div className="md:ml-[240px] flex-1 flex flex-col min-h-screen">
        <main
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: '#0A0908' }}
          id="main-content"
          aria-label="Main content"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// Keep backward compat export name
export { DashboardShell as DashboardLayout }
export default DashboardShell
