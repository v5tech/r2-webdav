import { AlertCircleIcon, ExternalLinkIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { encodeKey } from '@/lib/webdav'

const CODE_PREVIEW_MAX_BYTES = 1024 * 1024

interface CodePreviewProps {
  fileKey: string
  size: number
  lang: string
}

export function CodePreview({ fileKey, size, lang }: CodePreviewProps) {
  const { t } = useTranslation()
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const oversize = size > CODE_PREVIEW_MAX_BYTES

  useEffect(() => {
    if (oversize) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/webdav/${encodeKey(fileKey)}`)
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        const code = await res.text()
        if (cancelled) return
        const { createHighlighter } = await import('shiki')
        const hl = await createHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: [lang],
        })
        if (cancelled) return
        const out = hl.codeToHtml(code, {
          lang,
          themes: { light: 'github-light', dark: 'github-dark' },
        })
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch+highlight; future migration to react-query
        setHtml(out)
      } catch (err: unknown) {
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch+highlight; future migration to react-query
        setError(err instanceof Error ? err.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fileKey, oversize, lang])

  if (oversize) {
    return (
      <div
        data-testid="code-preview-oversize"
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
        data-testid="code-preview-error"
        className="flex flex-col items-center gap-3 p-12 text-center"
      >
        <AlertCircleIcon className="size-6 text-destructive" />
        <p className="text-sm text-destructive">{t('preview.code.error')}</p>
      </div>
    )
  }

  if (html === null) {
    return (
      <div
        data-testid="code-preview-loading"
        role="status"
        className="flex items-center justify-center p-12"
      >
        <Loader2Icon className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div
      data-testid="code-preview-content"
      className="max-h-[70vh] overflow-auto p-3 text-xs [&_pre]:!bg-transparent"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
