import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div
      className="ml-0 flex min-h-screen items-center justify-center md:ml-[240px]"
      style={{ backgroundColor: '#0A0908' }}
    >
      <Loader2 size={36} className="animate-spin" style={{ color: '#D4A017' }} />
    </div>
  )
}
