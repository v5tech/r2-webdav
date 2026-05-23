import pLimit from 'p-limit'

import type { FileItem } from './types'

export const WEBDAV_ENDPOINT = '/webdav/'
export const UPLOAD_CHUNK_SIZE = 100 * 1000 * 1000

export type UploadProgress = (loaded: number, total: number) => void

export function encodeKey(key: string) {
  return key.split('/').map(encodeURIComponent).join('/')
}

export function isDirectory(file: FileItem) {
  return file.httpMetadata?.contentType === 'application/x-directory'
}

export async function createFolder(key: string): Promise<void> {
  const res = await fetch(`${WEBDAV_ENDPOINT}${encodeKey(key)}`, { method: 'MKCOL' })
  if (!res.ok) throw new Error(`Failed to create folder: ${res.status}`)
}

export async function moveFile(source: string, target: string): Promise<void> {
  const dest = new URL(`${WEBDAV_ENDPOINT}${encodeKey(target)}`, window.location.href)
  const res = await fetch(`${WEBDAV_ENDPOINT}${encodeKey(source)}`, {
    method: 'MOVE',
    headers: { Destination: dest.href },
  })
  if (!res.ok) throw new Error(`Failed to move: ${res.status}`)
}

export async function deleteFile(key: string): Promise<void> {
  const res = await fetch(`${WEBDAV_ENDPOINT}${encodeKey(key)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
}

export async function uploadFile(
  key: string,
  file: File,
  onProgress?: UploadProgress,
  signal?: AbortSignal,
): Promise<void> {
  const contentType = file.type || 'application/octet-stream'
  if (file.size < UPLOAD_CHUNK_SIZE) {
    onProgress?.(0, file.size)
    const res = await fetch(`${WEBDAV_ENDPOINT}${encodeKey(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
      signal,
    })
    if (!res.ok) throw new Error(`Failed to upload: ${res.status}`)
    onProgress?.(file.size, file.size)
    return
  }
  await multipartUpload(key, file, contentType, onProgress, signal)
}

async function multipartUpload(
  key: string,
  file: File,
  contentType: string,
  onProgress?: UploadProgress,
  signal?: AbortSignal,
): Promise<void> {
  const initRes = await fetch(`${WEBDAV_ENDPOINT}${encodeKey(key)}?uploads`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    signal,
  })
  if (!initRes.ok) throw new Error(`Failed to start multipart: ${initRes.status}`)
  const { uploadId } = (await initRes.json()) as { uploadId: string }

  const totalChunks = Math.ceil(file.size / UPLOAD_CHUNK_SIZE)
  const partsLoaded = new Array<number>(totalChunks).fill(0)
  const parts: { partNumber: number; etag: string }[] = []
  const limit = pLimit(2)

  await Promise.all(
    Array.from({ length: totalChunks }, (_, i) =>
      limit(async () => {
        const partNumber = i + 1
        const chunk = file.slice(i * UPLOAD_CHUNK_SIZE, (i + 1) * UPLOAD_CHUNK_SIZE)
        const params = new URLSearchParams({ partNumber: String(partNumber), uploadId })
        const res = await fetch(`${WEBDAV_ENDPOINT}${encodeKey(key)}?${params}`, {
          method: 'PUT',
          body: chunk,
          signal,
        })
        if (!res.ok) throw new Error(`Failed to upload part ${partNumber}: ${res.status}`)
        const etag = res.headers.get('etag') ?? res.headers.get('ETag') ?? ''
        parts.push({ partNumber, etag })
        partsLoaded[i] = chunk.size
        onProgress?.(
          partsLoaded.reduce((a, b) => a + b, 0),
          file.size,
        )
      }),
    ),
  )

  parts.sort((a, b) => a.partNumber - b.partNumber)

  const completeRes = await fetch(
    `${WEBDAV_ENDPOINT}${encodeKey(key)}?${new URLSearchParams({ uploadId })}`,
    { method: 'POST', body: JSON.stringify({ parts }), signal },
  )
  if (!completeRes.ok) throw new Error(`Failed to complete multipart: ${completeRes.status}`)
}

export async function fetchPath(path: string): Promise<FileItem[]> {
  const res = await fetch(`${WEBDAV_ENDPOINT}${encodeKey(path)}`, {
    method: 'PROPFIND',
    headers: { Depth: '1' },
  })

  if (!res.ok) throw new Error('Failed to fetch')
  if (!res.headers.get('Content-Type')?.includes('application/xml'))
    throw new Error('Invalid response')

  const parser = new DOMParser()
  const text = await res.text()
  const document = parser.parseFromString(text, 'application/xml')

  const trimmedPath = path.replace(/\/$/, '')

  return Array.from(document.querySelectorAll('response'))
    .filter((response) => {
      const href = response.querySelector('href')?.textContent ?? ''
      return decodeURIComponent(href).slice(WEBDAV_ENDPOINT.length) !== trimmedPath
    })
    .map((response) => {
      const href = response.querySelector('href')?.textContent
      if (!href) throw new Error('Invalid response')
      const contentType = response.querySelector('getcontenttype')?.textContent
      const size = response.querySelector('getcontentlength')?.textContent
      const lastModified = response.querySelector('getlastmodified')?.textContent
      const thumbnail =
        response.getElementsByTagNameNS('flaredrive', 'thumbnail')[0]?.textContent ?? undefined
      return {
        key: decodeURI(href).replace(/^\/webdav\//, ''),
        size: size ? Number(size) : 0,
        uploaded: lastModified ?? '',
        httpMetadata: { contentType: contentType ?? '' },
        customMetadata: { thumbnail },
      }
    })
}
