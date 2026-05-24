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
