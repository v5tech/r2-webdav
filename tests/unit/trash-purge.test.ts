import { describe, expect, it, vi } from 'vitest'

import { maybePurgeExpiredTrash, purgeExpiredTrash } from '../../functions/_shared/trash'

interface MockBucket {
  list: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

function makeBucket(): MockBucket {
  return {
    list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

const TTL_MS = 14 * 24 * 60 * 60 * 1000
const NOW = 1_800_000_000_000 // arbitrary fixed "now"
const OLD_TS = NOW - TTL_MS - 1 // just past the cutoff
const FRESH_TS = NOW - TTL_MS + 1000 // just within the cutoff

function trashObj(ts: number | string, rest: string) {
  return { key: `_$r2webdav$/trash/${ts}/${rest}` }
}

describe('purgeExpiredTrash', () => {
  it('deletes objects older than 14 days', async () => {
    const bucket = makeBucket()
    bucket.list.mockResolvedValueOnce({
      objects: [trashObj(OLD_TS, 'foo.txt')],
      truncated: false,
    })

    const deleted = await purgeExpiredTrash(bucket as unknown as R2Bucket, NOW)

    expect(deleted).toBe(1)
    expect(bucket.delete).toHaveBeenCalledWith(`_$r2webdav$/trash/${OLD_TS}/foo.txt`)
  })

  it('keeps objects within 14 days', async () => {
    const bucket = makeBucket()
    bucket.list.mockResolvedValueOnce({
      objects: [trashObj(FRESH_TS, 'bar.txt')],
      truncated: false,
    })

    const deleted = await purgeExpiredTrash(bucket as unknown as R2Bucket, NOW)

    expect(deleted).toBe(0)
    expect(bucket.delete).not.toHaveBeenCalled()
  })

  it('deletes only expired in a mixed list', async () => {
    const bucket = makeBucket()
    bucket.list.mockResolvedValueOnce({
      objects: [
        trashObj(OLD_TS, 'a.txt'),
        trashObj(FRESH_TS, 'b.txt'),
        trashObj(OLD_TS, 'sub/c.txt'),
      ],
      truncated: false,
    })

    const deleted = await purgeExpiredTrash(bucket as unknown as R2Bucket, NOW)

    expect(deleted).toBe(2)
    expect(bucket.delete).toHaveBeenCalledWith(`_$r2webdav$/trash/${OLD_TS}/a.txt`)
    expect(bucket.delete).toHaveBeenCalledWith(`_$r2webdav$/trash/${OLD_TS}/sub/c.txt`)
    expect(bucket.delete).not.toHaveBeenCalledWith(`_$r2webdav$/trash/${FRESH_TS}/b.txt`)
  })

  it('skips entries with non-numeric timestamp segment', async () => {
    const bucket = makeBucket()
    bucket.list.mockResolvedValueOnce({
      objects: [
        { key: '_$r2webdav$/trash/notanumber/foo.txt' },
        { key: '_$r2webdav$/trash/' }, // degenerate
        trashObj(OLD_TS, 'good.txt'),
      ],
      truncated: false,
    })

    const deleted = await purgeExpiredTrash(bucket as unknown as R2Bucket, NOW)

    expect(deleted).toBe(1)
    expect(bucket.delete).toHaveBeenCalledTimes(1)
    expect(bucket.delete).toHaveBeenCalledWith(`_$r2webdav$/trash/${OLD_TS}/good.txt`)
  })

  it('paginates through truncated list', async () => {
    const bucket = makeBucket()
    bucket.list
      .mockResolvedValueOnce({
        objects: [trashObj(OLD_TS, 'page1.txt')],
        truncated: true,
        cursor: 'CURSOR1',
      })
      .mockResolvedValueOnce({
        objects: [trashObj(OLD_TS, 'page2.txt')],
        truncated: false,
      })

    const deleted = await purgeExpiredTrash(bucket as unknown as R2Bucket, NOW)

    expect(deleted).toBe(2)
    expect(bucket.list).toHaveBeenCalledTimes(2)
    expect(bucket.list).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: 'CURSOR1' }))
  })

  it('lists with TRASH_PREFIX scope only', async () => {
    const bucket = makeBucket()

    await purgeExpiredTrash(bucket as unknown as R2Bucket, NOW)

    expect(bucket.list).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: '_$r2webdav$/trash/' }),
    )
  })
})

describe('maybePurgeExpiredTrash', () => {
  it('does not run purge when random sample misses (> 0.1)', async () => {
    const bucket = makeBucket()

    await maybePurgeExpiredTrash(bucket as unknown as R2Bucket, () => 0.5)

    expect(bucket.list).not.toHaveBeenCalled()
  })

  it('runs purge when random sample hits (<= 0.1)', async () => {
    const bucket = makeBucket()

    await maybePurgeExpiredTrash(bucket as unknown as R2Bucket, () => 0.05)

    expect(bucket.list).toHaveBeenCalled()
  })

  it('swallows purge errors (fire-and-forget — must not break caller)', async () => {
    const bucket = makeBucket()
    bucket.list.mockRejectedValueOnce(new Error('R2 transient failure'))

    await expect(
      maybePurgeExpiredTrash(bucket as unknown as R2Bucket, () => 0.05),
    ).resolves.toBeUndefined()
  })
})
