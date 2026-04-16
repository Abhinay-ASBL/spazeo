'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface Props {
  tourId: Id<'tours'>
}

export function SessionsTable({ tourId }: Props) {
  const rows = useQuery(api.analytics.getSessionsByTour, { tourId, limit: 100 })
  const [openSession, setOpenSession] = useState<string | null>(null)
  const timeline = useQuery(
    api.analytics.getBySession,
    openSession ? { sessionId: openSession, tourId } : 'skip'
  )

  if (rows === undefined) return <div className="text-sm text-[#A8A29E]">Loading sessions...</div>
  if (!rows || rows.length === 0)
    return <div className="text-sm text-[#A8A29E]">No sessions yet.</div>

  return (
    <div>
      <div className="overflow-auto rounded-xl border border-[#2E2A24]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1B1916] text-[#A8A29E]">
            <tr>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Scenes</th>
              <th className="px-3 py-2">Hotspot clicks</th>
              <th className="px-3 py-2">Device</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Lead</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.sessionId}
                className="cursor-pointer border-t border-[#2E2A24] text-[#F5F3EF] hover:bg-[#1B1916]"
                onClick={() => setOpenSession(r.sessionId === openSession ? null : r.sessionId)}
              >
                <td className="px-3 py-2">{new Date(r.startedAt).toLocaleString()}</td>
                <td className="px-3 py-2">{r.duration}s</td>
                <td className="px-3 py-2">{r.scenesVisited}</td>
                <td className="px-3 py-2">{r.hotspotClicks}</td>
                <td className="px-3 py-2">{r.deviceType ?? '—'}</td>
                <td className="px-3 py-2">{r.country ?? '—'}</td>
                <td className="px-3 py-2">{r.leadId ? 'Yes' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openSession && timeline && (
        <div className="mt-4 rounded-xl border border-[#2E2A24] bg-[#12100E] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-[#F5F3EF]">Timeline · {openSession.slice(0, 8)}</span>
            <button
              className="text-xs text-[#A8A29E] hover:text-[#F5F3EF]"
              onClick={() => setOpenSession(null)}
            >
              Close
            </button>
          </div>
          <ol className="space-y-1 text-xs text-[#A8A29E]">
            {timeline
              .filter((e) => e.event !== 'view_direction')
              .map((e) => (
                <li key={e._id}>
                  <span className="text-[#F5F3EF]">{e.event}</span>
                  {e.sceneId && <span> · scene {String(e.sceneId).slice(-6)}</span>}
                  {e.duration !== undefined && <span> · {e.duration}s</span>}
                  <span className="ml-2">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  )
}
