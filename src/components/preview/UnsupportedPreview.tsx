import { ExternalLinkIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { encodeKey } from '@/lib/webdav'

interface UnsupportedPreviewProps {
  fileKey: string
}

export function UnsupportedPreview({ fileKey }: UnsupportedPreviewProps) {
  const { t } = useTranslation()
  return (
    <div
      data-testid="unsupported-preview"
      className="flex flex-col items-center gap-4 p-12 text-center"
    >
      <p className="text-sm text-muted-foreground">{t('preview.unsupported.description')}</p>
      <Button asChild variant="outline" size="sm">
        <a href={`/webdav/${encodeKey(fileKey)}`} target="_blank" rel="noopener noreferrer">
          <ExternalLinkIcon data-icon="inline-start" />
          {t('preview.unsupported.openExternal')}
        </a>
      </Button>
    </div>
  )
}
