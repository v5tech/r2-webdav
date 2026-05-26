import { MULTISTATUS_CLOSE, MULTISTATUS_OPEN, escapeXml, renderPropResponse } from '../_shared/xml'
import { listAll, RequestHandlerParams, ROOT_OBJECT, WEBDAV_ENDPOINT } from './utils'

type DavProperties = {
  creationdate: string | undefined
  displayname: string | undefined
  getcontentlanguage: string | undefined
  getcontentlength: string | undefined
  getcontenttype: string | undefined
  getetag: string | undefined
  getlastmodified: string | undefined
  resourcetype: string
  'fd:thumbnail': string | undefined
}

function fromR2Object(object: R2Object | typeof ROOT_OBJECT): DavProperties {
  return {
    creationdate: object.uploaded.toUTCString(),
    displayname: object.httpMetadata?.contentDisposition,
    getcontentlanguage: object.httpMetadata?.contentLanguage,
    getcontentlength: object.size.toString(),
    getcontenttype: object.httpMetadata?.contentType,
    getetag: object.etag,
    getlastmodified: object.uploaded.toUTCString(),
    resourcetype:
      object.httpMetadata?.contentType === 'application/x-directory' ? '<collection />' : '',
    'fd:thumbnail': object.customMetadata?.thumbnail,
  }
}

async function* iterChildren({
  bucket,
  path,
  depth,
}: {
  bucket: R2Bucket
  path: string
  depth: string
}): AsyncGenerator<R2Object> {
  if (!['1', 'infinity'].includes(depth)) return
  const prefix = path === '' ? path : `${path}/`
  for await (const object of listAll(bucket, prefix, depth === 'infinity')) {
    yield object
  }
}

function renderItem(child: R2Object | typeof ROOT_OBJECT, isPropname: boolean): string {
  const properties = fromR2Object(child)
  const isDir = child.httpMetadata?.contentType === 'application/x-directory'
  const rawHref = `${WEBDAV_ENDPOINT}${child.key}`
  const href = isDir && !rawHref.endsWith('/') ? `${rawHref}/` : rawHref
  const propsXml = isPropname
    ? Object.keys(properties)
        .map((key) => `<${key}/>`)
        .join('\n')
    : Object.entries(properties)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) =>
          key === 'resourcetype'
            ? `<${key}>${value}</${key}>`
            : `<${key}>${escapeXml(value as string)}</${key}>`,
        )
        .join('\n')
  return renderPropResponse({ href: encodeURI(href), propsXml })
}

export async function handleRequestPropfind({ bucket, path, request }: RequestHandlerParams) {
  const requestBody = await request.text().catch(() => '')
  const isPropname = /<(?:[a-z][\w-]*:)?propname[\s/>]/i.test(requestBody)

  const rootObject = path === '' ? ROOT_OBJECT : await bucket.head(path)
  if (!rootObject) return new Response('Not found', { status: 404 })
  const isDirectory =
    rootObject === ROOT_OBJECT || rootObject.httpMetadata?.contentType === 'application/x-directory'
  const depth = request.headers.get('Depth') ?? '1'

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(MULTISTATUS_OPEN))
        controller.enqueue(encoder.encode(renderItem(rootObject, isPropname)))
        if (isDirectory) {
          for await (const child of iterChildren({ bucket, path, depth })) {
            controller.enqueue(encoder.encode(renderItem(child, isPropname)))
          }
        }
        controller.enqueue(encoder.encode(MULTISTATUS_CLOSE))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    status: 207,
    headers: { 'Content-Type': 'application/xml' },
  })
}
