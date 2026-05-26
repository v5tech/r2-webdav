import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createFolder,
  deleteFile,
  fetchPath,
  isDirectory,
  moveFile,
  uploadFile,
} from '../../src/lib/webdav'
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
<multistatus xmlns="DAV:" xmlns:r2="r2webdav">${entries}</multistatus>`
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
    thumbnail && `<r2:thumbnail>${thumbnail}</r2:thumbnail>`,
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

  it('parses r2:thumbnail via namespace lookup', async () => {
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

describe('createFolder', () => {
  it('sends MKCOL to /webdav/<encoded>', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 201 }))
    await createFolder('foo/bar baz')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/webdav/foo/bar%20baz')
    expect(init.method).toBe('MKCOL')
  })

  it('throws on non-OK response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 409 }))
    await expect(createFolder('exists/')).rejects.toThrow(/409/)
  })
})

describe('moveFile', () => {
  it('sends MOVE with Destination header (absolute URL)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 201 }))
    await moveFile('a/old name.txt', 'a/new name.txt')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/webdav/a/old%20name.txt')
    expect(init.method).toBe('MOVE')
    expect(init.headers.Destination).toMatch(/\/webdav\/a\/new%20name\.txt$/)
    expect(init.headers.Destination.startsWith('http')).toBe(true)
  })

  it('throws on non-OK response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 412 }))
    await expect(moveFile('a', 'b')).rejects.toThrow(/412/)
  })
})

describe('deleteFile', () => {
  it('sends DELETE to /webdav/<encoded>', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    await deleteFile('a b/c.txt')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/webdav/a%20b/c.txt')
    expect(init.method).toBe('DELETE')
  })

  it('throws on non-OK response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }))
    await expect(deleteFile('missing')).rejects.toThrow(/404/)
  })
})

describe('uploadFile', () => {
  it('sends PUT to /webdav/<encoded> with file body and content-type', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 201 }))
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' })
    await uploadFile('docs/note.txt', file)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/webdav/docs/note.txt')
    expect(init.method).toBe('PUT')
    expect(init.headers['Content-Type']).toBe('text/plain')
    expect(init.body).toBe(file)
  })

  it('falls back to application/octet-stream when file.type empty', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 201 }))
    const file = new File(['x'], 'bin', { type: '' })
    await uploadFile('bin', file)
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe(
      'application/octet-stream',
    )
  })

  it('emits progress 0/total then total/total on success', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 201 }))
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
    const events: Array<[number, number]> = []
    await uploadFile('a.txt', file, (loaded, total) => events.push([loaded, total]))
    expect(events[0]).toEqual([0, file.size])
    expect(events[events.length - 1]).toEqual([file.size, file.size])
  })

  it('throws on non-OK upload response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 507 }))
    const file = new File(['x'], 'a.txt')
    await expect(uploadFile('a.txt', file)).rejects.toThrow(/507/)
  })

  it('uses multipart (POST ?uploads) for files >= 100MB', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ uploadId: 'uid' }), { status: 200 }))
    fetchMock.mockResolvedValue(
      new Response('', { status: 200, headers: { etag: '"abc"' } }),
    )
    const file = new File(['x'], 'big.bin', { type: 'application/octet-stream' })
    Object.defineProperty(file, 'size', { value: 250 * 1000 * 1000 })
    await uploadFile('big.bin', file)
    expect(fetchMock.mock.calls[0][0]).toBe('/webdav/big.bin?uploads')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })
})
