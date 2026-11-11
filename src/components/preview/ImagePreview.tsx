import { encodeKey } from '@/lib/webdav'

interface ImagePreviewProps {
  fileKey: string
  name: string
}

export function ImagePreview({ fileKey, name }: ImagePreviewProps) {
  return (
    <div className="flex w-full items-center justify-center p-6">
      <img
        src={`/webdav/${encodeKey(fileKey)}`}
        alt={name}
        loading="lazy"
        className="max-h-[70vh] object-contain"
      />
    </div>
  )
}
