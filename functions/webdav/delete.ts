import pLimit from 'p-limit'

import { notFound } from './utils'
import { listAll, RequestHandlerParams, WEBDAV_ENDPOINT } from './utils'
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
 * Multi-Status. RFC 4918 §9.6.1 mandates 207 for collections; single objects
 * reuse the same shape so clients have one error-parsing path.
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

export async function handleRequestDelete({ bucket, path }: RequestHandlerParams) {
  const trashRoot = `${TRASH_PREFIX}${Date.now()}/`
  const failures: Array<{ key: string; status: string }> = []

  let isDirectory = false
  if (path !== '') {
    const obj = await bucket.head(path)
    if (obj === null) return notFound()
    isDirectory = obj.httpMetadata?.contentType === 'application/x-directory'

    try {
      await moveChildToTrash(bucket, obj, trashRoot)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal Server Error'
      failures.push({ key: path, status: `HTTP/1.1 500 ${msg}` })
    }
  }

  if (isDirectory || path === '') {
    const prefix = path === '' ? undefined : `${path}/`
    const limit = pLimit(5)
    const tasks: Array<Promise<void>> = []
    for await (const child of listAll(bucket, prefix, true)) {
      tasks.push(
        limit(async () => {
          try {
            await moveChildToTrash(bucket, child, trashRoot)
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Internal Server Error'
            failures.push({ key: child.key, status: `HTTP/1.1 500 ${msg}` })
          }
        }),
      )
    }
    await Promise.all(tasks)
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
          href: encodeURI(`${WEBDAV_ENDPOINT}${f.key}`),
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
