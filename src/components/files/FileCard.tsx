import { MoreHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FileItem } from '@/lib/types'
import { encodeKey, isDirectory } from '@/lib/webdav'

import { MimeIcon } from './MimeIcon'

interface FileCardProps {
  file: FileItem
  onCwdChange: (cwd: string) => void
  onRename: (file: FileItem) => void
  onDelete: (file: FileItem) => void
  onPreview?: (file: FileItem) => void
}

function extractFilename(key: string) {
  return key.replace(/\/$/, '').split('/').pop() ?? key
}

export function FileCard({ file, onCwdChange, onRename, onDelete, onPreview }: FileCardProps) {
  const { t } = useTranslation()
  const dir = isDirectory(file)
  const name = extractFilename(file.key)
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
    <div className="relative flex flex-col rounded-md border border-border bg-card transition-colors hover:bg-accent">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('files.open', { name })}
        className="flex flex-col items-center gap-2 p-3 text-left"
      >
        <div className="flex h-20 w-20 items-center justify-center">
          {thumb ? (
            <img
              src={`/webdav/_$flaredrive$/thumbnails/${thumb}.png`}
              alt={name}
              loading="lazy"
              className="size-full rounded object-cover"
            />
          ) : (
            <MimeIcon contentType={file.httpMetadata.contentType} className="size-10" />
          )}
        </div>
        <span className="w-full truncate text-center text-sm">{name}</span>
      </button>
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
          <DropdownMenuItem onSelect={() => onDelete(file)}>
            {t('files.menu.delete')}
          </DropdownMenuItem>
          {!dir && (
            <DropdownMenuItem asChild>
              <a href={`/webdav/${encodeKey(file.key)}`} download>
                {t('files.menu.download')}
              </a>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
