'use client'

export const ANALYTICS_METRIC_ROWS = [
  {
    metric: 'Devices',
    where: 'People band',
    counts: 'Distinct deviceId on visitorIdentities',
    honesty: 'Floor',
    validated: 'Yes',
  },
  {
    metric: 'Estimated visitors',
    where: 'People band',
    counts: 'Distinct visitorId with confidence ≥ 70',
    honesty: 'Estimate — never a census',
    validated: 'Yes',
  },
  {
    metric: 'Known contacts',
    where: 'People band',
    counts: 'Visitors with phoneHash from the lead form',
    honesty: 'Unverified phone — people you can call',
    validated: 'Yes',
  },
  {
    metric: 'Views',
    where: 'This period',
    counts: 'tour_view events in the selected window',
    honesty: 'Opens, not people. All-time in caption',
    validated: 'Yes',
  },
  {
    metric: 'Sessions',
    where: 'This period + tour table',
    counts: 'Distinct sessionId (tab) on tour_view',
    honesty: 'A refresh in the same tab is one session',
    validated: 'Yes',
  },
  {
    metric: 'Leads',
    where: 'This period + tour table',
    counts: 'Lead rows created in the selected window',
    honesty: 'Form submits, not unique humans',
    validated: 'Yes',
  },
  {
    metric: 'Avg. scene time',
    where: 'This period',
    counts: 'Mean duration on events in the selected window',
    honesty: 'Only events that sent a duration',
    validated: 'Yes',
  },
  {
    metric: 'Lead / view rate',
    where: 'Under avg. scene time',
    counts: 'Period leads ÷ period views',
    honesty: 'Per view, not per person',
    validated: 'Yes',
  },
  {
    metric: 'Returning',
    where: 'Selected tour only',
    counts: 'Visitors with totalSessions > 1',
    honesty: 'Lifetime sessions, not this window',
    validated: 'Partial',
  },
  {
    metric: 'QR scans / leads',
    where: 'Selected tour · QR placement',
    counts: 'tour_view with qr/mm/camp; leads matched on micromarket',
    honesty: 'Placement attribution, not identity. Follows the period chip',
    validated: 'Yes',
  },
  {
    metric: 'QR with phone',
    where: 'Selected tour · QR placement',
    counts: 'Matched leads that included a phone (leadsWithPhone)',
    honesty: 'Unverified — not OTP. Not the People-band Known contacts count',
    validated: 'Yes',
  },
] as const

const th =
  'text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] font-[family-name:var(--font-dmsans)]'
const td =
  'px-4 py-3 text-[13px] font-[family-name:var(--font-dmsans)] text-[var(--text-secondary)]'

export function AnalyticsMetricGlossary() {
  return (
    <section aria-labelledby="metric-glossary-heading" className="mb-6">
      <h2
        id="metric-glossary-heading"
        className="m-0 mb-3 text-[13px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] font-[family-name:var(--font-dmsans)]"
      >
        How numbers are counted
      </h2>
      <div className="overflow-hidden rounded-xl border border-[var(--border-visible)] bg-[var(--bg-elevated)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {['Metric', 'Where', 'Counts', 'Honesty', 'Validated'].map((h) => (
                  <th key={h} scope="col" className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ANALYTICS_METRIC_ROWS.map((row) => (
                <tr key={row.metric} className="border-b border-[var(--border-subtle)]">
                  <td className={`${td} whitespace-nowrap text-[var(--text-primary)]`}>
                    {row.metric}
                  </td>
                  <td className={td}>{row.where}</td>
                  <td className={td}>{row.counts}</td>
                  <td className={td}>{row.honesty}</td>
                  <td
                    className={`${td} text-xs font-semibold`}
                    style={{
                      color:
                        row.validated === 'Yes'
                          ? 'var(--success)'
                          : 'var(--warning)',
                    }}
                  >
                    {row.validated}
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
