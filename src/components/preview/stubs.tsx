import { useTranslation } from 'react-i18next'

interface PreviewStubProps {
  type: string
}

export function ImagePreview({ type }: PreviewStubProps) {
  const { t } = useTranslation()
  return (
    <div data-testid="image-preview-stub" className="p-12 text-center text-muted-foreground">
      {t('preview.stub.coming', { type })}
    </div>
  )
}

export function VideoPreview({ type }: PreviewStubProps) {
  const { t } = useTranslation()
  return (
    <div data-testid="video-preview-stub" className="p-12 text-center text-muted-foreground">
      {t('preview.stub.coming', { type })}
    </div>
  )
}

export function AudioPreview({ type }: PreviewStubProps) {
  const { t } = useTranslation()
  return (
    <div data-testid="audio-preview-stub" className="p-12 text-center text-muted-foreground">
      {t('preview.stub.coming', { type })}
    </div>
  )
}

export function PdfPreview({ type }: PreviewStubProps) {
  const { t } = useTranslation()
  return (
    <div data-testid="pdf-preview-stub" className="p-12 text-center text-muted-foreground">
      {t('preview.stub.coming', { type })}
    </div>
  )
}

export function TextPreview({ type }: PreviewStubProps) {
  const { t } = useTranslation()
  return (
    <div data-testid="text-preview-stub" className="p-12 text-center text-muted-foreground">
      {t('preview.stub.coming', { type })}
    </div>
  )
}
