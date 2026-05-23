import { encodeKey } from '@/lib/webdav'

interface ImagePreviewProps {
  fileKey: string
  name: string
}

export function ImagePreview({ fileKey, name }: ImagePreviewProps) {
  return (
    <div className="flex items-center justify-center p-2">
      <img
        src={`/webdav/${encodeKey(fileKey)}`}
        alt={name}
        loading="lazy"
        className="max-h-[70vh] object-contain"
      />
    </div>
  )
}
