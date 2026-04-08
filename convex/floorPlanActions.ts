import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal as _internal } from './_generated/api'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any

// ── DashScope Configuration ──
const DASHSCOPE_CHAT_URL =
  'https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions'

const VISION_MODEL = 'qwen3.5-plus'

function getDashScopeKey(): string {
  const key = process.env.DASHSCOPE_API_KEY
  if (!key) throw new Error('DASHSCOPE_API_KEY environment variable is not set')
  return key
}

// ── Plan Limits ──
const EXTRACTION_LIMITS: Record<string, number> = {
  free: 3,
  starter: 15,
  professional: 50,
  business: 50,
  enterprise: -1, // unlimited
}

// ── Extraction Prompt ──
const EXTRACTION_PROMPT = `You are analyzing an architectural floor plan drawing. Extract ALL rooms, walls, doors, windows, and fixtures with PRECISE dimensions.

CRITICAL INSTRUCTIONS:
1. READ THE DIMENSION ANNOTATIONS on the drawing carefully. They are usually shown as numbers with lines/arrows (often in red or near walls). These are the ACTUAL measurements — use them, do NOT estimate.
2. Dimensions may be in millimeters (e.g., 3500 = 3.5 meters), centimeters (e.g., 350 = 3.5 meters), feet/inches, or meters. Convert everything to METERS in your output.
3. Identify EVERY distinct room by looking at enclosed spaces formed by walls. Count bedrooms, bathrooms, kitchen, living areas, hallways, balconies, utility rooms.
4. For each wall, trace the EXACT start and end coordinates using the dimensions from the drawing.
5. Place the top-left corner of the overall floor plan at origin (0, 0).

Return JSON with this EXACT structure:

{
  "walls": [
    { "id": "w1", "start": { "x": 0, "y": 0 }, "end": { "x": 5.2, "y": 0 }, "thickness": 0.2, "confidence": "high" }
  ],
  "rooms": [
    {
      "id": "r1", "name": "Master Bedroom", "type": "bedroom",
      "polygon": [ { "x": 0, "y": 0 }, { "x": 5.2, "y": 0 }, { "x": 5.2, "y": 4.0 }, { "x": 0, "y": 4.0 } ],
      "area": 20.8, "floorMaterial": "tile", "confidence": "high"
    }
  ],
  "doors": [
    { "id": "d1", "position": { "x": 2.5, "y": 0 }, "width": 0.9, "swingDirection": "inward", "wallId": "w1" }
  ],
  "windows": [
    { "id": "win1", "position": { "x": 3.0, "y": 4.0 }, "width": 1.2, "wallId": "w3" }
  ],
  "dimensions": { "unit": "meters", "overallWidth": 12.5, "overallHeight": 8.3 },
  "fixtures": [
    { "type": "sink", "position": { "x": 8.0, "y": 2.0 }, "roomId": "r3" }
  ]
}

Rules:
- All coordinates MUST be in meters from top-left origin (0,0)
- READ dimension labels from the image — do NOT guess sizes. If labels show mm, divide by 1000
- Confidence: "high" if dimension is labeled, "low" if estimated
- Room types: living_room, bedroom, kitchen, bathroom, hallway, dining_room, closet, balcony, laundry, study, garage, other
- Include ALL walls — outer walls, inner partition walls, bathroom walls
- Include ALL doors shown (look for arc swing marks)
- Include ALL windows (look for double lines on exterior walls)
- Fixture types: sink, toilet, shower, bathtub, stove, refrigerator, washing_machine, bed, wardrobe, sofa, table, counter
- Calculate area = polygon area in square meters
- Wall thickness: use 0.2m for outer walls, 0.1m for inner partitions unless labeled
- IMPORTANT: Every room must be a CLOSED polygon — the last point connects back to the first`

// ── AI Floor Plan Extraction Action ──

export const extractFloorPlan = action({
  returns: v.any(),
  args: {
    floorPlanId: v.id('floorPlanDetails'),
    imageStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    // 1. Check plan limits
    const used = user.floorPlanExtractionsUsed ?? 0
    const limit = EXTRACTION_LIMITS[user.plan] ?? 3
    if (limit !== -1 && used >= limit) {
      throw new Error(
        `Floor plan extraction limit reached (${used}/${limit} this month). Upgrade your plan for more extractions.`
      )
    }

    const startTime = Date.now()

    // 2. Create job
    const jobId = await ctx.runMutation(internal.floorPlanJobs.create, {
      floorPlanId: args.floorPlanId,
      userId: user._id,
      imageStorageId: args.imageStorageId,
    })

    // 3. Update floor plan status to processing
    await ctx.runMutation(internal.floorPlanDetails.updateExtractionStatus, {
      floorPlanId: args.floorPlanId,
      extractionJobId: jobId,
      extractionStatus: 'processing',
    })

    // 4. Update job status to processing
    await ctx.runMutation(internal.floorPlanJobs.updateStatus, {
      jobId,
      status: 'processing',
    })

    try {
      // 5. Download image from storage and convert to base64
      const imageUrl = await ctx.storage.getUrl(args.imageStorageId)
      if (!imageUrl) throw new Error('Floor plan image not found in storage')

      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) throw new Error('Failed to download floor plan image from storage')
      const imageBuffer = await imageResponse.arrayBuffer()
      const bytes = new Uint8Array(imageBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64Image = btoa(binary)
      const contentType = imageResponse.headers.get('content-type') || 'image/png'
      const dataUrl = `data:${contentType};base64,${base64Image}`

      // 6. Call DashScope vision API with structured JSON output
      const response = await fetch(DASHSCOPE_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getDashScopeKey()}`,
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert architectural floor plan analyzer specializing in extracting PRECISE geometry from construction drawings. You must identify EVERY room, EVERY wall segment, EVERY door, and EVERY window. Read ALL dimension annotations from the drawing (numbers near walls, usually in mm). A typical apartment has 6-15 rooms including bedrooms, bathrooms, kitchen, living room, hallways, balconies, and utility areas. You must output at least as many rooms as visible in the image. Be thorough — missing rooms is a critical failure.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: EXTRACTION_PROMPT },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
          // Do NOT set max_tokens -- may truncate JSON
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`DashScope API error ${response.status}: ${errText}`)
      }

      const data = await response.json()
      const rawContent = data.choices[0].message.content
      const extraction = JSON.parse(rawContent)

      // 7. Validate response has required arrays
      if (!Array.isArray(extraction.walls) || !Array.isArray(extraction.rooms)) {
        throw new Error('AI extraction returned invalid structure: missing walls or rooms arrays')
      }

      const duration = Date.now() - startTime

      // 8. Save job as completed
      await ctx.runMutation(internal.floorPlanJobs.complete, {
        jobId,
        output: extraction,
        duration,
      })

      // 9. Build geometry object — normalize AI output to editor format
      // AI returns rooms with "polygon" but editor expects "points"
      const normalizedRooms = (extraction.rooms ?? []).map((room: Record<string, unknown>) => ({
        ...room,
        points: room.points ?? room.polygon ?? [],
      }))

      // Normalize doors: AI may return position as {x,y} object — convert to fraction
      const normalizedDoors = (extraction.doors ?? []).map((door: Record<string, unknown>, idx: number) => {
        const d = door as { id?: string; wallId?: string; position?: unknown; width?: number; swingDirection?: string }
        let position = 0.5 // default to midpoint
        if (typeof d.position === 'number') {
          position = d.position
        } else if (d.position && typeof d.position === 'object' && d.wallId) {
          // Convert {x,y} position to fraction along wall
          const wall = (extraction.walls ?? []).find((w: Record<string, unknown>) => w.id === d.wallId)
          if (wall) {
            const ws = wall.start as { x: number; y: number }
            const we = wall.end as { x: number; y: number }
            const dp = d.position as { x: number; y: number }
            const wallLen = Math.sqrt((we.x - ws.x) ** 2 + (we.y - ws.y) ** 2)
            if (wallLen > 0) {
              const projLen = Math.sqrt((dp.x - ws.x) ** 2 + (dp.y - ws.y) ** 2)
              position = Math.max(0.05, Math.min(0.95, projLen / wallLen))
            }
          }
        }
        return {
          id: d.id ?? `d${idx + 1}`,
          wallId: d.wallId ?? '',
          position,
          width: d.width ?? 0.9,
          swingDirection: d.swingDirection ?? 'inward',
        }
      }).filter((d: { wallId: string }) => d.wallId)

      // Normalize windows similarly
      const normalizedWindows = (extraction.windows ?? []).map((win: Record<string, unknown>, idx: number) => {
        const w = win as { id?: string; wallId?: string; position?: unknown; width?: number }
        let position = 0.5
        if (typeof w.position === 'number') {
          position = w.position
        } else if (w.position && typeof w.position === 'object' && w.wallId) {
          const wall = (extraction.walls ?? []).find((wl: Record<string, unknown>) => wl.id === w.wallId)
          if (wall) {
            const ws = wall.start as { x: number; y: number }
            const we = wall.end as { x: number; y: number }
            const wp = w.position as { x: number; y: number }
            const wallLen = Math.sqrt((we.x - ws.x) ** 2 + (we.y - ws.y) ** 2)
            if (wallLen > 0) {
              const projLen = Math.sqrt((wp.x - ws.x) ** 2 + (wp.y - ws.y) ** 2)
              position = Math.max(0.05, Math.min(0.95, projLen / wallLen))
            }
          }
        }
        return {
          id: w.id ?? `win${idx + 1}`,
          wallId: w.wallId ?? '',
          position,
          width: w.width ?? 1.2,
        }
      }).filter((w: { wallId: string }) => w.wallId)

      // Extract overallWidth/overallHeight from dimensions object if present
      const dims = extraction.dimensions ?? {}
      const overallWidth = typeof dims === 'object' ? (dims.overallWidth ?? undefined) : undefined
      const overallHeight = typeof dims === 'object' ? (dims.overallHeight ?? undefined) : undefined

      const geometry = {
        walls: extraction.walls ?? [],
        rooms: normalizedRooms,
        doors: normalizedDoors,
        windows: normalizedWindows,
        fixtures: extraction.fixtures ?? [],
        dimensions: [],
        overallWidth,
        overallHeight,
      }

      // 10. Update floor plan with geometry and status
      await ctx.runMutation(internal.floorPlanDetails.updateExtractionResult, {
        floorPlanId: args.floorPlanId,
        geometry,
        extractionJobId: jobId,
        extractionStatus: 'completed',
      })

      // 11. Create version 1 (AI source)
      await ctx.runMutation(internal.floorPlanDetails.saveVersion, {
        floorPlanId: args.floorPlanId,
        versionNumber: 1,
        geometry,
        source: 'ai',
      })

      // 12. Increment usage counter (only on success)
      await ctx.runMutation(internal.users.incrementFloorPlanExtractions, {
        userId: user._id,
      })

      // 13. Create notification
      await ctx.runMutation(internal.notifications.create, {
        userId: user._id,
        type: 'ai_completed' as const,
        title: 'Floor plan extraction complete',
        message: `Extracted ${extraction.rooms.length} room(s) and ${extraction.walls.length} wall(s) from your floor plan`,
      })

      return extraction
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Mark job as failed
      await ctx.runMutation(internal.floorPlanJobs.fail, {
        jobId,
        error: errorMessage,
        duration,
      })

      // Mark floor plan as failed (do NOT increment usage counter)
      await ctx.runMutation(internal.floorPlanDetails.updateExtractionStatus, {
        floorPlanId: args.floorPlanId,
        extractionStatus: 'failed',
      })

      throw error
    }
  },
})
