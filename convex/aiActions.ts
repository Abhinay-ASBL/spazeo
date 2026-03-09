import { v } from 'convex/values'
import { action, internalAction } from './_generated/server'
import { internal as _internal } from './_generated/api'
import { Id } from './_generated/dataModel'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any

// ── Alibaba Cloud Model Studio (DashScope) Configuration ──
// Vision + Text: OpenAI-compatible endpoint
const DASHSCOPE_CHAT_URL =
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'
// Image generation + editing: DashScope native endpoint
const DASHSCOPE_IMAGE_URL =
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
// Task status polling (for async image jobs)
const DASHSCOPE_TASK_URL =
  'https://dashscope-intl.aliyuncs.com/api/v1/tasks'

// Model assignments:
// - Scene analysis (vision):     qwen3.5-plus  — best visual understanding + structured JSON output
// - Tour descriptions (text):    qwen3.5-plus  — highest quality marketing copy
// - Scene descriptions (vision): qwen3.5-plus  — image analysis + text generation in one call
// - Virtual staging (img edit):  qwen-image-edit-max — style transfer, object editing, inpainting
// - Image enhancement (img gen): qwen-image-2.0-pro  — 2K photorealistic output

const VISION_MODEL = 'qwen3.5-plus'
const TEXT_MODEL = 'qwen3.5-plus'
const IMAGE_EDIT_MODEL = 'qwen-image-edit-max'
const IMAGE_GEN_MODEL = 'qwen-image-2.0-pro'

function getDashScopeKey(): string {
  const key = process.env.DASHSCOPE_API_KEY
  if (!key) throw new Error('DASHSCOPE_API_KEY environment variable is not set')
  return key
}

// ── Helper: Call DashScope OpenAI-compatible chat endpoint ──
async function callChat(
  model: string,
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
  maxTokens: number
): Promise<{ choices: Array<{ message: { content: string } }> }> {
  const response = await fetch(DASHSCOPE_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getDashScopeKey()}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DashScope chat error ${response.status}: ${errText}`)
  }

  return response.json()
}

// ── Helper: Call DashScope image generation/editing endpoint ──
async function callImageGen(
  model: string,
  messages: Array<{ role: string; content: Array<{ text?: string; image?: string }> }>,
  params?: Record<string, unknown>
): Promise<{ output: { choices: Array<{ message: { content: Array<{ image?: string }> } }> }; request_id: string }> {
  const response = await fetch(DASHSCOPE_IMAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getDashScopeKey()}`,
    },
    body: JSON.stringify({
      model,
      input: { messages },
      parameters: { ...params },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DashScope image error ${response.status}: ${errText}`)
  }

  return response.json()
}

// ── Scene Analysis (Vision) — qwen3.5-plus ──

export const analyzeScene = action({
  returns: v.any(),
  args: {
    tourId: v.id('tours'),
    sceneId: v.id('scenes'),
    sceneStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const credits = await ctx.runQuery(internal.aiHelpers.checkCredits, { userId: user._id })
    if (!credits.allowed) throw new Error('AI credit limit reached. Upgrade your plan for more.')

    const startTime = Date.now()

    const jobId = await ctx.runMutation(internal.aiHelpers.createJob, {
      tourId: args.tourId,
      sceneId: args.sceneId,
      type: 'scene_analysis',
      provider: 'dashscope',
      userId: user._id,
      creditsUsed: 1,
    })

    await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
      jobId,
      status: 'processing',
    })

    try {
      const imageUrl = await ctx.storage.getUrl(args.sceneStorageId)
      if (!imageUrl) throw new Error('Image not found in storage')

      const data = await callChat(
        VISION_MODEL,
        [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this 360° panorama image. Return JSON with: roomType (string), objects (array of strings), features (array of strings), qualityScore (1-10), suggestions (array of 2-3 strings with improvement tips for the photo or space). Only return valid JSON.',
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        600
      )

      const raw = data.choices[0].message.content
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const analysis = JSON.parse(cleaned)
      const duration = Date.now() - startTime

      await ctx.runMutation(internal.scenes.updateAiAnalysis, {
        sceneId: args.sceneId,
        roomType: analysis.roomType,
        aiAnalysis: {
          objects: analysis.objects,
          features: analysis.features,
          qualityScore: analysis.qualityScore,
          suggestions: analysis.suggestions,
        },
      })

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'completed',
        output: analysis,
        duration,
      })

      await ctx.runMutation(internal.aiHelpers.deductUserCredits, {
        userId: user._id,
        credits: 1,
      })

      await ctx.runMutation(internal.activity.log, {
        userId: user._id,
        type: 'ai_completed',
        tourId: args.tourId,
        message: 'AI scene analysis completed',
      })

      await ctx.runMutation(internal.notifications.create, {
        userId: user._id,
        type: 'ai_completed' as const,
        title: 'AI analysis complete',
        message: `Scene analysis finished with quality score ${analysis.qualityScore ?? 'N/A'}/10`,
        tourId: args.tourId,
      })

      return analysis
    } catch (error) {
      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})

export const processAnalyzeScene = internalAction({
  returns: v.any(),
  args: {
    jobId: v.id('aiJobs'),
    sceneStorageId: v.id('_storage'),
    tourId: v.optional(v.id('tours')),
    sceneId: v.optional(v.id('scenes')),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
      jobId: args.jobId,
      status: 'processing',
    })

    const startTime = Date.now()

    try {
      const imageUrl = await ctx.storage.getUrl(args.sceneStorageId)
      if (!imageUrl) throw new Error('Image not found in storage')

      const data = await callChat(
        VISION_MODEL,
        [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this 360° panorama image. Return JSON with: roomType (string), objects (array of strings), features (array of strings), qualityScore (1-10), suggestions (array of 2-3 strings with improvement tips for the photo or space). Only return valid JSON.',
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        600
      )

      const raw = data.choices[0].message.content
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const analysis = JSON.parse(cleaned)
      const duration = Date.now() - startTime

      if (args.sceneId) {
        await ctx.runMutation(internal.scenes.updateAiAnalysis, {
          sceneId: args.sceneId,
          roomType: analysis.roomType,
          aiAnalysis: {
            objects: analysis.objects,
            features: analysis.features,
            qualityScore: analysis.qualityScore,
            suggestions: analysis.suggestions,
          },
        })
      }

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'completed',
        output: analysis,
        duration,
      })

      if (args.userId) {
        await ctx.runMutation(internal.aiHelpers.deductUserCredits, {
          userId: args.userId,
          credits: 1,
        })

        if (args.tourId) {
          await ctx.runMutation(internal.activity.log, {
            userId: args.userId,
            type: 'ai_completed',
            tourId: args.tourId,
            message: 'AI scene analysis completed',
          })

          await ctx.runMutation(internal.notifications.create, {
            userId: args.userId as Id<'users'>,
            type: 'ai_completed' as const,
            title: 'AI analysis complete',
            message: `Scene analysis finished with quality score ${analysis.qualityScore ?? 'N/A'}/10`,
            tourId: args.tourId as Id<'tours'>,
          })
        }
      }

      return analysis
    } catch (error) {
      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})

// ── Virtual Staging (Image Editing) — qwen-image-edit-max ──

export const stageScene = action({
  returns: v.any(),
  args: {
    tourId: v.id('tours'),
    sceneId: v.id('scenes'),
    sceneStorageId: v.id('_storage'),
    style: v.union(
      v.literal('modern'),
      v.literal('scandinavian'),
      v.literal('luxury'),
      v.literal('minimalist'),
      v.literal('industrial')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const credits = await ctx.runQuery(internal.aiHelpers.checkCredits, { userId: user._id })
    if (!credits.allowed) throw new Error('AI credit limit reached. Upgrade your plan for more.')

    const startTime = Date.now()

    const jobId = await ctx.runMutation(internal.aiHelpers.createJob, {
      tourId: args.tourId,
      sceneId: args.sceneId,
      type: 'staging',
      provider: 'dashscope',
      userId: user._id,
      creditsUsed: 2,
      input: { style: args.style },
    })

    await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
      jobId,
      status: 'processing',
    })

    try {
      const imageUrl = await ctx.storage.getUrl(args.sceneStorageId)
      if (!imageUrl) throw new Error('Image not found in storage')

      const stylePrompts: Record<string, string> = {
        modern: 'modern interior design, clean lines, neutral colors, contemporary furniture',
        scandinavian: 'scandinavian interior, light wood, white walls, minimal cozy furniture',
        luxury: 'luxury interior, high-end furniture, marble, gold accents, premium materials',
        minimalist: 'minimalist interior, very few items, open space, zen-like atmosphere',
        industrial: 'industrial interior, exposed brick, metal elements, raw materials, loft style',
      }

      const result = await callImageGen(
        IMAGE_EDIT_MODEL,
        [
          {
            role: 'user',
            content: [
              { image: imageUrl },
              {
                text: `Virtual staging: transform this room with ${stylePrompts[args.style]}. Photorealistic, high quality, maintain the room structure and architecture. Add appropriate furniture and decor.`,
              },
            ],
          },
        ],
        { size: '1024*1024' }
      )

      const stagedImageUrl = result.output.choices[0]?.message?.content?.[0]?.image
      if (!stagedImageUrl) throw new Error('No image returned from staging model')

      // Download the generated image and upload to Convex storage
      // DashScope image URLs expire after 24 hours
      const imageResponse = await fetch(stagedImageUrl)
      const imageBlob = await imageResponse.blob()

      const uploadUrl = await ctx.storage.generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': imageBlob.type || 'image/png' },
        body: imageBlob,
      })
      const { storageId } = await uploadResponse.json()

      const duration = Date.now() - startTime

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'completed',
        output: { stagedImageStorageId: storageId, style: args.style },
        duration,
      })

      await ctx.runMutation(internal.aiHelpers.deductUserCredits, {
        userId: user._id,
        credits: 2,
      })

      await ctx.runMutation(internal.activity.log, {
        userId: user._id,
        type: 'ai_completed',
        tourId: args.tourId,
        message: `AI virtual staging completed (${args.style} style)`,
      })

      await ctx.runMutation(internal.notifications.create, {
        userId: user._id,
        type: 'ai_completed' as const,
        title: 'Virtual staging complete',
        message: `Your ${args.style} staging is ready to view`,
        tourId: args.tourId,
      })

      return { jobId, storageId }
    } catch (error) {
      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})

export const processStageScene = internalAction({
  returns: v.any(),
  args: {
    jobId: v.id('aiJobs'),
    sceneStorageId: v.id('_storage'),
    style: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
      jobId: args.jobId,
      status: 'processing',
    })

    const startTime = Date.now()

    try {
      const imageUrl = await ctx.storage.getUrl(args.sceneStorageId)
      if (!imageUrl) throw new Error('Image not found in storage')

      const stylePrompts: Record<string, string> = {
        modern: 'modern interior design, clean lines, neutral colors, contemporary furniture',
        scandinavian: 'scandinavian interior, light wood, white walls, minimal cozy furniture',
        luxury: 'luxury interior, high-end furniture, marble, gold accents, premium materials',
        minimalist: 'minimalist interior, very few items, open space, zen-like atmosphere',
        industrial: 'industrial interior, exposed brick, metal elements, raw materials, loft style',
      }

      const result = await callImageGen(
        IMAGE_EDIT_MODEL,
        [
          {
            role: 'user',
            content: [
              { image: imageUrl },
              {
                text: `Virtual staging: transform this room with ${stylePrompts[args.style] ?? stylePrompts.modern}. Photorealistic, high quality, maintain the room structure and architecture. Add appropriate furniture and decor.`,
              },
            ],
          },
        ],
        { size: '1024*1024' }
      )

      const stagedImageUrl = result.output.choices[0]?.message?.content?.[0]?.image
      if (!stagedImageUrl) throw new Error('No image returned from staging model')

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'completed',
        output: { resultUrl: stagedImageUrl },
        duration: Date.now() - startTime,
      })
    } catch (error) {
      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})

// ── Image Enhancement — qwen-image-2.0-pro ──

export const enhanceImage = action({
  returns: v.any(),
  args: {
    tourId: v.id('tours'),
    sceneId: v.id('scenes'),
    sceneStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const credits = await ctx.runQuery(internal.aiHelpers.checkCredits, { userId: user._id })
    if (!credits.allowed) throw new Error('AI credit limit reached. Upgrade your plan for more.')

    const startTime = Date.now()

    const jobId = await ctx.runMutation(internal.aiHelpers.createJob, {
      tourId: args.tourId,
      sceneId: args.sceneId,
      type: 'enhancement',
      provider: 'dashscope',
      userId: user._id,
      creditsUsed: 1,
    })

    await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
      jobId,
      status: 'processing',
    })

    try {
      const imageUrl = await ctx.storage.getUrl(args.sceneStorageId)
      if (!imageUrl) throw new Error('Image not found in storage')

      // Use qwen-image-2.0-pro to regenerate at higher quality + 2K resolution
      const result = await callImageGen(
        IMAGE_GEN_MODEL,
        [
          {
            role: 'user',
            content: [
              { image: imageUrl },
              {
                text: 'Enhance this interior photo: improve lighting, sharpen details, correct colors, increase resolution. Keep the exact same composition and content. Photorealistic output.',
              },
            ],
          },
        ],
        { size: '2048*2048' }
      )

      const enhancedImageUrl = result.output.choices[0]?.message?.content?.[0]?.image
      if (!enhancedImageUrl) throw new Error('No image returned from enhancement model')

      // Download and store — DashScope URLs expire in 24h
      const imageResponse = await fetch(enhancedImageUrl)
      const imageBlob = await imageResponse.blob()

      const uploadUrl = await ctx.storage.generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': imageBlob.type || 'image/png' },
        body: imageBlob,
      })
      const { storageId } = await uploadResponse.json()

      const enhancedStorageUrl = await ctx.storage.getUrl(storageId)
      const duration = Date.now() - startTime

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'completed',
        output: { enhancedUrl: enhancedStorageUrl, enhancedStorageId: storageId },
        duration,
      })

      await ctx.runMutation(internal.aiHelpers.deductUserCredits, {
        userId: user._id,
        credits: 1,
      })

      await ctx.runMutation(internal.activity.log, {
        userId: user._id,
        type: 'ai_completed',
        tourId: args.tourId,
        message: 'AI image enhancement completed',
      })

      await ctx.runMutation(internal.notifications.create, {
        userId: user._id,
        type: 'ai_completed' as const,
        title: 'Image enhancement complete',
        message: 'Your enhanced image is ready to view',
        tourId: args.tourId,
      })

      return { jobId, enhancedUrl: enhancedStorageUrl }
    } catch (error) {
      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})

export const processEnhanceImage = internalAction({
  returns: v.any(),
  args: {
    jobId: v.id('aiJobs'),
    sceneStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
      jobId: args.jobId,
      status: 'processing',
    })

    const startTime = Date.now()

    try {
      const imageUrl = await ctx.storage.getUrl(args.sceneStorageId)
      if (!imageUrl) throw new Error('Image not found in storage')

      const result = await callImageGen(
        IMAGE_GEN_MODEL,
        [
          {
            role: 'user',
            content: [
              { image: imageUrl },
              {
                text: 'Enhance this interior photo: improve lighting, sharpen details, correct colors, increase resolution. Keep the exact same composition and content. Photorealistic output.',
              },
            ],
          },
        ],
        { size: '2048*2048' }
      )

      const enhancedImageUrl = result.output.choices[0]?.message?.content?.[0]?.image
      if (!enhancedImageUrl) throw new Error('No image returned from enhancement model')

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'completed',
        output: { enhancedUrl: enhancedImageUrl },
        duration: Date.now() - startTime,
      })
    } catch (error) {
      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})

// ── Tour Description Generation (Text) — qwen3.5-plus ──

export const generateDescription = action({
  returns: v.any(),
  args: {
    tourId: v.id('tours'),
    tourTitle: v.string(),
    sceneAnalyses: v.array(v.any()),
    tone: v.optional(
      v.union(v.literal('professional'), v.literal('casual'), v.literal('luxury'))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const credits = await ctx.runQuery(internal.aiHelpers.checkCredits, { userId: user._id })
    if (!credits.allowed) throw new Error('AI credit limit reached. Upgrade your plan for more.')

    const startTime = Date.now()
    const tone = args.tone ?? 'professional'

    const jobId = await ctx.runMutation(internal.aiHelpers.createJob, {
      tourId: args.tourId,
      type: 'description',
      provider: 'dashscope',
      userId: user._id,
      creditsUsed: 1,
      input: { tourTitle: args.tourTitle, sceneAnalyses: args.sceneAnalyses, tone },
    })

    await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
      jobId,
      status: 'processing',
    })

    try {
      const toneInstructions: Record<string, string> = {
        professional:
          'Write in a professional, polished tone suitable for high-end real estate marketing.',
        casual:
          'Write in a friendly, approachable tone that makes the property feel like home.',
        luxury:
          'Write in an aspirational, premium tone that emphasizes exclusivity and sophistication.',
      }

      const data = await callChat(
        TEXT_MODEL,
        [
          {
            role: 'system',
            content: `You are a real estate marketing copywriter. ${toneInstructions[tone]} Write compelling property descriptions based on scene analysis data.`,
          },
          {
            role: 'user',
            content: `Write a property marketing description for "${args.tourTitle}" based on these room analyses: ${JSON.stringify(args.sceneAnalyses)}. Keep it under 200 words, highlight key features, and make it engaging for potential buyers.`,
          },
        ],
        400
      )

      const description = data.choices[0].message.content
      const duration = Date.now() - startTime

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'completed',
        output: { description },
        duration,
      })

      await ctx.runMutation(internal.aiHelpers.deductUserCredits, {
        userId: user._id,
        credits: 1,
      })

      await ctx.runMutation(internal.activity.log, {
        userId: user._id,
        type: 'ai_completed',
        tourId: args.tourId,
        message: 'AI description generated',
      })

      await ctx.runMutation(internal.notifications.create, {
        userId: user._id,
        type: 'ai_completed' as const,
        title: 'Description generated',
        message: 'Your AI-generated property description is ready',
        tourId: args.tourId,
      })

      return description
    } catch (error) {
      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})

export const processGenerateDescription = internalAction({
  returns: v.any(),
  args: {
    jobId: v.id('aiJobs'),
    tourTitle: v.string(),
    sceneAnalyses: v.array(v.any()),
    tone: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
      jobId: args.jobId,
      status: 'processing',
    })

    const startTime = Date.now()

    try {
      const toneInstructions: Record<string, string> = {
        professional:
          'Write in a professional, polished tone suitable for high-end real estate marketing.',
        casual:
          'Write in a friendly, approachable tone that makes the property feel like home.',
        luxury:
          'Write in an aspirational, premium tone that emphasizes exclusivity and sophistication.',
      }

      const data = await callChat(
        TEXT_MODEL,
        [
          {
            role: 'system',
            content: `You are a real estate marketing copywriter. ${toneInstructions[args.tone] ?? toneInstructions.professional}`,
          },
          {
            role: 'user',
            content: `Write a property marketing description for "${args.tourTitle}" based on these room analyses: ${JSON.stringify(args.sceneAnalyses)}. Keep it under 200 words.`,
          },
        ],
        400
      )

      const description = data.choices[0].message.content

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'completed',
        output: { description },
        duration: Date.now() - startTime,
      })
    } catch (error) {
      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})

// ── Scene Description (Vision + Text) — qwen3.5-plus ──

export const generateSceneDescription = action({
  returns: v.any(),
  args: {
    tourId: v.id('tours'),
    sceneId: v.id('scenes'),
    sceneStorageId: v.id('_storage'),
    sceneTitle: v.string(),
    tone: v.optional(
      v.union(v.literal('professional'), v.literal('casual'), v.literal('luxury'))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    })
    if (!user) throw new Error('User not found')

    const credits = await ctx.runQuery(internal.aiHelpers.checkCredits, { userId: user._id })
    if (!credits.allowed) throw new Error('AI credit limit reached. Upgrade your plan for more.')

    const startTime = Date.now()
    const tone = args.tone ?? 'professional'

    const jobId = await ctx.runMutation(internal.aiHelpers.createJob, {
      tourId: args.tourId,
      sceneId: args.sceneId,
      type: 'description',
      provider: 'dashscope',
      userId: user._id,
      creditsUsed: 1,
    })

    await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
      jobId,
      status: 'processing',
    })

    try {
      const imageUrl = await ctx.storage.getUrl(args.sceneStorageId)
      if (!imageUrl) throw new Error('Image not found in storage')

      const toneInstructions: Record<string, string> = {
        professional: 'professional and informative',
        casual: 'friendly and welcoming',
        luxury: 'aspirational and premium',
      }

      const data = await callChat(
        VISION_MODEL,
        [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Write a ${toneInstructions[tone]} description for this room scene titled "${args.sceneTitle}". 2-3 sentences, highlight key features visible in the image. Return only the description text.`,
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        200
      )

      const description = data.choices[0].message.content
      const duration = Date.now() - startTime

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'completed',
        output: { description },
        duration,
      })

      await ctx.runMutation(internal.aiHelpers.deductUserCredits, {
        userId: user._id,
        credits: 1,
      })

      return description
    } catch (error) {
      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})
