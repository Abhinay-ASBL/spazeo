import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal as _internal } from './_generated/api'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any

// ── DashScope Configuration ──
const DASHSCOPE_CHAT_URL =
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'

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
const EXTRACTION_PROMPT = `Analyze this floor plan image and extract the room geometry. Return JSON with this exact structure:

{
  "walls": [
    {
      "id": "w1",
      "start": { "x": 0, "y": 0 },
      "end": { "x": 5.2, "y": 0 },
      "thickness": 0.15,
      "confidence": "high"
    }
  ],
  "rooms": [
    {
      "id": "r1",
      "name": "Living Room",
      "type": "living_room",
      "polygon": [
        { "x": 0, "y": 0 },
        { "x": 5.2, "y": 0 },
        { "x": 5.2, "y": 4.0 },
        { "x": 0, "y": 4.0 }
      ],
      "area": 20.8,
      "floorMaterial": "hardwood",
      "confidence": "high"
    }
  ],
  "doors": [
    {
      "id": "d1",
      "position": { "x": 2.5, "y": 0 },
      "width": 0.9,
      "swingDirection": "inward",
      "wallId": "w1"
    }
  ],
  "windows": [
    {
      "id": "win1",
      "position": { "x": 3.0, "y": 4.0 },
      "width": 1.2,
      "wallId": "w3"
    }
  ],
  "dimensions": {
    "unit": "meters",
    "overallWidth": 12.5,
    "overallHeight": 8.3
  },
  "fixtures": [
    {
      "type": "sink",
      "position": { "x": 8.0, "y": 2.0 },
      "roomId": "r3"
    }
  ]
}

Rules:
- All coordinates in meters from top-left origin
- Confidence is "high" or "low" -- mark uncertain elements as "low"
- Room types: living_room, bedroom, kitchen, bathroom, hallway, dining_room, closet, balcony, laundry, study, garage, other
- Include ALL visible walls, even partial ones
- Estimate dimensions from visual proportions if no scale is provided`

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
      // 5. Get image URL from storage
      const imageUrl = await ctx.storage.getUrl(args.imageStorageId)
      if (!imageUrl) throw new Error('Floor plan image not found in storage')

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
                'You are an architectural floor plan analyzer. Extract room geometry from floor plan images. Return JSON with the exact schema specified.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: EXTRACTION_PROMPT },
                { type: 'image_url', image_url: { url: imageUrl } },
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

      // 9. Build geometry object
      const geometry = {
        walls: extraction.walls,
        rooms: extraction.rooms,
        doors: extraction.doors,
        windows: extraction.windows,
        fixtures: extraction.fixtures,
        dimensions: extraction.dimensions,
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
        type: 'system' as const,
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
