import { TRASH_PREFIX } from './r2'

const TRASH_TTL_MS = 14 * 24 * 60 * 60 * 1000
const TRASH_PURGE_SAMPLE = 0.1

export async function purgeExpiredTrash(bucket: R2Bucket, now: number = Date.now()): Promise<number> {
  const cutoff = now - TRASH_TTL_MS
  let cursor: string | undefined
  let deleted = 0
  do {
    const list: R2Objects = await bucket.list({ prefix: TRASH_PREFIX, cursor })
    for (const obj of list.objects) {
      const rest = obj.key.slice(TRASH_PREFIX.length)
      const slashIdx = rest.indexOf('/')
      const tsStr = slashIdx >= 0 ? rest.slice(0, slashIdx) : rest
      if (!/^\d+$/.test(tsStr)) continue
      const ts = Number(tsStr)
      if (ts < cutoff) {
        await bucket.delete(obj.key)
        deleted++
      }
    }
    cursor = list.truncated ? list.cursor : undefined
  } while (cursor)
  return deleted
}

export async function maybePurgeExpiredTrash(
  bucket: R2Bucket,
  rand: () => number = Math.random,
): Promise<void> {
  if (rand() > TRASH_PURGE_SAMPLE) return
  try {
    await purgeExpiredTrash(bucket)
  } catch {
    // fire-and-forget: purge failure must not break the user-facing response
  }
}
