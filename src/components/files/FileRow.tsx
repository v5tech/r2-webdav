import { MoreHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatFileSize, formatFileTime, getFileTypeLabel, splitFilename } from '@/lib/format'
import type { FileItem } from '@/lib/types'
import { encodeKey, isDirectory } from '@/lib/webdav'

import { fileTypeClass, MimeIcon } from './MimeIcon'

interface FileRowProps {
  file: FileItem
  onCwdChange: (cwd: string) => void
  onRename: (file: FileItem) => void
  onDelete: (file: FileItem) => void
  onPreview?: (file: FileItem) => void
  selected?: boolean
  onSelect?: (key: string, selected: boolean) => void
}

function extractFilename(key: string) {
  return key.replace(/\/$/, '').split('/').pop() ?? key
}

export function FileRow({
  file,
  onCwdChange,
  onRename,
  onDelete,
  onPreview,
  selected = false,
  onSelect,
}: FileRowProps) {
  const { t, i18n } = useTranslation()
  const dir = isDirectory(file)
  const name = extractFilename(file.key)
  const { stem, extension } = splitFilename(name)

  function handleOpen() {
    if (dir) {
      onCwdChange(file.key.endsWith('/') ? file.key : file.key + '/')
    } else if (onPreview) {
      onPreview(file)
    } else {
      window.open(`/webdav/${encodeKey(file.key)}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <tr
      className={`h-[58px] border-b transition-colors last:border-b-0 hover:bg-muted/50 ${selected ? 'bg-primary/5' : ''}`}
    >
      {onSelect ? (
        <td className="w-[46px] px-3.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(file.key, event.target.checked)}
            aria-label={t('files.select', { name })}
            className="size-7 accent-primary md:size-4"
          />
        </td>
      ) : null}
      <td className="px-3.5">
        <button
          type="button"
          onClick={handleOpen}
          className="flex w-full min-w-0 items-center gap-3 text-left"
          aria-label={t('files.open', { name })}
        >
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-[9px] ${fileTypeClass(file, dir)}`}
          >
            <MimeIcon contentType={file.httpMetadata.contentType} className="size-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="flex min-w-0 text-sm font-medium" title={name} dir="auto">
              <span className="min-w-0 truncate">{stem}</span>
              <span className="shrink-0">{extension}</span>
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {getFileTypeLabel(file, dir, i18n.language)}
            </span>
          </span>
        </button>
      </td>
      <td
        className="hidden w-[120px] px-3.5 text-xs text-muted-foreground tabular-nums sm:table-cell"
        title={dir ? undefined : t('files.bytes', { value: file.size.toLocaleString() })}
      >
        {dir ? '—' : formatFileSize(file.size)}
      </td>
      <td className="hidden w-[204px] px-3.5 text-xs text-muted-foreground tabular-nums md:table-cell">
        <time
          dateTime={file.uploaded}
          title={`${formatFileTime(file.uploaded, undefined, 'UTC')} · UTC`}
        >
          {formatFileTime(file.uploaded)}
        </time>
      </td>
      <td className="w-[58px] px-3.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-9 rounded-md"
              aria-label={t('files.moreActions')}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRename(file)}>
              {t('files.menu.rename')}
            </DropdownMenuItem>
            {!dir ? (
              <DropdownMenuItem asChild>
                <a href={`/webdav/${encodeKey(file.key)}`} download>
                  {t('files.menu.download')}
                </a>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(file)}>
              {t('files.menu.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}
