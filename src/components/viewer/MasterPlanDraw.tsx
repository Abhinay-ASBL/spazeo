'use client'

import { useEffect, useRef, useState } from 'react'
import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import { MapPin, Hexagon, MousePointer2, Trash2, Save, Loader2 } from 'lucide-react'
import type * as MaplibreGLType from 'maplibre-gl'

type Mode = 'point' | 'polygon' | 'select'

export interface MasterPlanDrawProps {
  map: MaplibreGLType.Map
  /** Previously-saved GeoJSON FeatureCollection, if any */
  initialGeoJson?: string | null
  onSave: (geoJson: string) => Promise<void>
}

const TOOLS: Array<{ mode: Mode; label: string; icon: typeof MapPin }> = [
  { mode: 'point', label: 'Pin', icon: MapPin },
  { mode: 'polygon', label: 'Draw zone', icon: Hexagon },
  { mode: 'select', label: 'Select / edit', icon: MousePointer2 },
]

export function MasterPlanDraw({ map, initialGeoJson, onSave }: MasterPlanDrawProps) {
  const drawRef = useRef<TerraDraw | null>(null)
  const [mode, setMode] = useState<Mode>('select')
  const [featureCount, setFeatureCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([])

  useEffect(() => {
    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [
        new TerraDrawPointMode({ styles: { pointColor: '#D4A017', pointOutlineColor: '#0A0908' } }),
        new TerraDrawPolygonMode({
          styles: {
            fillColor: '#2DD4BF',
            fillOpacity: 0.18,
            outlineColor: '#2DD4BF',
            outlineWidth: 2,
          },
        }),
        new TerraDrawSelectMode({
          flags: {
            point: { feature: { draggable: true } },
            polygon: {
              feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } },
            },
          },
        }),
      ],
    })
    drawRef.current = draw
    draw.start()
    draw.setMode('select')

    if (initialGeoJson) {
      try {
        const parsed = JSON.parse(initialGeoJson)
        if (parsed?.features?.length) draw.addFeatures(parsed.features)
      } catch {
        // ignore malformed/legacy data
      }
    }

    const sync = () => {
      setFeatureCount(draw.getSnapshot().length)
    }
    draw.on('finish', () => {
      sync()
      // Placing a point/polygon leaves the tool armed for another one, which
      // disables map dragging (clicks place features instead of panning) —
      // that reads as "the map/model is frozen". Drop back to select so a
      // normal drag immediately pans again.
      draw.setMode('select')
      setMode('select')
    })
    draw.on('change', sync)
    sync()

    draw.on('select', (id) => setSelectedIds([id]))
    draw.on('deselect', () => setSelectedIds([]))

    return () => {
      draw.stop()
      drawRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  const setToolMode = (m: Mode) => {
    setMode(m)
    drawRef.current?.setMode(m)
  }

  const deleteSelected = () => {
    const draw = drawRef.current
    if (!draw || selectedIds.length === 0) return
    draw.removeFeatures(selectedIds)
    setSelectedIds([])
    setFeatureCount(draw.getSnapshot().length)
  }

  const handleSave = async () => {
    const draw = drawRef.current
    if (!draw) return
    setSaving(true)
    try {
      const features = draw.getSnapshot()
      await onSave(JSON.stringify({ type: 'FeatureCollection', features }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="absolute left-6 top-6 z-10 flex flex-col gap-1 rounded-xl p-1.5"
      style={{
        background: 'rgba(18,16,14,0.85)',
        border: '1px solid rgba(212,160,23,0.22)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {TOOLS.map(({ mode: m, label, icon: Icon }) => (
        <button
          key={m}
          type="button"
          onClick={() => setToolMode(m)}
          title={label}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
          style={{
            background: mode === m ? 'rgba(212,160,23,0.18)' : 'transparent',
            color: mode === m ? '#D4A017' : '#A8A29E',
          }}
        >
          <Icon size={16} strokeWidth={1.8} />
        </button>
      ))}

      <div className="my-0.5 h-px" style={{ background: 'rgba(245,243,239,0.08)' }} />

      <button
        type="button"
        onClick={deleteSelected}
        disabled={selectedIds.length === 0}
        title="Delete selected"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#FB7A54] transition-colors disabled:opacity-30"
        style={{ background: 'transparent' }}
      >
        <Trash2 size={16} strokeWidth={1.8} />
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        title={`Save (${featureCount} feature${featureCount === 1 ? '' : 's'})`}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4A017] text-[#0A0908] transition-colors hover:bg-[#E5B120] disabled:opacity-50"
      >
        {saving ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : (
          <Save size={16} strokeWidth={1.8} />
        )}
      </button>
    </div>
  )
}
