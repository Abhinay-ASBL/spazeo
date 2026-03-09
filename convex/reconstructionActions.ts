"use node"

import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'

/**
 * Submit a reconstruction job to RunPod serverless GPU endpoint.
 * Called automatically after job creation via scheduler.
 */
export const submitToRunPod = internalAction({
  args: { jobId: v.id('reconstructionJobs') },
  handler: async (ctx, args) => {
    // 1. Read job record
    const job = await ctx.runQuery(internal.reconstructionJobs.getById, {
      jobId: args.jobId,
    })
    if (!job) throw new Error(`Reconstruction job not found: ${args.jobId}`)

    // 2. Get download URLs for all input storage files
    const downloadUrls: string[] = []
    for (const storageId of job.inputStorageIds) {
      const url = await ctx.storage.getUrl(storageId)
      if (!url) throw new Error(`Storage URL not found for: ${storageId}`)
      downloadUrls.push(url)
    }

    // 3. Update job status to queued
    await ctx.runMutation(internal.reconstructionJobs.updateStatus, {
      jobId: args.jobId,
      status: 'queued',
      progress: 5,
    })

    // 4. Submit to RunPod serverless
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
    const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID
    const RUNPOD_WEBHOOK_SECRET = process.env.RUNPOD_WEBHOOK_SECRET
    const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL

    if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
      await ctx.runMutation(internal.reconstructionJobs.failById, {
        jobId: args.jobId,
        error: 'RunPod API credentials not configured. Set RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID.',
      })
      return
    }

    if (!CONVEX_SITE_URL) {
      await ctx.runMutation(internal.reconstructionJobs.failById, {
        jobId: args.jobId,
        error: 'CONVEX_SITE_URL not configured. Set it to the Convex HTTP actions URL.',
      })
      return
    }

    const webhookUrl = RUNPOD_WEBHOOK_SECRET
      ? `${CONVEX_SITE_URL}/gpu-callback?secret=${RUNPOD_WEBHOOK_SECRET}`
      : `${CONVEX_SITE_URL}/gpu-callback`

    try {
      const response = await fetch(
        `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RUNPOD_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              inputType: job.inputType,
              inputUrls: downloadUrls,
              outputFormat: 'spz',
              maxGaussians: 750000,
            },
            webhook: webhookUrl,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`RunPod API returned ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      const runpodJobId = result.id as string

      if (!runpodJobId) {
        throw new Error('RunPod API did not return a job ID')
      }

      // 5. Store runpodJobId and update status
      await ctx.runMutation(internal.reconstructionJobs.updateStatus, {
        jobId: args.jobId,
        status: 'queued',
        progress: 10,
        runpodJobId,
        startedAt: Date.now(),
      })

      console.log(
        `Submitted reconstruction job ${args.jobId} to RunPod: ${runpodJobId}`
      )
    } catch (error) {
      // 6. On fetch error, mark job as failed
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error submitting to RunPod'
      console.error(`Failed to submit to RunPod:`, errorMessage)

      await ctx.runMutation(internal.reconstructionJobs.failById, {
        jobId: args.jobId,
        error: errorMessage,
      })
    }
  },
})

/**
 * Poll for stale reconstruction jobs and check their status on RunPod.
 * Runs every 10 minutes via cron. Handles missed webhooks and timed-out jobs.
 */
export const pollStaleReconstructionJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
    const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID

    if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
      console.log('RunPod credentials not configured, skipping stale job poll')
      return
    }

    // Get all stale jobs (started >30 min ago, still in-progress)
    const staleJobs = await ctx.runQuery(
      internal.reconstructionJobs.getStaleJobs
    )

    if (staleJobs.length === 0) {
      return
    }

    console.log(`Polling ${staleJobs.length} stale reconstruction jobs`)

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000

    for (const job of staleJobs) {
      // Force-fail jobs older than 2 hours
      if (job.startedAt && Date.now() - job.startedAt > TWO_HOURS_MS) {
        console.log(`Job ${job._id} timed out (>2 hours), marking as failed`)
        await ctx.runMutation(internal.reconstructionJobs.failById, {
          jobId: job._id,
          error: 'Reconstruction timed out after 2 hours',
        })
        continue
      }

      if (!job.runpodJobId) {
        console.log(`Job ${job._id} has no runpodJobId, skipping poll`)
        continue
      }

      try {
        const response = await fetch(
          `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${job.runpodJobId}`,
          {
            headers: {
              Authorization: `Bearer ${RUNPOD_API_KEY}`,
            },
          }
        )

        if (response.status === 404) {
          console.log(
            `Job ${job._id} (RunPod: ${job.runpodJobId}) not found on GPU server`
          )
          await ctx.runMutation(internal.reconstructionJobs.failById, {
            jobId: job._id,
            error: 'Job not found on GPU server',
          })
          continue
        }

        if (!response.ok) {
          console.error(
            `RunPod status check failed for ${job.runpodJobId}: ${response.status}`
          )
          continue
        }

        const result = await response.json()

        if (result.status === 'COMPLETED' && result.output?.splatUrl) {
          console.log(
            `Job ${job._id} completed on RunPod (missed webhook), downloading SPZ`
          )

          // Download the SPZ file
          const splatResponse = await fetch(result.output.splatUrl)
          if (!splatResponse.ok) {
            throw new Error(
              `Failed to download SPZ from ${result.output.splatUrl}: ${splatResponse.status}`
            )
          }
          const splatBlob = await splatResponse.blob()
          const storageId = await ctx.storage.store(splatBlob)

          await ctx.runMutation(internal.reconstructionJobs.complete, {
            runpodJobId: job.runpodJobId,
            outputStorageId: storageId,
            outputMetadata: result.output.metadata ?? {
              fileSizeBytes: splatBlob.size,
              gaussianCount: 0,
              processingTimeMs: result.executionTime ?? 0,
            },
          })
        } else if (result.status === 'FAILED') {
          console.log(
            `Job ${job._id} failed on RunPod: ${result.output?.error ?? 'Unknown error'}`
          )
          await ctx.runMutation(internal.reconstructionJobs.failById, {
            jobId: job._id,
            error:
              result.output?.error ??
              'Reconstruction failed on GPU worker',
          })
        } else if (
          result.status === 'IN_QUEUE' ||
          result.status === 'IN_PROGRESS'
        ) {
          // Still processing, update progress if possible
          const stage = result.output?.stage
          let mappedStatus = job.status
          let progress = job.progress

          if (stage === 'extracting_frames') {
            mappedStatus = 'extracting_frames'
            progress = 30
          } else if (stage === 'reconstructing') {
            mappedStatus = 'reconstructing'
            progress = 60
          } else if (stage === 'compressing') {
            mappedStatus = 'compressing'
            progress = 85
          }

          if (mappedStatus !== job.status || progress !== job.progress) {
            await ctx.runMutation(internal.reconstructionJobs.updateStatus, {
              jobId: job._id,
              status: mappedStatus as
                | 'uploading'
                | 'queued'
                | 'extracting_frames'
                | 'reconstructing'
                | 'compressing'
                | 'completed'
                | 'failed'
                | 'cancelled',
              progress,
            })
          }
          console.log(
            `Job ${job._id} still ${result.status} on RunPod (stage: ${stage ?? 'unknown'})`
          )
        }
      } catch (error) {
        console.error(
          `Error polling RunPod for job ${job._id}:`,
          error instanceof Error ? error.message : error
        )
      }
    }
  },
})
