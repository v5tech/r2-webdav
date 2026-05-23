import { extractSession, verifySessionJwt, type SessionEnv } from '../_shared/auth'

const TRASH_PREFIX = '_$flaredrive$/trash/'

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

export const onRequestGet: PagesFunction<TrashEnv> = async ({ request, env }) => {
  const token = extractSession(request)
  if (!token) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const origin = new URL(request.url).origin
  const payload = await verifySessionJwt(env, token, origin)
  if (!payload) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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
