import {
  FileIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
} from 'lucide-react'

interface MimeIconProps {
  contentType: string
  className?: string
}

function pickIcon(contentType: string) {
  if (contentType === 'application/x-directory') return FolderIcon
  if (contentType === 'application/pdf') return FileTextIcon
  if (contentType.startsWith('image/')) return ImageIcon
  if (contentType.startsWith('video/')) return VideoIcon
  if (contentType.startsWith('audio/')) return MusicIcon
  if (contentType.startsWith('text/')) return FileTextIcon
  return FileIcon
}

export function MimeIcon({ contentType, className }: MimeIconProps) {
  const Icon = pickIcon(contentType)
  return <Icon className={className} aria-hidden="true" />
}
