const STATS = [
  { value: '10,000+', label: 'Tours Created' },
  { value: '2M+', label: 'Tour Views' },
  { value: '500+', label: 'Real Estate Agents' },
  { value: '98%', label: 'Satisfaction Rate' },
]

export function StatsBar() {
  return (
    <section className="relative py-20 border-y border-[rgba(212,160,23,0.08)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(212,160,23,0.06),transparent_70%)]" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-[60px]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {stat.value}
              </div>
              <div
                className="text-sm text-[#A8A29E]"
                style={{ fontFamily: 'var(--font-dmsans)' }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
