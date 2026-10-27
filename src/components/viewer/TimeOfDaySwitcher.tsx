'use client'

import { Sunrise, Sun, Sunset, Moon, type LucideIcon } from 'lucide-react'

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'sunset' | 'night'

type ChipId = 'morning' | 'afternoon' | 'evening' | 'night'

type VariantScene = {
  _id: string
  timeOfDay?: TimeOfDay | null
  imageUrl?: string | null
}

/** sunset and evening share the Evening chip (Sunset icon). */
const CHIPS: Array<{
  id: ChipId
  label: string
  Icon: LucideIcon
  matches: TimeOfDay[]
}> = [
  { id: 'morning', label: 'Morning', Icon: Sunrise, matches: ['morning'] },
  { id: 'afternoon', label: 'Afternoon', Icon: Sun, matches: ['afternoon'] },
  { id: 'evening', label: 'Evening', Icon: Sunset, matches: ['evening', 'sunset'] },
  { id: 'night', label: 'Night', Icon: Moon, matches: ['night'] },
]

function chipIdFor(timeOfDay: TimeOfDay | null | undefined): ChipId | null {
  if (!timeOfDay) return null
  if (timeOfDay === 'sunset' || timeOfDay === 'evening') return 'evening'
  if (timeOfDay === 'morning' || timeOfDay === 'afternoon' || timeOfDay === 'night') {
    return timeOfDay
  }
  return null
}

function pickSceneForChip(variants: VariantScene[], chipId: ChipId): VariantScene | undefined {
  const chip = CHIPS.find((c) => c.id === chipId)
  if (!chip) return undefined
  // Prefer evening over sunset when both exist for the Evening chip
  for (const tod of chip.matches) {
    const match = variants.find((v) => v.timeOfDay === tod)
    if (match) return match
  }
  return undefined
}

interface Props {
  variants: VariantScene[]
  activeTimeOfDay?: TimeOfDay | null
  onSwitch: (sceneId: string, timeOfDay: TimeOfDay) => void
  /** Called on chip hover so parent can preload adjacent panorama URLs. */
  onHoverVariant?: (imageUrl: string) => void
}

export function TimeOfDaySwitcher({
  variants,
  activeTimeOfDay,
  onSwitch,
  onHoverVariant,
}: Props) {
  if (variants.length <= 1) return null

  const activeChip = chipIdFor(activeTimeOfDay)
  const available = CHIPS.filter((chip) => pickSceneForChip(variants, chip.id))

  if (available.length <= 1) return null

  return (
    <div
      role="group"
      aria-label="Time of day"
      className="rounded-full flex items-center gap-0.5 p-1"
      style={{
        backgroundColor: 'rgba(10,9,8,0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      {available.map(({ id, label, Icon }) => {
        const scene = pickSceneForChip(variants, id)
        if (!scene?.timeOfDay) return null
        const isActive = activeChip === id
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            onClick={() => onSwitch(scene._id, scene.timeOfDay!)}
            onMouseEnter={() => {
              if (scene.imageUrl) onHoverVariant?.(scene.imageUrl)
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isActive ? '#2DD4BF' : 'transparent',
              color: isActive ? '#0A0908' : '#A8A29E',
            }}
          >
            <Icon size={16} strokeWidth={1.5} />
          </button>
        )
      })}
    </div>
  )
}
