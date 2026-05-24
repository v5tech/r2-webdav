import { WEBDAV_ENDPOINT, encodeKey } from './webdav'

export const THUMBNAIL_SIZE = 144

export async function generateImageThumbnail(
  file: File,
): Promise<{ blob: Blob; hash: string }> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = THUMBNAIL_SIZE
  canvas.height = THUMBNAIL_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(bitmap, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png')
  })
  const digest = await crypto.subtle.digest('SHA-1', await blob.arrayBuffer())
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return { blob, hash }
}

export async function uploadThumbnail(
  blob: Blob,
  hash: string,
  signal?: AbortSignal,
): Promise<void> {
  const key = `_$r2webdav$/thumbnails/${hash}.png`
  const res = await fetch(`${WEBDAV_ENDPOINT}${encodeKey(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: blob,
    signal,
  })
  if (!res.ok) throw new Error(`Failed to upload thumbnail: ${res.status}`)
}
