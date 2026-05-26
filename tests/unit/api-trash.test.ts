import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { onRequestDelete, onRequestGet, onRequestPost } from '../../functions/api/trash'

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
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
  }
}

const ORIGIN = 'http://localhost'
const PASSWORD = 'pw-fixed-for-tests'

async function callGet(bucket: MockBucket, token: string | null) {
  const headers: Record<string, string> = {}
  if (token) headers['Cookie'] = `r2_session=${token}`
  const request = new Request(`${ORIGIN}/api/trash`, { method: 'GET', headers })
  return onRequestGet({
    request,
    env: { WEBDAV_PASSWORD: PASSWORD, BUCKET: bucket as unknown as R2Bucket },
  } as never)
}

async function callPost(bucket: MockBucket, token: string, body: object) {
  const request = new Request(`${ORIGIN}/api/trash`, {
    method: 'POST',
    headers: { Cookie: `r2_session=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return onRequestPost({
    request,
    env: { WEBDAV_PASSWORD: PASSWORD, BUCKET: bucket as unknown as R2Bucket },
  } as never)
}

async function callDelete(bucket: MockBucket, token: string, ts: string) {
  const request = new Request(`${ORIGIN}/api/trash?ts=${ts}`, {
    method: 'DELETE',
    headers: { Cookie: `r2_session=${token}` },
  })
  return onRequestDelete({
    request,
    env: { WEBDAV_PASSWORD: PASSWORD, BUCKET: bucket as unknown as R2Bucket },
  } as never)
}

async function makeToken() {
  const { signSessionJwt } = await import('../../functions/_shared/auth')
  return signSessionJwt({ WEBDAV_PASSWORD: PASSWORD }, { sub: 'owner', iss: ORIGIN })
}

beforeEach(() => {
  vi.useRealTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/trash', () => {
  it('returns 401 without valid session', async () => {
    const bucket = makeBucket()
    const res = await callGet(bucket, null)
    expect(res.status).toBe(401)
    expect(bucket.list).not.toHaveBeenCalled()
  })

  it('returns empty array when trash is empty', async () => {
    const bucket = makeBucket()
    const token = await makeToken()
    const res = await callGet(bucket, token)
    expect(res.status).toBe(200)
    const json = (await res.json()) as unknown[]
    expect(json).toEqual([])
    expect(bucket.list).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: '_$r2webdav$/trash/' }),
    )
  })

  it('groups objects by deletion timestamp and computes rootEntries', async () => {
    const bucket = makeBucket()
    bucket.list.mockResolvedValue({
      objects: [
        {
          key: '_$r2webdav$/trash/1000/docs',
          size: 0,
          httpMetadata: { contentType: 'application/x-directory' },
        },
        {
          key: '_$r2webdav$/trash/1000/docs/a.txt',
          size: 1,
          httpMetadata: { contentType: 'text/plain' },
        },
        {
          key: '_$r2webdav$/trash/1000/docs/sub/b.txt',
          size: 1,
          httpMetadata: { contentType: 'text/plain' },
        },
        {
          key: '_$r2webdav$/trash/2000/photo.png',
          size: 10,
          httpMetadata: { contentType: 'image/png' },
        },
      ],
      truncated: false,
    })
    const token = await makeToken()
    const res = await callGet(bucket, token)
    expect(res.status).toBe(200)
    const json = (await res.json()) as Array<{
      deletedAt: number
      rootEntries: string[]
      totalCount: number
    }>
    expect(json).toHaveLength(2)
    expect(json[0].deletedAt).toBe(2000)
    expect(json[0].rootEntries).toEqual(['photo.png'])
    expect(json[0].totalCount).toBe(1)
    expect(json[1].deletedAt).toBe(1000)
    expect(json[1].rootEntries).toEqual(['docs'])
    expect(json[1].totalCount).toBe(3)
  })
})

describe('POST /api/trash (restore)', () => {
  it('restores session: puts back to original keys and deletes trash objects', async () => {
    const bucket = makeBucket()
    const trashObj = {
      key: '_$r2webdav$/trash/1000/docs/a.txt',
      size: 1,
      httpMetadata: { contentType: 'text/plain' },
      customMetadata: undefined,
    }
    bucket.list.mockResolvedValue({ objects: [trashObj], truncated: false })
    bucket.head.mockResolvedValue(null)
    bucket.get.mockResolvedValue({ ...trashObj, body: 'body-a' })

    const token = await makeToken()
    const res = await callPost(bucket, token, { deletedAt: 1000 })

    expect(res.status).toBe(204)
    expect(bucket.head).toHaveBeenCalledWith('docs/a.txt')
    expect(bucket.put).toHaveBeenCalledWith(
      'docs/a.txt',
      'body-a',
      expect.objectContaining({ httpMetadata: { contentType: 'text/plain' } }),
    )
    expect(bucket.delete).toHaveBeenCalledWith('_$r2webdav$/trash/1000/docs/a.txt')
  })

  it('returns 409 when any original key already exists', async () => {
    const bucket = makeBucket()
    const trashObj = {
      key: '_$r2webdav$/trash/1000/docs/a.txt',
      size: 1,
      httpMetadata: { contentType: 'text/plain' },
      customMetadata: undefined,
    }
    bucket.list.mockResolvedValue({ objects: [trashObj], truncated: false })
    bucket.head.mockResolvedValue({
      key: 'docs/a.txt',
      httpMetadata: { contentType: 'text/plain' },
    })

    const token = await makeToken()
    const res = await callPost(bucket, token, { deletedAt: 1000 })

    expect(res.status).toBe(409)
    expect(bucket.put).not.toHaveBeenCalled()
    expect(bucket.delete).not.toHaveBeenCalled()
  })

  it('returns 404 when deletedAt session has no objects', async () => {
    const bucket = makeBucket()
    bucket.list.mockResolvedValue({ objects: [], truncated: false })
    const token = await makeToken()
    const res = await callPost(bucket, token, { deletedAt: 9999 })
    expect(res.status).toBe(404)
    expect(bucket.put).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/trash (permanent)', () => {
  it('deletes all trash objects for the session', async () => {
    const bucket = makeBucket()
    bucket.list.mockResolvedValue({
      objects: [
        { key: '_$r2webdav$/trash/1000/a.txt', size: 1 },
        { key: '_$r2webdav$/trash/1000/b.txt', size: 1 },
      ],
      truncated: false,
    })
    const token = await makeToken()
    const res = await callDelete(bucket, token, '1000')
    expect(res.status).toBe(204)
    expect(bucket.delete).toHaveBeenCalledWith('_$r2webdav$/trash/1000/a.txt')
    expect(bucket.delete).toHaveBeenCalledWith('_$r2webdav$/trash/1000/b.txt')
  })
})
