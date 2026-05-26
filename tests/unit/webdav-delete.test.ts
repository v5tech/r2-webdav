import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { handleRequestDelete } from '../../functions/webdav/delete'

interface MockBucket {
  head: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
}

function makeBucket(): MockBucket {
  return {
    head: vi.fn(),
    get: vi.fn(),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
  }
}

const FIXED_NOW = 1716499000000

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleRequestDelete (trash)', () => {
  it('moves single file to trash prefix and deletes original', async () => {
    const bucket = makeBucket()
    const file = {
      key: 'foo.txt',
      size: 3,
      etag: 'abc',
      uploaded: new Date(),
      httpMetadata: { contentType: 'text/plain' },
      customMetadata: undefined,
    }
    bucket.head.mockResolvedValue(file)
    bucket.get.mockResolvedValue({ ...file, body: 'body-stream' })

    const res = await handleRequestDelete({
      bucket: bucket as unknown as R2Bucket,
      path: 'foo.txt',
      request: new Request('http://x/webdav/foo.txt', { method: 'DELETE' }),
    })

    expect(res.status).toBe(204)
    expect(bucket.put).toHaveBeenCalledWith(
      `_$r2webdav$/trash/${FIXED_NOW}/foo.txt`,
      'body-stream',
      expect.objectContaining({
        httpMetadata: { contentType: 'text/plain' },
      }),
    )
    expect(bucket.delete).toHaveBeenCalledWith('foo.txt')
  })

  it('recursively moves directory and all descendants under same timestamp', async () => {
    const bucket = makeBucket()
    const dir = {
      key: 'docs',
      size: 0,
      etag: 'd',
      uploaded: new Date(),
      httpMetadata: { contentType: 'application/x-directory' },
      customMetadata: undefined,
    }
    const child1 = {
      key: 'docs/a.txt',
      size: 1,
      etag: 'a',
      uploaded: new Date(),
      httpMetadata: { contentType: 'text/plain' },
      customMetadata: undefined,
    }
    const child2 = {
      key: 'docs/sub/b.txt',
      size: 1,
      etag: 'b',
      uploaded: new Date(),
      httpMetadata: { contentType: 'text/plain' },
      customMetadata: undefined,
    }
    bucket.head.mockResolvedValue(dir)
    bucket.get.mockImplementation((key: string) => {
      const found = [dir, child1, child2].find((o) => o.key === key)
      return Promise.resolve(found ? { ...found, body: `body-${key}` } : null)
    })
    bucket.list.mockResolvedValue({
      objects: [child1, child2],
      truncated: false,
    })

    const res = await handleRequestDelete({
      bucket: bucket as unknown as R2Bucket,
      path: 'docs',
      request: new Request('http://x/webdav/docs', { method: 'DELETE' }),
    })

    expect(res.status).toBe(204)
    expect(bucket.list).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: 'docs/', delimiter: undefined }),
    )
    expect(bucket.put).toHaveBeenCalledWith(
      `_$r2webdav$/trash/${FIXED_NOW}/docs`,
      'body-docs',
      expect.anything(),
    )
    expect(bucket.put).toHaveBeenCalledWith(
      `_$r2webdav$/trash/${FIXED_NOW}/docs/a.txt`,
      'body-docs/a.txt',
      expect.anything(),
    )
    expect(bucket.put).toHaveBeenCalledWith(
      `_$r2webdav$/trash/${FIXED_NOW}/docs/sub/b.txt`,
      'body-docs/sub/b.txt',
      expect.anything(),
    )
    expect(bucket.delete).toHaveBeenCalledWith('docs')
    expect(bucket.delete).toHaveBeenCalledWith('docs/a.txt')
    expect(bucket.delete).toHaveBeenCalledWith('docs/sub/b.txt')
  })

  it('returns 404 when path does not exist', async () => {
    const bucket = makeBucket()
    bucket.head.mockResolvedValue(null)

    const res = await handleRequestDelete({
      bucket: bucket as unknown as R2Bucket,
      path: 'nope.txt',
      request: new Request('http://x/webdav/nope.txt', { method: 'DELETE' }),
    })

    expect(res.status).toBe(404)
    expect(bucket.put).not.toHaveBeenCalled()
    expect(bucket.delete).not.toHaveBeenCalled()
  })

  it('returns 207 Multi-Status when some children fail to delete (RFC 4918 §9.6.1)', async () => {
    const bucket = makeBucket()
    const dir = {
      key: 'docs',
      size: 0,
      etag: 'd',
      uploaded: new Date(),
      httpMetadata: { contentType: 'application/x-directory' },
      customMetadata: undefined,
    }
    const ok1 = {
      key: 'docs/ok.txt',
      size: 1,
      etag: 'ok',
      uploaded: new Date(),
      httpMetadata: { contentType: 'text/plain' },
      customMetadata: undefined,
    }
    const failChild = {
      key: 'docs/locked.txt',
      size: 1,
      etag: 'l',
      uploaded: new Date(),
      httpMetadata: { contentType: 'text/plain' },
      customMetadata: undefined,
    }
    bucket.head.mockResolvedValue(dir)
    bucket.list.mockResolvedValue({ objects: [ok1, failChild], truncated: false })
    bucket.get.mockImplementation((key: string) => {
      if (key === 'docs') return Promise.resolve({ ...dir, body: 'body-docs' })
      if (key === 'docs/ok.txt') return Promise.resolve({ ...ok1, body: 'body-ok' })
      if (key === 'docs/locked.txt') return Promise.resolve({ ...failChild, body: 'body-locked' })
      return Promise.resolve(null)
    })
    bucket.put.mockImplementation((key: string) => {
      if (key.endsWith('/docs/locked.txt')) return Promise.reject(new Error('R2 conflict'))
      return Promise.resolve(undefined)
    })

    const res = await handleRequestDelete({
      bucket: bucket as unknown as R2Bucket,
      path: 'docs',
      request: new Request('http://x/webdav/docs', { method: 'DELETE' }),
    })

    expect(res.status).toBe(207)
    expect(res.headers.get('Content-Type')).toBe('application/xml')
    const body = await res.text()
    expect(body).toContain('<href>/webdav/docs/locked.txt</href>')
    expect(body).toContain('HTTP/1.1 500')
    expect(body).toContain('R2 conflict')
    // succeeded child must NOT appear in the failure list
    expect(body).not.toContain('<href>/webdav/docs/ok.txt</href>')
    // succeeded child still deleted from original location
    expect(bucket.delete).toHaveBeenCalledWith('docs/ok.txt')
    // failed child NOT deleted from original (preserved)
    expect(bucket.delete).not.toHaveBeenCalledWith('docs/locked.txt')
  })

  it('returns 207 Multi-Status when single-object trash copy fails', async () => {
    const bucket = makeBucket()
    const file = {
      key: 'locked.txt',
      size: 1,
      etag: 'l',
      uploaded: new Date(),
      httpMetadata: { contentType: 'text/plain' },
      customMetadata: undefined,
    }
    bucket.head.mockResolvedValue(file)
    bucket.get.mockResolvedValue({ ...file, body: 'body-locked' })
    bucket.put.mockRejectedValue(new Error('R2 quota exceeded'))

    const res = await handleRequestDelete({
      bucket: bucket as unknown as R2Bucket,
      path: 'locked.txt',
      request: new Request('http://x/webdav/locked.txt', { method: 'DELETE' }),
    })

    expect(res.status).toBe(207)
    expect(res.headers.get('Content-Type')).toBe('application/xml')
    const body = await res.text()
    expect(body).toContain('<href>/webdav/locked.txt</href>')
    expect(body).toContain('HTTP/1.1 500')
    expect(body).toContain('R2 quota exceeded')
    // put failed -> original must NOT have been deleted
    expect(bucket.delete).not.toHaveBeenCalledWith('locked.txt')
  })
})
