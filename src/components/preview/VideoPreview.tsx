import { encodeKey } from '@/lib/webdav'

interface VideoPreviewProps {
  fileKey: string
}

export function VideoPreview({ fileKey }: VideoPreviewProps) {
  return (
    <div className="flex items-center justify-center p-2">
      <video
        src={`/webdav/${encodeKey(fileKey)}`}
        controls
        className="max-h-[70vh] max-w-full"
      />
    </div>
  )
}
