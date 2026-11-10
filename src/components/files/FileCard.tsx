import { MoreHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatFileSize, splitFilename } from '@/lib/format'
import type { FileItem } from '@/lib/types'
import { encodeKey, isDirectory } from '@/lib/webdav'

import { MimeIcon } from './MimeIcon'

interface FileCardProps {
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

function typeClass(file: FileItem, dir: boolean) {
  const type = file.httpMetadata.contentType
  if (dir) return 'bg-primary/10 text-primary'
  if (type.startsWith('image/')) return 'bg-sky-500/10 text-sky-600'
  if (type === 'application/pdf') return 'bg-rose-500/10 text-rose-600'
  if (type.startsWith('video/') || type.startsWith('audio/'))
    return 'bg-violet-500/10 text-violet-600'
  if (type.startsWith('text/')) return 'bg-emerald-500/10 text-emerald-600'
  return 'bg-muted text-muted-foreground'
}

export function FileCard({
  file,
  onCwdChange,
  onRename,
  onDelete,
  onPreview,
  selected = false,
  onSelect,
}: FileCardProps) {
  const { t } = useTranslation()
  const dir = isDirectory(file)
  const name = extractFilename(file.key)
  const { stem, extension } = splitFilename(name)
  const thumb = file.customMetadata?.thumbnail

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
    <div
      className={`relative overflow-hidden rounded-lg border bg-card ${selected ? 'border-primary bg-primary/5' : ''}`}
    >
      <button
        type="button"
        onClick={handleOpen}
        className="flex h-[72px] w-full items-center justify-center bg-muted/40"
        aria-label={t('files.open', { name })}
      >
        {thumb ? (
          <img
            src={`/webdav/_$r2webdav$/thumbnails/${thumb}.png`}
            alt={name}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <span
            className={`flex size-9 items-center justify-center rounded-lg ${typeClass(file, dir)}`}
          >
            <MimeIcon contentType={file.httpMetadata.contentType} className="size-5" />
          </span>
        )}
      </button>
      {onSelect ? (
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(file.key, event.target.checked)}
          aria-label={t('files.select', { name })}
          className="absolute left-2 top-2 size-7 accent-primary md:size-4"
        />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('files.moreActions')}
            className="absolute right-1 top-1"
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
      <div className="p-3">
        <div className="flex min-w-0 text-sm font-medium" title={name} dir="auto">
          <span className="min-w-0 truncate">{stem}</span>
          <span className="shrink-0">{extension}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {dir ? t('files.folder') : formatFileSize(file.size)}
        </div>
      </div>
    </div>
  )
}
