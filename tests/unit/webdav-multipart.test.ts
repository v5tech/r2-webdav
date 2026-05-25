import { describe, expect, it, vi } from 'vitest'

import { handleRequestPost } from '../../functions/webdav/post'
import { handleRequestPut } from '../../functions/webdav/put'

interface MockMultipart {
  uploadPart: ReturnType<typeof vi.fn>
  complete: ReturnType<typeof vi.fn>
}

interface MockBucket {
  head: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  createMultipartUpload: ReturnType<typeof vi.fn>
  resumeMultipartUpload: ReturnType<typeof vi.fn>
}

function makeBucket(mp?: MockMultipart): MockBucket {
  const multipart: MockMultipart = mp ?? {
    uploadPart: vi.fn().mockResolvedValue({ etag: 'part-etag' }),
    complete: vi.fn().mockResolvedValue({ httpEtag: 'final-etag' }),
  }
  return {
    head: vi.fn().mockResolvedValue({ key: 'parent' }),
    put: vi.fn().mockResolvedValue({}),
    createMultipartUpload: vi.fn().mockResolvedValue({ key: 'video.mp4', uploadId: 'uid-123' }),
    resumeMultipartUpload: vi.fn().mockReturnValue(multipart),
  }
}

describe('multipart upload', () => {
  describe('POST ?uploads (createMultipartUpload)', () => {
    it('returns key+uploadId JSON on success', async () => {
      const bucket = makeBucket()

      const res = await handleRequestPost({
        bucket: bucket as unknown as R2Bucket,
        path: 'video.mp4',
        request: new Request('http://x/webdav/video.mp4?uploads', { method: 'POST' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ key: 'video.mp4', uploadId: 'uid-123' })
      expect(bucket.createMultipartUpload).toHaveBeenCalledWith('video.mp4', expect.any(Object))
    })

    it('infers Content-Type from path extension, defeats webdav_client text/xml pollution', async () => {
      const bucket = makeBucket()

      await handleRequestPost({
        bucket: bucket as unknown as R2Bucket,
        path: 'video.mp4',
        request: new Request('http://x/webdav/video.mp4?uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
        }),
      })

      const opts = bucket.createMultipartUpload.mock.calls[0][1]
      const ct = opts.httpMetadata.get('Content-Type')
      expect(ct).toBe('video/mp4')
    })

    it('passes fd-thumbnail header into customMetadata', async () => {
      const bucket = makeBucket()

      await handleRequestPost({
        bucket: bucket as unknown as R2Bucket,
        path: 'pic.png',
        request: new Request('http://x/webdav/pic.png?uploads', {
          method: 'POST',
          headers: { 'fd-thumbnail': 'BASE64THUMB' },
        }),
      })

      const opts = bucket.createMultipartUpload.mock.calls[0][1]
      expect(opts.customMetadata).toEqual({ thumbnail: 'BASE64THUMB' })
    })
  })

  describe('POST ?uploadId (completeMultipartUpload)', () => {
    it('returns 404 when uploadId is missing', async () => {
      const bucket = makeBucket()

      const res = await handleRequestPost({
        bucket: bucket as unknown as R2Bucket,
        path: 'video.mp4',
        request: new Request('http://x/webdav/video.mp4?uploadId=', {
          method: 'POST',
          body: '{"parts":[]}',
        }),
      })

      expect(res.status).toBe(404)
      expect(bucket.resumeMultipartUpload).not.toHaveBeenCalled()
    })

    it('returns etag header on successful complete', async () => {
      const bucket = makeBucket()

      const res = await handleRequestPost({
        bucket: bucket as unknown as R2Bucket,
        path: 'video.mp4',
        request: new Request('http://x/webdav/video.mp4?uploadId=uid-123', {
          method: 'POST',
          body: JSON.stringify({ parts: [{ partNumber: 1, etag: 'p1' }] }),
        }),
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('etag')).toBe('final-etag')
      expect(bucket.resumeMultipartUpload).toHaveBeenCalledWith('video.mp4', 'uid-123')
    })

    it('returns 400 when complete() throws', async () => {
      const mp = {
        uploadPart: vi.fn(),
        complete: vi.fn().mockRejectedValue(new Error('part 2 missing')),
      }
      const bucket = makeBucket(mp)

      const res = await handleRequestPost({
        bucket: bucket as unknown as R2Bucket,
        path: 'video.mp4',
        request: new Request('http://x/webdav/video.mp4?uploadId=uid-123', {
          method: 'POST',
          body: JSON.stringify({ parts: [] }),
        }),
      })

      expect(res.status).toBe(400)
      expect(await res.text()).toBe('part 2 missing')
    })
  })

  describe('POST router', () => {
    it('returns 405 when no multipart query param is present', async () => {
      const bucket = makeBucket()

      const res = await handleRequestPost({
        bucket: bucket as unknown as R2Bucket,
        path: 'foo.txt',
        request: new Request('http://x/webdav/foo.txt', { method: 'POST' }),
      })

      expect(res.status).toBe(405)
    })
  })

  describe('PUT ?uploadId&partNumber (uploadPart)', () => {
    it('returns etag header on successful part upload', async () => {
      const bucket = makeBucket()

      const res = await handleRequestPut({
        bucket: bucket as unknown as R2Bucket,
        path: 'video.mp4',
        request: new Request('http://x/webdav/video.mp4?uploadId=uid-123&partNumber=1', {
          method: 'PUT',
          body: 'part-bytes',
        }),
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('etag')).toBe('part-etag')
      expect(bucket.resumeMultipartUpload).toHaveBeenCalledWith('video.mp4', 'uid-123')
    })

    it('returns 400 when uploadId value is empty', async () => {
      const bucket = makeBucket()

      const res = await handleRequestPut({
        bucket: bucket as unknown as R2Bucket,
        path: 'video.mp4',
        request: new Request('http://x/webdav/video.mp4?uploadId=&partNumber=1', {
          method: 'PUT',
          body: 'part-bytes',
        }),
      })

      expect(res.status).toBe(400)
      expect(bucket.resumeMultipartUpload).not.toHaveBeenCalled()
    })

    it('returns 400 when partNumber is missing', async () => {
      const bucket = makeBucket()

      const res = await handleRequestPut({
        bucket: bucket as unknown as R2Bucket,
        path: 'video.mp4',
        request: new Request('http://x/webdav/video.mp4?uploadId=uid-123', {
          method: 'PUT',
          body: 'part-bytes',
        }),
      })

      expect(res.status).toBe(400)
      expect(bucket.resumeMultipartUpload).not.toHaveBeenCalled()
    })

    it('returns 400 when body is missing', async () => {
      const bucket = makeBucket()

      const res = await handleRequestPut({
        bucket: bucket as unknown as R2Bucket,
        path: 'video.mp4',
        request: new Request('http://x/webdav/video.mp4?uploadId=uid-123&partNumber=1', {
          method: 'PUT',
        }),
      })

      expect(res.status).toBe(400)
      expect(bucket.resumeMultipartUpload).not.toHaveBeenCalled()
    })
  })
})
