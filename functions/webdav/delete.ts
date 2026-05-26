import { notFound } from './utils'
import { listAll, RequestHandlerParams } from './utils'
import { maybePurgeExpiredTrash } from '../_shared/trash'
import { TRASH_PREFIX } from '../_shared/r2'

export async function handleRequestDelete({ bucket, path }: RequestHandlerParams) {
  const trashRoot = `${TRASH_PREFIX}${Date.now()}/`

  let isDirectory = false
  if (path !== '') {
    const obj = await bucket.head(path)
    if (obj === null) return notFound()
    isDirectory = obj.httpMetadata?.contentType === 'application/x-directory'

    const src = await bucket.get(path)
    if (src !== null) {
      await bucket.put(`${trashRoot}${path}`, src.body, {
        httpMetadata: src.httpMetadata,
        customMetadata: src.customMetadata,
      })
      await bucket.delete(path)
    }

    if (!isDirectory) {
      await maybePurgeExpiredTrash(bucket)
      return new Response(null, { status: 204 })
    }
  }

  const prefix = path === '' ? undefined : `${path}/`
  for await (const child of listAll(bucket, prefix, true)) {
    const childSrc = await bucket.get(child.key)
    if (childSrc === null) continue
    await bucket.put(`${trashRoot}${child.key}`, childSrc.body, {
      httpMetadata: child.httpMetadata,
      customMetadata: child.customMetadata,
    })
    await bucket.delete(child.key)
  }

  await maybePurgeExpiredTrash(bucket)
  return new Response(null, { status: 204 })
}
