import {
  FileIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
} from 'lucide-react'

import type { FileItem } from '@/lib/types'

export function fileTypeClass(file: FileItem, directory: boolean): string {
  const type = file.httpMetadata.contentType
  if (directory) return 'bg-primary/10 text-primary'
  if (type.startsWith('image/')) return 'bg-sky-500/10 text-sky-600'
  if (type === 'application/pdf') return 'bg-rose-500/10 text-rose-600'
  if (type.startsWith('video/') || type.startsWith('audio/')) {
    return 'bg-violet-500/10 text-violet-600'
  }
  if (type.startsWith('text/')) return 'bg-emerald-500/10 text-emerald-600'
  return 'bg-muted text-muted-foreground'
}

interface MimeIconProps {
  contentType: string
  className?: string
}

export function MimeIcon({ contentType, className }: MimeIconProps) {
  const props = { className, 'aria-hidden': 'true' as const }
  if (contentType === 'application/x-directory') return <FolderIcon {...props} />
  if (contentType === 'application/pdf') return <FileTextIcon {...props} />
  if (contentType.startsWith('image/')) return <ImageIcon {...props} />
  if (contentType.startsWith('video/')) return <VideoIcon {...props} />
  if (contentType.startsWith('audio/')) return <MusicIcon {...props} />
  if (contentType.startsWith('text/')) return <FileTextIcon {...props} />
  return <FileIcon {...props} />
}
