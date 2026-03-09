'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { parseVideoUrl } from '@/lib/videoUtils'

interface Props {
  url: string
  title?: string
  onClose: () => void
}

export function HotspotVideoModal({ url, title, onClose }: Props) {
  const { type, embedSrc } = parseVideoUrl(url)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        backgroundColor: 'rgba(10,9,8,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: '90vw', maxWidth: 900, aspectRatio: '16/9' }}
      >
        {/* Close button above video */}
        <button
          onClick={onClose}
          aria-label="Close video"
          style={{
            position: 'absolute',
            top: -44,
            right: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#F5F3EF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
          }}
        >
          <X size={20} />
        </button>

        {type === 'direct' ? (
          <video
            src={embedSrc}
            controls
            style={{ width: '100%', height: '100%', borderRadius: 12 }}
          />
        ) : (
          <iframe
            src={embedSrc}
            style={{ width: '100%', height: '100%', borderRadius: 12, border: 'none' }}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || 'Video'}
          />
        )}
      </div>
    </motion.div>
  )
}
