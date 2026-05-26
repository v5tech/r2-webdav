import { requireOwnerSession, type SessionEnv } from '../_shared/auth'

const TRASH_PREFIX = '_$r2webdav$/trash/'

interface TrashEnv extends SessionEnv {
  BUCKET: R2Bucket
}

interface TrashSession {
  deletedAt: number
  rootEntries: string[]
  totalCount: number
}

function computeRootEntries(paths: string[]): string[] {
  const sorted = [...paths].sort()
  const roots: string[] = []
  for (const p of sorted) {
    if (!roots.some((r) => p === r || p.startsWith(r + '/'))) {
      roots.push(p)
    }
  }
  return roots
}

async function listSessionObjects(
  bucket: R2Bucket,
  deletedAt: number,
): Promise<R2Object[]> {
  const prefix = `${TRASH_PREFIX}${deletedAt}/`
  const result: R2Object[] = []
  let cursor: string | undefined = undefined
  do {
    const res = await bucket.list({ prefix, cursor })
    result.push(...res.objects)
    cursor = res.truncated ? res.cursor : undefined
  } while (cursor)
  return result
}

export const onRequestGet: PagesFunction<TrashEnv> = async ({ request, env }) => {
  const authError = await requireOwnerSession(request, env)
  if (authError) return authError

  const groups = new Map<number, string[]>()
  let cursor: string | undefined = undefined
  do {
    const res = await env.BUCKET.list({ prefix: TRASH_PREFIX, cursor })
    for (const obj of res.objects) {
      const rest = obj.key.slice(TRASH_PREFIX.length)
      const slashIdx = rest.indexOf('/')
      if (slashIdx <= 0) continue
      const ms = Number(rest.slice(0, slashIdx))
      if (!Number.isFinite(ms)) continue
      const originalKey = rest.slice(slashIdx + 1)
      const paths = groups.get(ms) ?? []
      paths.push(originalKey)
      groups.set(ms, paths)
    }
    cursor = res.truncated ? res.cursor : undefined
  } while (cursor)

  const result: TrashSession[] = Array.from(groups.entries())
    .map(([deletedAt, paths]) => ({
      deletedAt,
      rootEntries: computeRootEntries(paths),
      totalCount: paths.length,
    }))
    .sort((a, b) => b.deletedAt - a.deletedAt)

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestPost: PagesFunction<TrashEnv> = async ({ request, env }) => {
  const authError = await requireOwnerSession(request, env)
  if (authError) return authError

  let body: { deletedAt?: unknown }
  try {
    body = (await request.json()) as { deletedAt?: unknown }
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
  const deletedAt = Number(body.deletedAt)
  if (!Number.isFinite(deletedAt)) return new Response('Bad Request', { status: 400 })

  const trashObjects = await listSessionObjects(env.BUCKET, deletedAt)
  if (trashObjects.length === 0) return new Response('Not Found', { status: 404 })

  const trashPrefix = `${TRASH_PREFIX}${deletedAt}/`

  for (const obj of trashObjects) {
    const originalKey = obj.key.slice(trashPrefix.length)
    const existing = await env.BUCKET.head(originalKey)
    if (existing) {
      return new Response(
        JSON.stringify({ error: 'conflict', conflictKey: originalKey }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  for (const obj of trashObjects) {
    const originalKey = obj.key.slice(trashPrefix.length)
    const src = await env.BUCKET.get(obj.key)
    if (!src) continue
    await env.BUCKET.put(originalKey, src.body, {
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata,
    })
    await env.BUCKET.delete(obj.key)
  }

  return new Response(null, { status: 204 })
}

export const onRequestDelete: PagesFunction<TrashEnv> = async ({ request, env }) => {
  const authError = await requireOwnerSession(request, env)
  if (authError) return authError

  const url = new URL(request.url)
  const tsParam = url.searchParams.get('ts')
  const ts = Number(tsParam)
  if (!tsParam || !Number.isFinite(ts)) return new Response('Bad Request', { status: 400 })

  const trashObjects = await listSessionObjects(env.BUCKET, ts)
  if (trashObjects.length === 0) return new Response('Not Found', { status: 404 })

  for (const obj of trashObjects) {
    await env.BUCKET.delete(obj.key)
  }

  return new Response(null, { status: 204 })
}
