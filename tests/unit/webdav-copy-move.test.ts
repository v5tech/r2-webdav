import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { handleRequestCopy } from '../../functions/webdav/copy'
import { handleRequestMove } from '../../functions/webdav/move'

interface MockBucket {
  head: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
}

function makeBucket(): MockBucket {
  return {
    head: vi.fn().mockResolvedValue(null),
    get: vi.fn(),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
  }
}

function mkFile(key: string, contentType = 'text/plain') {
  return {
    key,
    size: 100,
    etag: `etag-${key}`,
    uploaded: new Date('2026-01-01T00:00:00Z'),
    httpMetadata: { contentType },
    customMetadata: undefined,
    body: `body-${key}`,
  }
}

function mkDir(key: string) {
  return mkFile(key, 'application/x-directory')
}

function mkReq(
  method: 'COPY' | 'MOVE',
  src: string,
  destination?: string | null,
  extra: Record<string, string> = {},
): Request {
  const headers: Record<string, string> = { ...extra }
  if (destination !== null && destination !== undefined) headers.Destination = destination
  return new Request(`http://x/webdav/${src}`, { method, headers })
}

const FIXED_NOW = 1716499000000

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleRequestCopy', () => {
  it('returns 400 when Destination header is missing', async () => {
    const bucket = makeBucket()

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: mkReq('COPY', 'a.txt', null),
    })

    expect(res.status).toBe(400)
    expect(bucket.get).not.toHaveBeenCalled()
  })

  it('returns 404 when source does not exist', async () => {
    const bucket = makeBucket()
    bucket.get.mockResolvedValueOnce(null)

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'nope.txt',
      request: mkReq('COPY', 'nope.txt', 'http://x/webdav/b.txt'),
    })

    expect(res.status).toBe(404)
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it('returns 502 when Destination host differs from request host', async () => {
    const bucket = makeBucket()
    bucket.get.mockResolvedValueOnce(mkFile('a.txt'))

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: mkReq('COPY', 'a.txt', 'http://evil.example.com/webdav/b.txt'),
    })

    expect(res.status).toBe(502)
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it('returns 400 when Destination path is not under /webdav/', async () => {
    const bucket = makeBucket()
    bucket.get.mockResolvedValueOnce(mkFile('a.txt'))

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: mkReq('COPY', 'a.txt', 'http://x/other/b.txt'),
    })

    expect(res.status).toBe(400)
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it('returns 400 when destination equals source path', async () => {
    const bucket = makeBucket()
    bucket.get.mockResolvedValueOnce(mkFile('a.txt'))

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: mkReq('COPY', 'a.txt', 'http://x/webdav/a.txt'),
    })

    expect(res.status).toBe(400)
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it('returns 400 when copying a directory into its own subtree', async () => {
    const bucket = makeBucket()
    bucket.get.mockResolvedValueOnce(mkDir('docs'))

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'docs',
      request: mkReq('COPY', 'docs', 'http://x/webdav/docs/sub'),
    })

    expect(res.status).toBe(400)
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it('returns 412 when Overwrite: F and destination already exists', async () => {
    const bucket = makeBucket()
    bucket.get.mockResolvedValueOnce(mkFile('a.txt'))
    bucket.head.mockResolvedValueOnce(mkFile('b.txt'))

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: mkReq('COPY', 'a.txt', 'http://x/webdav/b.txt', { Overwrite: 'F' }),
    })

    expect(res.status).toBe(412)
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it('returns 201 on successful file copy (new destination)', async () => {
    const bucket = makeBucket()
    const src = mkFile('a.txt')
    bucket.get.mockResolvedValueOnce(src)
    bucket.head.mockResolvedValueOnce(null)

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: mkReq('COPY', 'a.txt', 'http://x/webdav/b.txt'),
    })

    expect(res.status).toBe(201)
    expect(bucket.put).toHaveBeenCalledWith(
      'b.txt',
      src.body,
      expect.objectContaining({
        httpMetadata: { contentType: 'text/plain' },
      }),
    )
  })

  it('returns 204 on successful file copy (overwrites existing)', async () => {
    const bucket = makeBucket()
    bucket.get.mockResolvedValueOnce(mkFile('a.txt'))
    bucket.head.mockResolvedValueOnce(mkFile('b.txt'))

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: mkReq('COPY', 'a.txt', 'http://x/webdav/b.txt'),
    })

    expect(res.status).toBe(204)
  })

  it('recursively copies directory descendants when Depth=infinity', async () => {
    const bucket = makeBucket()
    const dir = mkDir('docs')
    const child1 = mkFile('docs/a.txt')
    const child2 = mkFile('docs/sub/b.txt')

    bucket.get.mockImplementation((key: string) => {
      if (key === 'docs') return Promise.resolve(dir)
      if (key === 'docs/a.txt') return Promise.resolve(child1)
      if (key === 'docs/sub/b.txt') return Promise.resolve(child2)
      return Promise.resolve(null)
    })
    bucket.head.mockResolvedValueOnce(null)
    bucket.list.mockResolvedValue({ objects: [child1, child2], truncated: false })

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'docs',
      request: mkReq('COPY', 'docs', 'http://x/webdav/backup'),
    })

    expect(res.status).toBe(201)
    expect(bucket.put).toHaveBeenCalledWith('backup', dir.body, expect.anything())
    expect(bucket.put).toHaveBeenCalledWith('backup/a.txt', child1.body, expect.anything())
    expect(bucket.put).toHaveBeenCalledWith('backup/sub/b.txt', child2.body, expect.anything())
    expect(bucket.list).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: 'docs/', delimiter: undefined }),
    )
  })

  it('returns 400 when directory Depth is invalid (e.g. "2")', async () => {
    const bucket = makeBucket()
    bucket.get.mockResolvedValueOnce(mkDir('docs'))
    bucket.head.mockResolvedValueOnce(null)

    const res = await handleRequestCopy({
      bucket: bucket as unknown as R2Bucket,
      path: 'docs',
      request: mkReq('COPY', 'docs', 'http://x/webdav/backup', { Depth: '2' }),
    })

    expect(res.status).toBe(400)
    // marker is already put before depth check — recursive copy must NOT happen
    expect(bucket.list).not.toHaveBeenCalled()
  })
})

describe('handleRequestMove', () => {
  it('short-circuits and skips DELETE when COPY phase fails', async () => {
    const bucket = makeBucket()
    // COPY fails on missing Destination → 400, DELETE must not run

    const res = await handleRequestMove({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: mkReq('MOVE', 'a.txt', null),
    })

    expect(res.status).toBe(400)
    expect(bucket.delete).not.toHaveBeenCalled()
  })

  it('on success copies to destination then deletes source via trash', async () => {
    const bucket = makeBucket()
    const src = mkFile('a.txt')
    bucket.get.mockImplementation((key: string) => {
      if (key === 'a.txt') return Promise.resolve(src)
      return Promise.resolve(null)
    })
    bucket.head.mockImplementation((key: string) => {
      if (key === 'a.txt') return Promise.resolve(src) // delete-phase head
      return Promise.resolve(null) // copy-phase dest head
    })

    const res = await handleRequestMove({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: mkReq('MOVE', 'a.txt', 'http://x/webdav/b.txt'),
    })

    expect(res.status).toBe(204) // delete phase returns 204
    // copy phase: dest put
    expect(bucket.put).toHaveBeenCalledWith('b.txt', src.body, expect.anything())
    // delete phase: trash put + source delete
    expect(bucket.put).toHaveBeenCalledWith(
      `_$r2webdav$/trash/${FIXED_NOW}/a.txt`,
      expect.anything(),
      expect.anything(),
    )
    expect(bucket.delete).toHaveBeenCalledWith('a.txt')
  })
})
