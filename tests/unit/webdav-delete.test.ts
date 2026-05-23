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
      `_$flaredrive$/trash/${FIXED_NOW}/foo.txt`,
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
      `_$flaredrive$/trash/${FIXED_NOW}/docs`,
      'body-docs',
      expect.anything(),
    )
    expect(bucket.put).toHaveBeenCalledWith(
      `_$flaredrive$/trash/${FIXED_NOW}/docs/a.txt`,
      'body-docs/a.txt',
      expect.anything(),
    )
    expect(bucket.put).toHaveBeenCalledWith(
      `_$flaredrive$/trash/${FIXED_NOW}/docs/sub/b.txt`,
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
})
