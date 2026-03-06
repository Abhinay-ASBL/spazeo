import { Building2 } from 'lucide-react'

const COMPANIES = [
  'Coldwell Banker',
  'RE/MAX',
  'Century 21',
  'Keller Williams',
  'Sotheby\'s',
  'Compass',
]

export function LogoBar() {
  return (
    <section className="relative py-12 border-y border-[rgba(212,160,23,0.08)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
        <p
          className="text-center text-sm text-[#6B6560] mb-8"
          style={{ fontFamily: 'var(--font-dmsans)' }}
        >
          Trusted by leading real estate professionals
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {COMPANIES.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 text-[#4A4540] transition-colors duration-300 hover:text-[#6B6560]"
            >
              <Building2 size={20} />
              <span
                className="text-sm font-semibold tracking-wide"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
