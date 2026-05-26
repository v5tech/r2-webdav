export const INTERNAL_PREFIX = '_$r2webdav$/'
export const TRASH_PREFIX = `${INTERNAL_PREFIX}trash/`

export async function* listAll(
  bucket: R2Bucket,
  prefix?: string,
  isRecursive: boolean = false,
) {
  let cursor: string | undefined = undefined
  do {
    var r2Objects = await bucket.list({
      prefix: prefix,
      delimiter: isRecursive ? undefined : '/',
      cursor: cursor,
      // @ts-ignore
      include: ['httpMetadata', 'customMetadata'],
    })

    for await (const obj of r2Objects.objects)
      if (!obj.key.startsWith(INTERNAL_PREFIX)) yield obj

    if (r2Objects.truncated) cursor = r2Objects.cursor
  } while (r2Objects.truncated)
}
