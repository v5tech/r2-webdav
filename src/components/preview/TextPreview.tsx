import { AlertCircleIcon, ExternalLinkIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { encodeKey } from '@/lib/webdav'

const TEXT_PREVIEW_MAX_BYTES = 1024 * 1024

interface TextPreviewProps {
  fileKey: string
  size: number
}

export function TextPreview({ fileKey, size }: TextPreviewProps) {
  const { t } = useTranslation()
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const oversize = size > TEXT_PREVIEW_MAX_BYTES

  useEffect(() => {
    if (oversize) return
    let cancelled = false
    fetch(`/webdav/${encodeKey(fileKey)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        return res.text()
      })
      .then((body) => {
        if (!cancelled) setText(body)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      })
    return () => {
      cancelled = true
    }
  }, [fileKey, oversize])

  if (oversize) {
    return (
      <div
        data-testid="text-preview-oversize"
        className="flex flex-col items-center gap-4 p-12 text-center"
      >
        <p className="text-sm text-muted-foreground">{t('preview.text.oversize')}</p>
        <Button asChild variant="outline" size="sm">
          <a href={`/webdav/${encodeKey(fileKey)}`} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon data-icon="inline-start" />
            {t('preview.unsupported.openExternal')}
          </a>
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div
        data-testid="text-preview-error"
        className="flex flex-col items-center gap-3 p-12 text-center"
      >
        <AlertCircleIcon className="size-6 text-destructive" />
        <p className="text-sm text-destructive">{t('preview.text.error')}</p>
      </div>
    )
  }

  if (text === null) {
    return (
      <div
        data-testid="text-preview-loading"
        role="status"
        className="flex items-center justify-center p-12"
      >
        <Loader2Icon className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <pre
      data-testid="text-preview-content"
      className="max-h-[70vh] overflow-auto whitespace-pre-wrap p-3 font-mono text-xs"
    >
      {text}
    </pre>
  )
}
