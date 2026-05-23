import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { onRequestGet } from '../../functions/api/trash'

interface MockBucket {
  list: ReturnType<typeof vi.fn>
}

function makeBucket(): MockBucket {
  return {
    list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
  }
}

const ORIGIN = 'http://localhost'
const PASSWORD = 'pw-fixed-for-tests'

async function callHandler(bucket: MockBucket, token: string | null) {
  const headers: Record<string, string> = {}
  if (token) headers['Cookie'] = `fd_session=${token}`
  const request = new Request(`${ORIGIN}/api/trash`, { method: 'GET', headers })
  return onRequestGet({
    request,
    env: {
      WEBDAV_PASSWORD: PASSWORD,
      BUCKET: bucket as unknown as R2Bucket,
    },
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
    const res = await callHandler(bucket, null)
    expect(res.status).toBe(401)
    expect(bucket.list).not.toHaveBeenCalled()
  })

  it('returns empty array when trash is empty', async () => {
    const bucket = makeBucket()
    const token = await makeToken()
    const res = await callHandler(bucket, token)
    expect(res.status).toBe(200)
    const json = (await res.json()) as unknown[]
    expect(json).toEqual([])
    expect(bucket.list).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: '_$flaredrive$/trash/' }),
    )
  })

  it('groups objects by deletion timestamp and computes rootEntries', async () => {
    const bucket = makeBucket()
    bucket.list.mockResolvedValue({
      objects: [
        {
          key: '_$flaredrive$/trash/1000/docs',
          size: 0,
          httpMetadata: { contentType: 'application/x-directory' },
        },
        {
          key: '_$flaredrive$/trash/1000/docs/a.txt',
          size: 1,
          httpMetadata: { contentType: 'text/plain' },
        },
        {
          key: '_$flaredrive$/trash/1000/docs/sub/b.txt',
          size: 1,
          httpMetadata: { contentType: 'text/plain' },
        },
        {
          key: '_$flaredrive$/trash/2000/photo.png',
          size: 10,
          httpMetadata: { contentType: 'image/png' },
        },
      ],
      truncated: false,
    })
    const token = await makeToken()
    const res = await callHandler(bucket, token)
    expect(res.status).toBe(200)
    const json = (await res.json()) as Array<{
      deletedAt: number
      rootEntries: string[]
      totalCount: number
    }>
    expect(json).toHaveLength(2)
    // 最近在前
    expect(json[0].deletedAt).toBe(2000)
    expect(json[0].rootEntries).toEqual(['photo.png'])
    expect(json[0].totalCount).toBe(1)
    expect(json[1].deletedAt).toBe(1000)
    expect(json[1].rootEntries).toEqual(['docs'])
    expect(json[1].totalCount).toBe(3)
  })
})
