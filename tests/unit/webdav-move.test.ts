import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { handleRequestMove } from '../../functions/webdav/move'

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(1)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const file = {
  key: 'a.txt',
  size: 1,
  etag: 'a',
  uploaded: new Date(),
  httpMetadata: { contentType: 'text/plain' },
  customMetadata: undefined,
}

describe('handleRequestMove', () => {
  it('returns 500 when the source cannot be trashed after copy', async () => {
    const bucket = {
      head: vi.fn((key: string) => Promise.resolve(key === 'a.txt' ? file : null)),
      get: vi.fn((key: string) =>
        Promise.resolve(key === 'a.txt' ? { ...file, body: 'body' } : null),
      ),
      put: vi.fn((key: string) =>
        key === 'b.txt' ? Promise.resolve(undefined) : Promise.reject(new Error('R2 quota')),
      ),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
    }

    const res = await handleRequestMove({
      bucket: bucket as unknown as R2Bucket,
      path: 'a.txt',
      request: new Request('http://x/webdav/a.txt', {
        method: 'MOVE',
        headers: { Destination: 'http://x/webdav/b.txt' },
      }),
    })

    expect(res.status).toBe(500)
    expect(bucket.put).toHaveBeenCalledWith('b.txt', 'body', expect.anything())
    expect(bucket.delete).not.toHaveBeenCalledWith('a.txt')
  })
})
