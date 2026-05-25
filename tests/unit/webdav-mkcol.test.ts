import { describe, expect, it, vi } from 'vitest'

import { handleRequestMkcol } from '../../functions/webdav/mkcol'

interface MockBucket {
  head: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

function makeBucket(): MockBucket {
  return {
    head: vi.fn(),
    put: vi.fn().mockResolvedValue(undefined),
  }
}

function mkReq(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://x/webdav/${path}`, { method: 'MKCOL', headers })
}

describe('handleRequestMkcol', () => {
  it('returns 415 when request has non-zero body (Content-Length > 0)', async () => {
    const bucket = makeBucket()

    const res = await handleRequestMkcol({
      bucket: bucket as unknown as R2Bucket,
      path: 'docs',
      request: mkReq('docs', { 'Content-Length': '10' }),
    })

    expect(res.status).toBe(415)
    expect(bucket.head).not.toHaveBeenCalled()
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it('returns 405 when target already exists', async () => {
    const bucket = makeBucket()
    bucket.head.mockResolvedValueOnce({ key: 'docs' })

    const res = await handleRequestMkcol({
      bucket: bucket as unknown as R2Bucket,
      path: 'docs',
      request: mkReq('docs'),
    })

    expect(res.status).toBe(405)
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it('returns 409 when parent directory does not exist', async () => {
    const bucket = makeBucket()
    // first head: target → null (does not exist)
    // second head: parent → null (does not exist)
    bucket.head.mockResolvedValueOnce(null).mockResolvedValueOnce(null)

    const res = await handleRequestMkcol({
      bucket: bucket as unknown as R2Bucket,
      path: 'a/b/c',
      request: mkReq('a/b/c'),
    })

    expect(res.status).toBe(409)
    expect(bucket.head).toHaveBeenNthCalledWith(2, 'a/b')
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it('returns 201 when creating at root (no parent check needed)', async () => {
    const bucket = makeBucket()
    bucket.head.mockResolvedValueOnce(null)

    const res = await handleRequestMkcol({
      bucket: bucket as unknown as R2Bucket,
      path: 'topdir',
      request: mkReq('topdir'),
    })

    expect(res.status).toBe(201)
    // only the existence check, not a parent lookup
    expect(bucket.head).toHaveBeenCalledTimes(1)
    expect(bucket.head).toHaveBeenCalledWith('topdir')
  })

  it('returns 201 when parent exists and creates collection', async () => {
    const bucket = makeBucket()
    bucket.head
      .mockResolvedValueOnce(null) // target does not exist
      .mockResolvedValueOnce({ key: 'a/b' }) // parent exists

    const res = await handleRequestMkcol({
      bucket: bucket as unknown as R2Bucket,
      path: 'a/b/c',
      request: mkReq('a/b/c'),
    })

    expect(res.status).toBe(201)
    expect(bucket.put).toHaveBeenCalledWith(
      'a/b/c',
      '',
      expect.objectContaining({
        httpMetadata: { contentType: 'application/x-directory' },
      }),
    )
  })

  it('persists directory marker with application/x-directory content-type', async () => {
    const bucket = makeBucket()
    bucket.head.mockResolvedValueOnce(null)

    await handleRequestMkcol({
      bucket: bucket as unknown as R2Bucket,
      path: 'newdir',
      request: mkReq('newdir'),
    })

    const putCall = bucket.put.mock.calls[0]
    expect(putCall[2].httpMetadata.contentType).toBe('application/x-directory')
  })
})
