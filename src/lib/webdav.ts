import type { FileItem } from './types'

export const WEBDAV_ENDPOINT = '/webdav/'

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
