import { useTranslation } from 'react-i18next'

interface PreviewStubProps {
  type: string
}

export function PdfPreview({ type }: PreviewStubProps) {
  const { t } = useTranslation()
  return (
    <div data-testid="pdf-preview-stub" className="p-12 text-center text-muted-foreground">
      {t('preview.stub.coming', { type })}
    </div>
  )
}
