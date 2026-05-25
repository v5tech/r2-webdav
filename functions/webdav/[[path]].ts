import { authorizeWebdav, type WebdavAuthEnv } from '../_shared/auth'
import { notFound, parseBucketPath } from './utils'
import { handleRequestCopy } from './copy'
import { handleRequestDelete } from './delete'
import { handleRequestGet } from './get'
import { handleRequestHead } from './head'
import { handleRequestMkcol } from './mkcol'
import { handleRequestMove } from './move'
import { handleRequestPropfind } from './propfind'
import { handleRequestPut } from './put'
import { RequestHandlerParams } from './utils'
import { handleRequestPost } from './post'

async function handleRequestOptions() {
  return new Response(null, {
    headers: {
      Allow: `OPTIONS, ${Object.keys(HANDLERS).join(', ')}`,
      DAV: '1',
    },
  })
}

async function handleMethodNotAllowed() {
  return new Response(null, { status: 405 })
}

const HANDLERS: Record<string, (context: RequestHandlerParams) => Promise<Response>> = {
  PROPFIND: handleRequestPropfind,
  MKCOL: handleRequestMkcol,
  HEAD: handleRequestHead,
  GET: handleRequestGet,
  POST: handleRequestPost,
  PUT: handleRequestPut,
  COPY: handleRequestCopy,
  MOVE: handleRequestMove,
  DELETE: handleRequestDelete,
}

export const onRequest: PagesFunction<WebdavAuthEnv> = async function (context) {
  const request: Request = context.request
  if (request.method === 'OPTIONS') return handleRequestOptions()

  const origin = new URL(request.url).origin
  const authz = await authorizeWebdav(request, context.env, origin)
  if (!authz.ok) return authz.response

  const [bucket, path] = parseBucketPath(context)
  if (!bucket) return notFound()

  const handler = HANDLERS[request.method] ?? handleMethodNotAllowed
  return handler({ bucket, path, request })
}
