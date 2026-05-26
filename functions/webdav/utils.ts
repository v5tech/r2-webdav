export interface RequestHandlerParams {
  bucket: R2Bucket
  path: string
  request: Request
}

export const WEBDAV_ENDPOINT = '/webdav/'

export const ROOT_OBJECT = {
  key: '',
  uploaded: new Date(),
  httpMetadata: {
    contentType: 'application/x-directory',
    contentDisposition: undefined,
    contentLanguage: undefined,
  },
  customMetadata: undefined,
  size: 0,
  etag: undefined,
}

export function notFound() {
  return new Response('Not found', { status: 404 })
}

export function parseBucketPath(context: any): [R2Bucket, string] {
  const { env, params } = context
  const pathSegments = (params.path || []) as String[]
  const path = decodeURIComponent(pathSegments.join('/'))
  return [env.BUCKET, path]
}

export { listAll } from '../_shared/r2'
