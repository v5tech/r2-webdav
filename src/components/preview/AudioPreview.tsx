import { encodeKey } from '@/lib/webdav'

interface AudioPreviewProps {
  fileKey: string
}

export function AudioPreview({ fileKey }: AudioPreviewProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <audio src={`/webdav/${encodeKey(fileKey)}`} controls className="w-full" />
    </div>
  )
}
