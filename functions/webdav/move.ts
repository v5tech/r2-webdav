import { RequestHandlerParams } from './utils'
import { handleRequestCopy } from './copy'
import { handleRequestDelete } from './delete'

/*
 * MOVE = COPY then DELETE; non-atomic.
 * - COPY failure: response is forwarded; source remains intact.
 * - COPY success + DELETE partial failure: source is preserved (or partially
 *   deleted) while destination is already written. DELETE returns 207 listing
 *   the failed key(s); clients may retry DELETE or clean up out-of-band
 *   (RFC 4918 §9.9.1 permits 207 for MOVE partial failure).
 */

export async function handleRequestMove({ bucket, path, request }: RequestHandlerParams) {
  const response = await handleRequestCopy({ bucket, path, request })
  if (response.status >= 400) return response
  return handleRequestDelete({ bucket, path, request })
}
