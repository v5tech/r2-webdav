import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { FileItem } from '@/lib/types'

import {
  AudioPreview,
  ImagePreview,
  PdfPreview,
  TextPreview,
  VideoPreview,
} from './stubs'
import { UnsupportedPreview } from './UnsupportedPreview'

interface PreviewDialogProps {
  file: FileItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function dispatchBody(file: FileItem) {
  const type = file.httpMetadata.contentType
  if (type.startsWith('image/')) return <ImagePreview type={type} />
  if (type.startsWith('video/')) return <VideoPreview type={type} />
  if (type.startsWith('audio/')) return <AudioPreview type={type} />
  if (type === 'application/pdf') return <PdfPreview type={type} />
  if (type.startsWith('text/')) return <TextPreview type={type} />
  return <UnsupportedPreview fileKey={file.key} />
}

function extractFilename(key: string) {
  return key.replace(/\/$/, '').split('/').pop() ?? key
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
