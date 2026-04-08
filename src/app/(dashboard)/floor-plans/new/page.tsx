'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FloorPlanUpload, type FloorPlanFile } from '@/components/floor-plan/FloorPlanUpload'
import { FloorPlanPreview } from '@/components/floor-plan/FloorPlanPreview'

type Step = 'upload' | 'preview'

export default function NewFloorPlanPage() {
  const router = useRouter()
  const createProject = useMutation(api.floorPlanProjects.create)
  const createDetail = useMutation(api.floorPlanDetails.create)
  const extractFloorPlan = useAction(api.floorPlanActions.extractFloorPlan)
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl)

  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<FloorPlanFile[]>([])
  const [extracting, setExtracting] = useState(false)

  const handleContinueToPreview = useCallback((readyFiles: FloorPlanFile[]) => {
    setFiles(readyFiles)
    setStep('preview')
  }, [])

  /**
   * Apply rotation to an image via canvas before uploading.
   * Returns the rotated blob, or the original file/blob if rotation is 0.
   */
  const applyRotation = useCallback(
    async (source: File | Blob, rotation: number): Promise<Blob> => {
      if (rotation === 0) {
        return source instanceof Blob ? source : source
      }

      const bitmap = await createImageBitmap(source)
      const radians = (rotation * Math.PI) / 180
      const sin = Math.abs(Math.sin(radians))
      const cos = Math.abs(Math.cos(radians))
      const newW = Math.round(bitmap.width * cos + bitmap.height * sin)
      const newH = Math.round(bitmap.width * sin + bitmap.height * cos)

      const canvas = document.createElement('canvas')
      canvas.width = newW
      canvas.height = newH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D context unavailable')

      ctx.translate(newW / 2, newH / 2)
      ctx.rotate(radians)
      ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b)
            else reject(new Error('Failed to rotate image'))
          },
          'image/png'
        )
      })
    },
    []
  )

  const uploadBlob = useCallback(
    async (blob: Blob, mimeType: string): Promise<string> => {
      const uploadUrl = await generateUploadUrl()
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': mimeType },
        body: blob,
      })
      if (!result.ok) throw new Error('Upload failed')
      const { storageId } = await result.json()
      return storageId
    },
    [generateUploadUrl]
  )

  const handleExtract = useCallback(
    async (filesToExtract: FloorPlanFile[]) => {
      setExtracting(true)
      const toastId = toast.loading('Uploading floor plans...')

      try {
        // 1. Create project
        const projectId = await createProject({
          name: `Floor Plan ${new Date().toLocaleDateString()}`,
          floorCount: filesToExtract.length,
        })

        // 2. Upload and create details for each file
        const detailIds: { detailId: string; storageId: string }[] = []

        for (const fpFile of filesToExtract) {
          toast.loading('Uploading floor plans...', { id: toastId })

          if (fpFile.type === 'pdf' && fpFile.rasterizedBlobs) {
            // Upload each rasterized page
            for (let i = 0; i < fpFile.rasterizedBlobs.length; i++) {
              const blob = fpFile.rasterizedBlobs[i]
              const rotated = await applyRotation(blob, fpFile.rotation)
              const storageId = await uploadBlob(rotated, rotated.type || 'image/jpeg')

              const detailId = await createDetail({
                projectId,
                floorNumber: fpFile.floorNumber + i,
                label: fpFile.label ? `${fpFile.label} - Page ${i + 1}` : `Page ${i + 1}`,
                imageStorageId: storageId as never,
                originalFileType: 'pdf',
              })
              detailIds.push({ detailId: detailId as string, storageId })
            }
          } else {
            // Image or sketch
            const rotated = await applyRotation(fpFile.file, fpFile.rotation)
            const storageId = await uploadBlob(rotated, fpFile.file.type || 'image/png')

            const detailId = await createDetail({
              projectId,
              floorNumber: fpFile.floorNumber,
              label: fpFile.label || undefined,
              imageStorageId: storageId as never,
              originalFileType: fpFile.type === 'sketch' ? 'sketch' : 'image',
            })
            detailIds.push({ detailId: detailId as string, storageId })
          }
        }

        // 3. Trigger extraction for each detail
        toast.loading('Starting AI extraction...', { id: toastId })

        let extractionFailures = 0
        let limitError = ''

        for (const { detailId, storageId } of detailIds) {
          try {
            await extractFloorPlan({
              floorPlanId: detailId as never,
              imageStorageId: storageId as never,
            })
          } catch (err) {
            extractionFailures++
            const msg = err instanceof Error ? err.message : String(err)
            if (msg.includes('limit reached')) {
              limitError = msg
              break // No point retrying other extractions
            }
            console.error(`Extraction failed for ${detailId}:`, err)
          }
        }

        if (limitError) {
          toast.error(limitError, { id: toastId })
        } else if (extractionFailures > 0) {
          toast(`${detailIds.length - extractionFailures}/${detailIds.length} floor plans submitted. ${extractionFailures} failed.`, { id: toastId })
        } else {
          toast.success(`${detailIds.length} floor plan${detailIds.length > 1 ? 's' : ''} submitted for extraction`, { id: toastId })
        }

        // 4. Navigate to floor plan list
        router.push('/floor-plans')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        toast.error(message, { id: toastId })
        console.error('Floor plan upload error:', err)
      } finally {
        setExtracting(false)
      }
    },
    [createProject, createDetail, extractFloorPlan, generateUploadUrl, uploadBlob, applyRotation, router]
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#6B6560' }}>
        <Link
          href="/floor-plans"
          className="flex items-center gap-1 transition-colors duration-150 hover:text-[#A8A29E]"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Floor Plans
        </Link>
        <ChevronRight size={14} strokeWidth={1.5} />
        <span style={{ color: '#F5F3EF' }}>New</span>
      </nav>

      {/* Page title */}
      <h1
        className="text-2xl font-bold mb-8"
        style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
      >
        {step === 'upload' ? 'Upload Floor Plans' : 'Preview and Extract'}
      </h1>

      {/* Step content */}
      {step === 'upload' && (
        <FloorPlanUpload onContinue={handleContinueToPreview} />
      )}

      {step === 'preview' && (
        <>
          <button
            type="button"
            onClick={() => setStep('upload')}
            className="flex items-center gap-1.5 mb-4 text-sm transition-colors duration-150"
            style={{ color: '#D4A017' }}
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back to upload
          </button>
          <FloorPlanPreview
            files={files}
            onFilesChange={setFiles}
            onExtract={handleExtract}
            extracting={extracting}
          />
        </>
      )}
    </div>
  )
}
