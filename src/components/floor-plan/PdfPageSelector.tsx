'use client'

import { useState, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { CheckSquare, Square, CheckCircle } from 'lucide-react'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfPageSelectorProps {
  file: File
  onPagesSelected: (rasterizedBlobs: Blob[]) => void
}

interface PageSelection {
  pageNum: number
  selected: boolean
}

/**
 * Rasterize selected pages of a PDF to PNG blobs at 2x scale.
 */
export async function rasterizePdfPages(
  file: File,
  selectedPages: number[],
  scale = 2
): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const blobs: Blob[] = []

  for (const pageNum of selectedPages) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context unavailable')

    await page.render({ canvasContext: context, viewport }).promise

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b)
          else reject(new Error('Failed to rasterize PDF page'))
        },
        'image/png'
      )
    })
    blobs.push(blob)
  }

  return blobs
}

export function PdfPageSelector({ file, onPagesSelected }: PdfPageSelectorProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pages, setPages] = useState<PageSelection[]>([])
  const [rasterizing, setRasterizing] = useState(false)
  const [rasterized, setRasterized] = useState(false)
  const [fileUrl, setFileUrl] = useState<string>('')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onDocumentLoadSuccess = useCallback(({ numPages: np }: { numPages: number }) => {
    setNumPages(np)
    setPages(
      Array.from({ length: np }, (_, i) => ({
        pageNum: i + 1,
        selected: true,
      }))
    )
  }, [])

  const togglePage = useCallback((pageNum: number) => {
    setPages((prev) =>
      prev.map((p) => (p.pageNum === pageNum ? { ...p, selected: !p.selected } : p))
    )
    setRasterized(false)
  }, [])

  const toggleAll = useCallback(() => {
    const allSelected = pages.every((p) => p.selected)
    setPages((prev) => prev.map((p) => ({ ...p, selected: !allSelected })))
    setRasterized(false)
  }, [pages])

  const handleRasterize = useCallback(async () => {
    const selected = pages.filter((p) => p.selected).map((p) => p.pageNum)
    if (selected.length === 0) return

    setRasterizing(true)
    try {
      const blobs = await rasterizePdfPages(file, selected)
      onPagesSelected(blobs)
      setRasterized(true)
    } catch (err) {
      console.error('PDF rasterization failed:', err)
    } finally {
      setRasterizing(false)
    }
  }, [file, pages, onPagesSelected])

  const selectedCount = pages.filter((p) => p.selected).length
  const allSelected = pages.length > 0 && pages.every((p) => p.selected)

  if (!fileUrl) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: '#A8A29E' }}>
          {numPages > 0 ? `${numPages} page${numPages > 1 ? 's' : ''} found` : 'Loading PDF...'}
        </p>
        {numPages > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs transition-colors duration-150"
            style={{ color: '#D4A017' }}
          >
            {allSelected ? (
              <CheckSquare size={14} strokeWidth={1.5} />
            ) : (
              <Square size={14} strokeWidth={1.5} />
            )}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Horizontal scrollable page thumbnails */}
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
          {pages.map((page) => (
            <button
              key={page.pageNum}
              type="button"
              onClick={() => togglePage(page.pageNum)}
              className="shrink-0 rounded-lg overflow-hidden transition-all duration-150 relative"
              style={{
                border: page.selected
                  ? '2px solid #D4A017'
                  : '2px solid rgba(212,160,23,0.12)',
                width: 150,
              }}
              aria-label={`Page ${page.pageNum} ${page.selected ? '(selected)' : '(not selected)'}`}
            >
              <Page
                pageNumber={page.pageNum}
                width={146}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              {/* Selection indicator */}
              <div
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: page.selected ? '#D4A017' : 'rgba(10,9,8,0.6)',
                }}
              >
                {page.selected && (
                  <CheckCircle size={14} strokeWidth={2} style={{ color: '#0A0908' }} />
                )}
              </div>
              {/* Page number label */}
              <div
                className="absolute bottom-0 left-0 right-0 py-1 text-center text-[10px] font-medium"
                style={{
                  backgroundColor: 'rgba(10,9,8,0.7)',
                  color: '#F5F3EF',
                }}
              >
                Page {page.pageNum}
              </div>
            </button>
          ))}
        </Document>
      </div>

      {/* Confirm selection button */}
      {selectedCount > 0 && (
        <button
          type="button"
          onClick={handleRasterize}
          disabled={rasterizing}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200"
          style={{
            backgroundColor: rasterized ? '#059669' : '#D4A017',
            color: rasterized ? '#F5F3EF' : '#0A0908',
            opacity: rasterizing ? 0.6 : 1,
          }}
        >
          {rasterizing
            ? 'Processing...'
            : rasterized
              ? `${selectedCount} page${selectedCount > 1 ? 's' : ''} ready`
              : `Prepare ${selectedCount} page${selectedCount > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}

export default PdfPageSelector
