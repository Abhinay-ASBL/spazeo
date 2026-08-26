'use client'

export const ANALYTICS_METRIC_ROWS = [
  {
    metric: 'Devices',
    counts: 'Distinct deviceId (cookie + localStorage + IndexedDB)',
    meaning: 'Floor. One person, three browsers = 3.',
    confidence: 'High',
  },
  {
    metric: 'Estimated visitors',
    counts: 'Distinct visitorId where confidence ≥ 70',
    meaning: 'Best estimate of unique humans. Not a census.',
    confidence: 'Medium',
  },
  {
    metric: 'Known contacts',
    counts: 'Distinct visitorId with a phoneHash',
    meaning: 'People you can actually call. Phone is unverified.',
    confidence: 'High',
  },
  {
    metric: 'Views',
    counts: 'tour_view events in the period',
    meaning: 'Opens, not people. Refresh = another view.',
    confidence: 'High',
  },
  {
    metric: 'Sessions',
    counts: 'Distinct sessionId on tour_view',
    meaning: 'One tab until it closes. Not unique visitors.',
    confidence: 'High',
  },
  {
    metric: 'Leads',
    counts: 'Lead rows created in the period',
    meaning: 'Form submits. Same person can submit twice.',
    confidence: 'High',
  },
  {
    metric: 'Avg. scene time',
    counts: 'Mean duration on events that sent one',
    meaning: 'Only events that reported duration.',
    confidence: 'Medium',
  },
  {
    metric: 'Lead / view rate',
    counts: 'Period leads ÷ period views',
    meaning: 'Conversion per view, not per person.',
    confidence: 'High',
  },
  {
    metric: 'Returning',
    counts: 'Visitors with totalSessions > 1',
    meaning: 'Lifetime, not this window.',
    confidence: 'Medium',
  },
] as const

const th =
  'text-left px-4 py-3 text-[13px] font-medium text-[var(--text-muted)] font-[family-name:var(--font-dmsans)]'
const td =
  'px-4 py-3 text-[13px] font-[family-name:var(--font-dmsans)] text-[var(--text-secondary)]'

export function AnalyticsMetricGlossary() {
  return (
    <section aria-labelledby="metric-glossary-heading" className="mb-6">
      <h2
        id="metric-glossary-heading"
        className="mb-3 font-[family-name:var(--font-dmsans)] text-[15px] font-semibold text-[var(--text-primary)]"
      >
        How these numbers are counted
      </h2>
      <div className="overflow-hidden rounded-xl border border-[var(--border-visible)] bg-[var(--bg-elevated)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {['Metric', 'What it counts', 'Honest meaning', 'Confidence'].map((h) => (
                  <th key={h} scope="col" className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ANALYTICS_METRIC_ROWS.map((row) => (
                <tr key={row.metric} className="border-b border-[var(--border-subtle)] last:border-b-0">
                  <td className={`${td} whitespace-nowrap font-medium text-[var(--gold-primary)]`}>
                    {row.metric}
                  </td>
                  <td className={td}>{row.counts}</td>
                  <td className={td}>{row.meaning}</td>
                  <td className={td}>
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        color:
                          row.confidence === 'High'
                            ? 'var(--success)'
                            : 'var(--gold-primary)',
                        backgroundColor:
                          row.confidence === 'High'
                            ? 'var(--success-bg)'
                            : 'var(--gold-glow)',
                      }}
                    >
                      {row.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
