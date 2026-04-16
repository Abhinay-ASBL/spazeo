'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Eye,
  MousePointerClick,
  ImageIcon,
  Video,
  DoorOpen,
  DoorClosed,
  Flag,
  Compass,
} from 'lucide-react'

const EVENT_LABEL: Record<string, string> = {
  tour_view: 'Opened tour',
  scene_view: 'Entered scene',
  scene_exit: 'Left scene',
  hotspot_click: 'Clicked hotspot',
  hotspot_media_view: 'Viewed media',
  view_direction: 'Looked around',
  lead_form_shown: 'Saw lead form',
  lead_form_submitted: 'Submitted lead',
  session_end: 'Ended session',
}

function iconFor(event: string) {
  switch (event) {
    case 'tour_view':
      return <Eye size={16} style={{ color: '#D4A017' }} />
    case 'scene_view':
      return <DoorOpen size={16} style={{ color: '#2DD4BF' }} />
    case 'scene_exit':
      return <DoorClosed size={16} style={{ color: '#6B6560' }} />
    case 'hotspot_click':
      return <MousePointerClick size={16} style={{ color: '#D4A017' }} />
    case 'hotspot_media_view':
      return <ImageIcon size={16} style={{ color: '#2DD4BF' }} />
    case 'view_direction':
      return <Compass size={16} style={{ color: '#6B6560' }} />
    case 'lead_form_submitted':
      return <Flag size={16} style={{ color: '#FB7A54' }} />
    default:
      return <Video size={16} style={{ color: '#6B6560' }} />
  }
}

interface Props {
  leadId: Id<'leads'>
}

export function LeadActivityDrawer({ leadId }: Props) {
  const data = useQuery(api.leads.getWithActivity, { leadId })
  if (data === undefined) return <div className="p-4 text-sm text-[#6B6560]">Loading…</div>
  if (data === null) return <div className="p-4 text-sm text-[#6B6560]">No activity available.</div>

  const { timeline, sceneTitles, lead } = data

  const dwellByScene: Record<string, number> = {}
  for (const e of timeline) {
    if (e.event === 'scene_exit' && e.sceneId && e.duration) {
      dwellByScene[e.sceneId] = (dwellByScene[e.sceneId] ?? 0) + e.duration
    }
  }

  const yawSamples = timeline.filter((e) => e.event === 'view_direction').length
  const visible = timeline.filter((e) => e.event !== 'view_direction')
  const dwellMax = Math.max(1, ...Object.values(dwellByScene))

  return (
    <div className="rounded-xl border border-[#2E2A24] bg-[#12100E] p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[#F5F3EF]" style={{ fontFamily: 'var(--font-jakarta)' }}>
          Session activity
        </h3>
        <p className="mt-1 text-xs text-[#A8A29E]">
          {lead.sessionId ? `${visible.length} events · ${yawSamples} direction samples` : 'No session linked.'}
        </p>
      </div>

      {Object.keys(dwellByScene).length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#A8A29E]">
            Scene dwell time
          </p>
          <div className="space-y-1">
            {Object.entries(dwellByScene).map(([sid, sec]) => (
              <div key={sid} className="flex items-center gap-2 text-xs">
                <span className="w-40 truncate text-[#F5F3EF]">{sceneTitles[sid] ?? sid.slice(-6)}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1B1916]">
                  <div
                    className="h-full rounded-full bg-[#2DD4BF]"
                    style={{ width: `${Math.min(100, (sec / dwellMax) * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-[#A8A29E]">{sec}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ol className="space-y-2">
        {visible.map((e) => (
          <li key={e._id} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5">{iconFor(e.event)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[#F5F3EF]">{EVENT_LABEL[e.event] ?? e.event}</span>
                {e.sceneId && (
                  <span className="text-[#6B6560]">· {sceneTitles[e.sceneId] ?? e.sceneId.slice(-6)}</span>
                )}
                {e.duration !== undefined && <span className="text-[#6B6560]">· {e.duration}s</span>}
              </div>
              <div className="text-[#6B6560]">{new Date(e.timestamp).toLocaleTimeString()}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
