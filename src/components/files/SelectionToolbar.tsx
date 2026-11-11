import { DownloadIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

interface SelectionToolbarProps {
  selectedCount: number
  onClear: () => void
  onDelete: () => void
  onDownload: () => void
  busy?: boolean
  canDownload?: boolean
}

export function SelectionToolbar({
  selectedCount,
  onClear,
  onDelete,
  onDownload,
  busy = false,
  canDownload = true,
}: SelectionToolbarProps) {
  const { t } = useTranslation()
  if (selectedCount === 0) return null

  return (
    <div
      role="toolbar"
      aria-label={t('files.selection.toolbar')}
      className="flex min-h-14 flex-wrap items-center gap-2 border-b bg-primary/10 px-3.5 py-2"
    >
      <span className="text-sm font-medium text-primary">
        {t('files.selection.count', { count: selectedCount })}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onDownload} disabled={busy || !canDownload}>
          <DownloadIcon />
          {t('files.menu.download')}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
          <Trash2Icon />
          {t('files.menu.delete')}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('files.selection.clear')}
          onClick={onClear}
          disabled={busy}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  )
}
