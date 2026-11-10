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
 * Collection member failures report 207 Multi-Status (RFC 4918 §9.6.1); a
 * single non-collection object or collection-target failure is a plain 500.
 * Collection members are trashed before their markers; directory markers are
 * processed deepest-first so a failed member leaves every ancestor intact.
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

type DeleteFailure = { key: string; status: string }

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Internal Server Error'
}

async function failedDeleteResponse(bucket: R2Bucket, err: unknown): Promise<Response> {
  await maybePurgeExpiredTrash(bucket)
  return new Response(errorMessage(err), { status: 500 })
}

function failureFor(key: string, err: unknown): DeleteFailure {
  return { key, status: `HTTP/1.1 500 ${errorMessage(err)}` }
}

function isDirectoryObject(object: R2Object): boolean {
  return object.httpMetadata?.contentType === 'application/x-directory'
}

export async function handleRequestDelete({ bucket, path }: RequestHandlerParams) {
  const trashRoot = `${TRASH_PREFIX}${Date.now()}/`

  let target: R2Object | null = null
  if (path !== '') {
    target = await bucket.head(path)
    if (target === null) return notFound()
  }

  // A single non-collection object has no members, so a failure is a plain 500.
  if (target && !isDirectoryObject(target)) {
    try {
      await moveChildToTrash(bucket, target, trashRoot)
    } catch (err) {
      return failedDeleteResponse(bucket, err)
    }
    await maybePurgeExpiredTrash(bucket)
    return new Response(null, { status: 204 })
  }

  // Collection (or root): delete members first, ancestors last.
  const failures: DeleteFailure[] = []
  const prefix = path === '' ? undefined : `${path}/`
  const children: R2Object[] = []
  for await (const child of listAll(bucket, prefix, true)) children.push(child)

  const files = children.filter((child) => !isDirectoryObject(child))
  const directoriesByDepth = new Map<number, R2Object[]>()
  for (const directory of children.filter(isDirectoryObject)) {
    const depth = directory.key.split('/').length
    const group = directoriesByDepth.get(depth) ?? []
    group.push(directory)
    directoriesByDepth.set(depth, group)
  }

  const limit = pLimit(5)
  await Promise.all(
    files.map((child) =>
      limit(async () => {
        try {
          await moveChildToTrash(bucket, child, trashRoot)
        } catch (err) {
          failures.push(failureFor(child.key, err))
        }
      }),
    ),
  )

  // Markers at the same depth cannot be ancestors of each other, so each depth
  // layer can run in parallel; deeper layers complete first.
  for (const depth of Array.from(directoriesByDepth.keys()).sort((a, b) => b - a)) {
    const directories = directoriesByDepth.get(depth) ?? []
    await Promise.all(
      directories.map((directory) =>
        limit(async () => {
          // RFC 4918 §9.6.1: keep every ancestor of a failed member.
          if (failures.some((failure) => failure.key.startsWith(`${directory.key}/`))) return
          try {
            await moveChildToTrash(bucket, directory, trashRoot)
          } catch (err) {
            failures.push(failureFor(directory.key, err))
          }
        }),
      ),
    )
  }

  if (target && failures.length === 0) {
    try {
      await moveChildToTrash(bucket, target, trashRoot)
    } catch (err) {
      return failedDeleteResponse(bucket, err)
    }
  }

  await maybePurgeExpiredTrash(bucket)

  if (failures.length === 0) {
    return new Response(null, { status: 204 })
  }

  const body =
    MULTISTATUS_OPEN +
    failures
      .map((failure) =>
        renderErrorResponse({
          href: `${WEBDAV_ENDPOINT}${encodeKey(failure.key)}`,
          status: failure.status,
        }),
      )
      .join('') +
    MULTISTATUS_CLOSE
  return new Response(body, {
    status: 207,
    headers: { 'Content-Type': 'application/xml' },
  })
}
