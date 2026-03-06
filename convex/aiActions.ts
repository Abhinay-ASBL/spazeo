import { v } from 'convex/values'
import { action, internalAction } from './_generated/server'
import { internal as _internal } from './_generated/api'
import { Id } from './_generated/dataModel'

// Cast to break circular type reference (api.d.ts imports this module's types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any

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
      provider: 'openai',
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
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
          max_tokens: 600,
        }),
      })

      const data = await response.json()
      const analysis = JSON.parse(data.choices[0].message.content)
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
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
          max_tokens: 600,
        }),
      })

      const data = await response.json()
      const analysis = JSON.parse(data.choices[0].message.content)
      const duration = Date.now() - startTime

      // Update scene with AI analysis results if sceneId was provided
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

      // Deduct credits and log activity if userId was provided
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
      provider: 'replicate',
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

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: 'db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
          input: {
            image: imageUrl,
            prompt: `Virtual staging of this room with ${stylePrompts[args.style]}. Photorealistic, high quality, maintain room structure.`,
            num_inference_steps: 30,
            guidance_scale: 7.5,
          },
        }),
      })

      const prediction = await response.json()

      let result = prediction
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const pollResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          {
            headers: {
              Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
            },
          }
        )
        result = await pollResponse.json()
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Staging generation failed')
      }

      const stagedImageUrl = Array.isArray(result.output) ? result.output[0] : result.output
      const imageResponse = await fetch(stagedImageUrl)
      const imageBlob = await imageResponse.blob()

      const uploadUrl = await ctx.storage.generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': imageBlob.type },
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

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: 'db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
          input: {
            image: imageUrl,
            prompt: `Virtual staging of this room with ${stylePrompts[args.style] ?? stylePrompts.modern}. Photorealistic, high quality, maintain room structure.`,
            num_inference_steps: 30,
            guidance_scale: 7.5,
          },
        }),
      })

      const prediction = await response.json()
      let result = prediction
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const pollResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          {
            headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
          }
        )
        result = await pollResponse.json()
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Staging generation failed')
      }

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'completed',
        output: { resultUrl: Array.isArray(result.output) ? result.output[0] : result.output },
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
      provider: 'replicate',
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

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: '42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
          input: {
            image: imageUrl,
            scale: 2,
            face_enhance: false,
          },
        }),
      })

      const prediction = await response.json()
      let result = prediction
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const pollResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          {
            headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
          }
        )
        result = await pollResponse.json()
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Image enhancement failed')
      }

      const enhancedUrl = result.output
      const duration = Date.now() - startTime

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId,
        status: 'completed',
        output: { enhancedUrl },
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

      return { jobId, enhancedUrl }
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

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: '42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
          input: {
            image: imageUrl,
            scale: 2,
            face_enhance: false,
          },
        }),
      })

      const prediction = await response.json()
      let result = prediction
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const pollResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          {
            headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
          }
        )
        result = await pollResponse.json()
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Image enhancement failed')
      }

      await ctx.runMutation(internal.aiHelpers.updateJobStatus, {
        jobId: args.jobId,
        status: 'completed',
        output: { enhancedUrl: result.output },
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
      provider: 'openai',
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a real estate marketing copywriter. ${toneInstructions[tone]} Write compelling property descriptions based on scene analysis data.`,
            },
            {
              role: 'user',
              content: `Write a property marketing description for "${args.tourTitle}" based on these room analyses: ${JSON.stringify(args.sceneAnalyses)}. Keep it under 200 words, highlight key features, and make it engaging for potential buyers.`,
            },
          ],
          max_tokens: 400,
        }),
      })

      const data = await response.json()
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a real estate marketing copywriter. ${toneInstructions[args.tone] ?? toneInstructions.professional}`,
            },
            {
              role: 'user',
              content: `Write a property marketing description for "${args.tourTitle}" based on these room analyses: ${JSON.stringify(args.sceneAnalyses)}. Keep it under 200 words.`,
            },
          ],
          max_tokens: 400,
        }),
      })

      const data = await response.json()
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
      provider: 'openai',
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
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
          max_tokens: 200,
        }),
      })

      const data = await response.json()
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
