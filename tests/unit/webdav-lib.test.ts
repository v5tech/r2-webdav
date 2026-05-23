import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchPath, isDirectory } from '../../src/lib/webdav'
import type { FileItem } from '../../src/lib/types'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function xmlResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: 207,
    headers: { 'Content-Type': 'application/xml' },
    ...init,
  })
}

function multistatus(entries: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<multistatus xmlns="DAV:" xmlns:fd="flaredrive">${entries}</multistatus>`
}

function entry({
  href,
  contentType,
  size,
  lastModified,
  thumbnail,
}: {
  href: string
  contentType?: string
  size?: string
  lastModified?: string
  thumbnail?: string
}) {
  const props = [
    contentType && `<getcontenttype>${contentType}</getcontenttype>`,
    size && `<getcontentlength>${size}</getcontentlength>`,
    lastModified && `<getlastmodified>${lastModified}</getlastmodified>`,
    thumbnail && `<fd:thumbnail>${thumbnail}</fd:thumbnail>`,
  ]
    .filter(Boolean)
    .join('')
  return `<response><href>${href}</href><propstat><prop>${props}</prop><status>HTTP/1.1 200 OK</status></propstat></response>`
}

describe('fetchPath', () => {
  it('PROPFINDs /webdav/<path> with Depth:1', async () => {
    fetchMock.mockResolvedValueOnce(xmlResponse(multistatus('')))
    await fetchPath('foo/bar/')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/webdav/foo/bar/')
    expect(init.method).toBe('PROPFIND')
    expect(init.headers).toMatchObject({ Depth: '1' })
  })

  it('URL-encodes path segments but keeps slashes', async () => {
    fetchMock.mockResolvedValueOnce(xmlResponse(multistatus('')))
    await fetchPath('a b/c d/')
    expect(fetchMock.mock.calls[0][0]).toBe('/webdav/a%20b/c%20d/')
  })

  it('parses href / contentType / size / lastModified into FileItem[]', async () => {
    const xml = multistatus(
      entry({
        href: '/webdav/foo.txt',
        contentType: 'text/plain',
        size: '42',
        lastModified: 'Fri, 22 May 2026 10:00:00 GMT',
      }),
    )
    fetchMock.mockResolvedValueOnce(xmlResponse(xml))
    const items = await fetchPath('')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      key: 'foo.txt',
      size: 42,
      uploaded: 'Fri, 22 May 2026 10:00:00 GMT',
      httpMetadata: { contentType: 'text/plain' },
    })
  })

  it('parses fd:thumbnail via namespace lookup', async () => {
    const xml = multistatus(
      entry({
        href: '/webdav/pic.png',
        contentType: 'image/png',
        size: '1024',
        lastModified: 'Fri, 22 May 2026 10:00:00 GMT',
        thumbnail: 'data:image/png;base64,AAA',
      }),
    )
    fetchMock.mockResolvedValueOnce(xmlResponse(xml))
    const items = await fetchPath('')
    expect(items[0].customMetadata?.thumbnail).toBe('data:image/png;base64,AAA')
  })

  it('filters out self entry at root', async () => {
    const xml = multistatus(
      entry({
        href: '/webdav/',
        contentType: 'application/x-directory',
      }) +
        entry({
          href: '/webdav/child.txt',
          contentType: 'text/plain',
          size: '0',
          lastModified: 'Fri, 22 May 2026 10:00:00 GMT',
        }),
    )
    fetchMock.mockResolvedValueOnce(xmlResponse(xml))
    const items = await fetchPath('')
    expect(items.map((i) => i.key)).toEqual(['child.txt'])
  })

  it('throws on non-OK response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    await expect(fetchPath('')).rejects.toThrow(/failed to fetch/i)
  })

  it('throws on wrong content-type', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<not xml>', {
        status: 207,
        headers: { 'Content-Type': 'text/html' },
      }),
    )
    await expect(fetchPath('')).rejects.toThrow(/invalid response/i)
  })

  it('decodes URL-encoded keys in href', async () => {
    const xml = multistatus(
      entry({
        href: '/webdav/a%20b/c%20d.txt',
        contentType: 'text/plain',
        size: '1',
        lastModified: 'Fri, 22 May 2026 10:00:00 GMT',
      }),
    )
    fetchMock.mockResolvedValueOnce(xmlResponse(xml))
    const items = await fetchPath('a b/')
    expect(items[0].key).toBe('a b/c d.txt')
  })
})

describe('isDirectory', () => {
  function make(contentType: string): FileItem {
    return {
      key: 'foo',
      size: 0,
      uploaded: '',
      httpMetadata: { contentType },
    }
  }

  it('returns true for application/x-directory', () => {
    expect(isDirectory(make('application/x-directory'))).toBe(true)
  })

  it('returns false for regular files', () => {
    expect(isDirectory(make('text/plain'))).toBe(false)
    expect(isDirectory(make('image/png'))).toBe(false)
    expect(isDirectory(make(''))).toBe(false)
  })
})
