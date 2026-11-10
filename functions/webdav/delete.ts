import pLimit from 'p-limit'

import { notFound } from './utils'
import { listAll, RequestHandlerParams, WEBDAV_ENDPOINT, encodeKey } from './utils'
import { maybePurgeExpiredTrash } from '../_shared/trash'
import { TRASH_PREFIX } from '../_shared/r2'
import { MULTISTATUS_CLOSE, MULTISTATUS_OPEN, renderErrorResponse } from '../_shared/xml'

/*
 * Soft-delete: copy to _$r2webdav$/trash/<ts>/ then remove original.
 *
 * R2 Workers binding has no server-side copy (verified against
 * @cloudflare/workers-types v4.20260524.1) — copy streams through the worker,
 * bounded by wall-time and subrequest budgets. Large objects approaching R2's
 * 5 GiB single-object cap should use rclone over R2 S3 (see README).
 *
 * Both single-object and recursive paths report partial failures via 207
 * Multi-Status. RFC 4918 §9.6.1 uses 207 for member-resource failures; single
 * objects reuse the same shape so clients have one error-parsing path.
 * Collection children are trashed before the marker so a failed member leaves
 * its ancestors intact (RFC 4918 §9.6.1).
 */

async function moveChildToTrash(
  bucket: R2Bucket,
  child: R2Object,
  trashRoot: string,
): Promise<void> {
  const childSrc = await bucket.get(child.key)
  if (childSrc === null) return
  await bucket.put(`${trashRoot}${child.key}`, childSrc.body, {
    httpMetadata: child.httpMetadata,
    customMetadata: child.customMetadata,
  })
  await bucket.delete(child.key)
}

function failureFor(key: string, err: unknown): { key: string; status: string } {
  const msg = err instanceof Error ? err.message : 'Internal Server Error'
  return { key, status: `HTTP/1.1 500 ${msg}` }
}

export async function handleRequestDelete({ bucket, path }: RequestHandlerParams) {
  const trashRoot = `${TRASH_PREFIX}${Date.now()}/`
  const failures: Array<{ key: string; status: string }> = []

  let target: R2Object | null = null
  if (path !== '') {
    target = await bucket.head(path)
    if (target === null) return notFound()
  }

  const isCollection =
    path === '' || target?.httpMetadata?.contentType === 'application/x-directory'

  if (isCollection) {
    const prefix = path === '' ? undefined : `${path}/`
    const limit = pLimit(5)
    const tasks: Array<Promise<void>> = []
    for await (const child of listAll(bucket, prefix, true)) {
      tasks.push(
        limit(async () => {
          try {
            await moveChildToTrash(bucket, child, trashRoot)
          } catch (err) {
            failures.push(failureFor(child.key, err))
          }
        }),
      )
    }
    await Promise.all(tasks)
  }

  // Delete the collection target last: RFC 4918 §9.6.1 requires ancestors
  // to survive when a member cannot be deleted.
  if (target && (!isCollection || failures.length === 0)) {
    try {
      await moveChildToTrash(bucket, target, trashRoot)
    } catch (err) {
      failures.push(failureFor(path, err))
    }
  }

  await maybePurgeExpiredTrash(bucket)

  if (failures.length === 0) {
    return new Response(null, { status: 204 })
  }

  const body =
    MULTISTATUS_OPEN +
    failures
      .map((f) =>
        renderErrorResponse({
          href: `${WEBDAV_ENDPOINT}${encodeKey(f.key)}`,
          status: f.status,
        }),
      )
      .join('') +
    MULTISTATUS_CLOSE
  return new Response(body, {
    status: 207,
    headers: { 'Content-Type': 'application/xml' },
  })
}
