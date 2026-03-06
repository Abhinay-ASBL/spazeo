import { Loader2 } from 'lucide-react'

export default function RootLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#0A0908' }}
    >
      <Loader2 size={36} className="animate-spin" style={{ color: '#D4A017' }} />
    </div>
  )
}
