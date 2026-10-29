// The viewer never renders panoramas wider than this (PanoramaViewer MAX_PANO_WIDTH),
// so pixels beyond it are download weight with no visible benefit.
const DISPLAY_WIDTH = 8192
const DISPLAY_QUALITY = 0.92
const PREVIEW_WIDTH = 2048
const PREVIEW_QUALITY = 0.8

export type OptimizedPanorama = {
  /** Display copy (≤8192 px wide). Falls back to the original when re-encoding would not shrink it. */
  full: Blob
  /** ~2048 px preview, shown while `full` downloads and used as the scene thumbnail. */
  preview: Blob
}

function encode(img: HTMLImageElement, maxWidth: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxWidth / img.naturalWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas 2D unavailable'))
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Image encode failed'))),
      'image/jpeg',
      quality
    )
  )
}

/** Returns null when the file can't be decoded — callers upload the original as-is. */
export async function optimizePanorama(file: Blob): Promise<OptimizedPanorama | null> {
  // <img> rather than createImageBitmap: WebKit's createImageBitmap rejects
  // very large panoramas (12000x6000) that <img> decodes fine.
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const encoded = await encode(img, DISPLAY_WIDTH, DISPLAY_QUALITY)
    const full = encoded.size < file.size ? encoded : file
    const preview = await encode(img, PREVIEW_WIDTH, PREVIEW_QUALITY)
    return { full, preview }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
