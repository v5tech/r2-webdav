import { describe, expect, it, vi } from 'vitest'

import { handleRequestPropfind } from '../../functions/webdav/propfind'

interface MockBucket {
  head: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
}

function makeBucket(): MockBucket {
  return {
    head: vi.fn(),
    list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
  }
}

function mkFile(key: string, contentType = 'text/plain', extras: Record<string, unknown> = {}) {
  return {
    key,
    size: 100,
    etag: `etag-${key}`,
    uploaded: new Date('2026-01-01T00:00:00Z'),
    httpMetadata: { contentType },
    customMetadata: undefined,
    ...extras,
  }
}

function mkDir(key: string) {
  return mkFile(key, 'application/x-directory')
}

function mkReq(path: string, depth?: string): Request {
  const headers: Record<string, string> = {}
  if (depth !== undefined) headers.Depth = depth
  return new Request(`http://x/webdav/${path}`, { method: 'PROPFIND', headers })
}

describe('handleRequestPropfind', () => {
  it('returns 404 when path does not exist', async () => {
    const bucket = makeBucket()
    bucket.head.mockResolvedValue(null)

    const res = await handleRequestPropfind({
      bucket: bucket as unknown as R2Bucket,
      path: 'nope',
      request: mkReq('nope'),
    })

    expect(res.status).toBe(404)
  })

  it('returns 207 multistatus with application/xml content-type', async () => {
    const bucket = makeBucket()
    bucket.head.mockResolvedValue(mkDir('docs'))

    const res = await handleRequestPropfind({
      bucket: bucket as unknown as R2Bucket,
      path: 'docs',
      request: mkReq('docs', '0'),
    })

    expect(res.status).toBe(207)
    expect(res.headers.get('Content-Type')).toBe('application/xml')
  })

  describe('depth handling', () => {
    it('depth=0 returns only rootObject, does not call list', async () => {
      const bucket = makeBucket()
      bucket.head.mockResolvedValue(mkDir('docs'))

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: 'docs',
        request: mkReq('docs', '0'),
      })

      const body = await res.text()
      expect(body).toContain('<href>/webdav/docs/</href>')
      expect(bucket.list).not.toHaveBeenCalled()
    })

    it('depth=1 includes direct children, calls list with delimiter "/"', async () => {
      const bucket = makeBucket()
      bucket.head.mockResolvedValue(mkDir('docs'))
      bucket.list.mockResolvedValue({
        objects: [mkFile('docs/a.txt'), mkFile('docs/b.txt')],
        truncated: false,
      })

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: 'docs',
        request: mkReq('docs', '1'),
      })

      const body = await res.text()
      expect(body).toContain('/webdav/docs/a.txt')
      expect(body).toContain('/webdav/docs/b.txt')
      expect(bucket.list).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: 'docs/', delimiter: '/' }),
      )
    })

    it('depth=infinity recurses, calls list with delimiter undefined', async () => {
      const bucket = makeBucket()
      bucket.head.mockResolvedValue(mkDir('docs'))
      bucket.list.mockResolvedValue({
        objects: [mkFile('docs/a.txt'), mkFile('docs/sub/b.txt')],
        truncated: false,
      })

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: 'docs',
        request: mkReq('docs', 'infinity'),
      })

      const body = await res.text()
      expect(body).toContain('/webdav/docs/a.txt')
      expect(body).toContain('/webdav/docs/sub/b.txt')
      expect(bucket.list).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: 'docs/', delimiter: undefined }),
      )
    })

    it('depth defaults to "1" when header absent (regression for commit 10516a7)', async () => {
      const bucket = makeBucket()
      bucket.head.mockResolvedValue(mkDir('docs'))
      bucket.list.mockResolvedValue({
        objects: [mkFile('docs/a.txt')],
        truncated: false,
      })

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: 'docs',
        request: mkReq('docs'),
      })

      expect(res.status).toBe(207)
      expect(bucket.list).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: 'docs/', delimiter: '/' }),
      )
    })

    it('invalid depth (e.g. "2") yields empty children, does not call list', async () => {
      const bucket = makeBucket()
      bucket.head.mockResolvedValue(mkDir('docs'))

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: 'docs',
        request: mkReq('docs', '2'),
      })

      expect(res.status).toBe(207)
      expect(bucket.list).not.toHaveBeenCalled()
    })
  })

  describe('collection href trailing slash (RFC 4918 §5.2)', () => {
    it('root path produces /webdav/ (no double slash)', async () => {
      const bucket = makeBucket()
      bucket.list.mockResolvedValue({ objects: [], truncated: false })

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: '',
        request: mkReq('', '0'),
      })

      const body = await res.text()
      expect(body).toContain('<href>/webdav/</href>')
      expect(body).not.toContain('/webdav//')
    })

    it('directory child gets trailing slash in href', async () => {
      const bucket = makeBucket()
      bucket.head.mockResolvedValue(mkDir('root'))
      bucket.list.mockResolvedValue({
        objects: [mkDir('root/sub'), mkFile('root/a.txt')],
        truncated: false,
      })

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: 'root',
        request: mkReq('root', '1'),
      })

      const body = await res.text()
      expect(body).toContain('<href>/webdav/root/sub/</href>')
      expect(body).toContain('<href>/webdav/root/a.txt</href>')
      expect(body).not.toContain('<href>/webdav/root/a.txt/</href>')
    })
  })

  describe('internal namespace filter (regression moat)', () => {
    it('excludes _$r2webdav$/ prefixed objects from results', async () => {
      const bucket = makeBucket()
      bucket.list.mockResolvedValue({
        objects: [
          mkFile('user-file.txt'),
          mkFile('_$r2webdav$/trash/1234/old.txt'),
          mkFile('_$r2webdav$/thumbnails/abc.png'),
        ],
        truncated: false,
      })

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: '',
        request: mkReq('', '1'),
      })

      const body = await res.text()
      expect(body).toContain('user-file.txt')
      expect(body).not.toContain('_$r2webdav$/')
      expect(body).not.toContain('trash')
      expect(body).not.toContain('thumbnails')
    })
  })

  describe('resourcetype rendering', () => {
    it('renders <collection /> for directories', async () => {
      const bucket = makeBucket()
      bucket.head.mockResolvedValue(mkDir('docs'))

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: 'docs',
        request: mkReq('docs', '0'),
      })

      const body = await res.text()
      expect(body).toContain('<resourcetype><collection /></resourcetype>')
    })

    it('renders empty resourcetype for non-directory files', async () => {
      const bucket = makeBucket()
      bucket.head.mockResolvedValue(mkFile('readme.txt'))

      const res = await handleRequestPropfind({
        bucket: bucket as unknown as R2Bucket,
        path: 'readme.txt',
        request: mkReq('readme.txt', '0'),
      })

      const body = await res.text()
      expect(body).toContain('<resourcetype></resourcetype>')
      expect(body).not.toContain('<collection')
    })
  })

  it('escapes XML special characters in property values', async () => {
    const bucket = makeBucket()
    bucket.head.mockResolvedValue(mkFile('weird.txt', 'text/plain; charset="utf-8" & more'))

    const res = await handleRequestPropfind({
      bucket: bucket as unknown as R2Bucket,
      path: 'weird.txt',
      request: mkReq('weird.txt', '0'),
    })

    const body = await res.text()
    expect(body).toContain('&amp;')
    expect(body).toContain('&quot;')
  })

  it('URL-encodes href path segments (CJK and spaces)', async () => {
    const bucket = makeBucket()
    bucket.head.mockResolvedValue(mkDir('docs'))
    bucket.list.mockResolvedValue({
      objects: [mkFile('docs/中文 file.txt')],
      truncated: false,
    })

    const res = await handleRequestPropfind({
      bucket: bucket as unknown as R2Bucket,
      path: 'docs',
      request: mkReq('docs', '1'),
    })

    const body = await res.text()
    expect(body).toContain('/webdav/docs/%E4%B8%AD%E6%96%87%20file.txt')
  })
})
