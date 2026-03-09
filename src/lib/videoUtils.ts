export type VideoType = 'youtube' | 'vimeo' | 'direct' | 'unknown'

export interface ParsedVideo {
  type: VideoType
  embedSrc: string
}

export function parseVideoUrl(url: string): ParsedVideo {
  const isYoutube = /youtube\.com|youtu\.be/.test(url)
  const isVimeo = /vimeo\.com/.test(url)
  const isDirect = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)

  if (isYoutube) {
    const vidId = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
    return {
      type: 'youtube',
      embedSrc: vidId ? `https://www.youtube.com/embed/${vidId}` : url,
    }
  }

  if (isVimeo) {
    const vidId = url.match(/vimeo\.com\/(\d+)/)?.[1]
    return {
      type: 'vimeo',
      embedSrc: vidId ? `https://player.vimeo.com/video/${vidId}` : url,
    }
  }

  if (isDirect) {
    return { type: 'direct', embedSrc: url }
  }

  return { type: 'unknown', embedSrc: url }
}
