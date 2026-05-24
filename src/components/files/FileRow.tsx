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

interface FileRowProps {
  file: FileItem
  onCwdChange: (cwd: string) => void
  onRename: (file: FileItem) => void
  onDelete: (file: FileItem) => void
  onPreview?: (file: FileItem) => void
}

function extractFilename(key: string) {
  return key.replace(/\/$/, '').split('/').pop() ?? key
}

export function FileRow({ file, onCwdChange, onRename, onDelete, onPreview }: FileRowProps) {
  const { t } = useTranslation()
  const dir = isDirectory(file)
  const name = extractFilename(file.key)

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
    <div className="flex items-center gap-2 border-b border-border px-3 py-2 transition-colors hover:bg-accent">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('files.open', { name })}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <MimeIcon contentType={file.httpMetadata.contentType} className="size-5 shrink-0" />
        <span className="flex-1 truncate text-sm">{name}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('files.moreActions')}>
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
