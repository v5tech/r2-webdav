import { DownloadIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

interface SelectionToolbarProps {
  selectedCount: number
  onClear: () => void
  onDelete: () => void
  onDownload: () => void
  busy?: boolean
}

export function SelectionToolbar({
  selectedCount,
  onClear,
  onDelete,
  onDownload,
  busy = false,
}: SelectionToolbarProps) {
  const { t } = useTranslation()
  if (selectedCount === 0) return null

  return (
    <div
      role="toolbar"
      aria-label={t('files.selection.toolbar')}
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 border-t border-border bg-card px-4 py-2 shadow-lg"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('files.selection.clear')}
        onClick={onClear}
        disabled={busy}
      >
        <XIcon />
      </Button>
      <span className="text-sm font-medium">
        {t('files.selection.count', { count: selectedCount })}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onDownload} disabled={busy}>
          <DownloadIcon />
          {t('files.menu.download')}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
          <Trash2Icon />
          {t('files.menu.delete')}
        </Button>
      </div>
    </div>
  )
}
