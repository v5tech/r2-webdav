import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { encodeKey } from '@/lib/webdav'

interface PdfPreviewProps {
  fileKey: string
}

interface PdfPageLike {
  getViewport: (opts: { scale: number }) => { width: number; height: number }
  render: (opts: {
    canvasContext: CanvasRenderingContext2D
    viewport: { width: number; height: number }
  }) => { promise: Promise<void> }
}

interface PdfDocumentLike {
  numPages: number
  getPage: (n: number) => Promise<PdfPageLike>
}

const RENDER_SCALE = 1.5

export function PdfPreview({ fileKey }: PdfPreviewProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<PdfDocumentLike | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        const workerUrl = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString()
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
        const doc = await pdfjs.getDocument(`/webdav/${encodeKey(fileKey)}`).promise
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async PDF load; future migration to react-query
        setPdf(doc as unknown as PdfDocumentLike)
      } catch (err: unknown) {
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async PDF load; future migration to react-query
        setError(err instanceof Error ? err.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fileKey])

  useEffect(() => {
    if (!pdf) return
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    void (async () => {
      const page = await pdf.getPage(pageNum)
      if (cancelled) return
      const viewport = page.getViewport({ scale: RENDER_SCALE })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      await page.render({ canvasContext: ctx, viewport }).promise
    })()
    return () => {
      cancelled = true
    }
  }, [pdf, pageNum])

  if (error) {
    return (
      <div
        data-testid="pdf-preview-error"
        className="flex flex-col items-center gap-3 p-12 text-center"
      >
        <AlertCircleIcon className="size-6 text-destructive" />
        <p className="text-sm text-destructive">{t('preview.pdf.error')}</p>
      </div>
    )
  }

  if (!pdf) {
    return (
      <div
        data-testid="pdf-preview-loading"
        role="status"
        className="flex items-center justify-center p-12"
      >
        <Loader2Icon className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div data-testid="pdf-preview" className="flex flex-col items-center gap-3 p-2">
      <canvas
        data-testid="pdf-preview-canvas"
        ref={canvasRef}
        className="max-w-full border border-border"
      />
      <div data-testid="pdf-preview-pager" className="flex items-center gap-2">
        <Button
          data-testid="pdf-pager-prev"
          variant="outline"
          size="sm"
          disabled={pageNum <= 1}
          onClick={() => setPageNum((n) => n - 1)}
          aria-label={t('preview.pdf.prev')}
        >
          <ChevronLeftIcon />
        </Button>
        <span className="text-sm tabular-nums">
          {pageNum} / {pdf.numPages}
        </span>
        <Button
          data-testid="pdf-pager-next"
          variant="outline"
          size="sm"
          disabled={pageNum >= pdf.numPages}
          onClick={() => setPageNum((n) => n + 1)}
          aria-label={t('preview.pdf.next')}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}
