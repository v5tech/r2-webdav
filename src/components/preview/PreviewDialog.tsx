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
import { PdfPreview, TextPreview } from './stubs'
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

function dispatchBody(file: FileItem) {
  const type = file.httpMetadata.contentType
  if (type.startsWith('image/')) return <ImagePreview fileKey={file.key} name={extractFilename(file.key)} />
  if (type.startsWith('video/')) return <VideoPreview fileKey={file.key} />
  if (type.startsWith('audio/')) return <AudioPreview fileKey={file.key} />
  if (type === 'application/pdf') return <PdfPreview type={type} />
  if (type.startsWith('text/')) return <TextPreview type={type} />
  return <UnsupportedPreview fileKey={file.key} />
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
