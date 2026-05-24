import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { FileItem } from '@/lib/types'

import { AudioPreview } from './AudioPreview'
import { ImagePreview } from './ImagePreview'
import { PdfPreview } from './stubs'
import { TextPreview } from './TextPreview'
import { UnsupportedPreview } from './UnsupportedPreview'
import { VideoPreview } from './VideoPreview'

interface PreviewDialogProps {
  file: FileItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function extractFilename(key: string) {
  return key.replace(/\/$/, '').split('/').pop() ?? key
}

const KNOWN_BINARY_EXTENSIONS = new Set([
  'zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar',
  'exe', 'dmg', 'iso', 'bin', 'pkg', 'msi', 'apk', 'deb', 'rpm', 'jar', 'war',
])

function getExt(key: string): string {
  const name = extractFilename(key)
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unsupported'

export function pickPreviewKind(file: FileItem): PreviewKind {
  const type = file.httpMetadata.contentType
  const ext = getExt(file.key)
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type === 'application/pdf') return 'pdf'
  if (type.startsWith('text/') && !KNOWN_BINARY_EXTENSIONS.has(ext)) return 'text'
  return 'unsupported'
}

function dispatchBody(file: FileItem) {
  const kind = pickPreviewKind(file)
  switch (kind) {
    case 'image':
      return <ImagePreview fileKey={file.key} name={extractFilename(file.key)} />
    case 'video':
      return <VideoPreview fileKey={file.key} />
    case 'audio':
      return <AudioPreview fileKey={file.key} />
    case 'pdf':
      return <PdfPreview type={file.httpMetadata.contentType} />
    case 'text':
      return <TextPreview fileKey={file.key} size={file.size} />
    default:
      return <UnsupportedPreview fileKey={file.key} />
  }
}

export function PreviewDialog({ file, open, onOpenChange }: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{file ? extractFilename(file.key) : ''}</DialogTitle>
          <DialogDescription className="sr-only">{file?.key ?? ''}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-auto">{file ? dispatchBody(file) : null}</div>
      </DialogContent>
    </Dialog>
  )
}
