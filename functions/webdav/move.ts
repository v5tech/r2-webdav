import { RequestHandlerParams } from './utils'
import { handleRequestCopy } from './copy'
import { handleRequestDelete } from './delete'

/*
 * MOVE = COPY then DELETE; non-atomic.
 * - COPY failure: response is forwarded; source remains intact.
 * - COPY success + DELETE failure: source is preserved (or partially deleted)
 *   while destination is already written. Collection DELETE returns 207 listing
 *   the failed key(s); a single non-collection DELETE failure returns 500.
 *   Clients may retry DELETE or clean up out-of-band (RFC 4918 §9.9.4 lists 207
 *   for MOVE when multiple resources are affected and some cannot be moved).
 */

export async function handleRequestMove({ bucket, path, request }: RequestHandlerParams) {
  const response = await handleRequestCopy({ bucket, path, request })
  if (response.status >= 400) return response
  return handleRequestDelete({ bucket, path, request })
}
