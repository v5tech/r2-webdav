import {
  constantTimeEqual,
  DEFAULT_SESSION_TTL_SEC,
  signSessionJwt,
  type BasicAuthEnv,
  type SessionEnv,
} from '../_shared/auth'

interface Env extends BasicAuthEnv, SessionEnv {}

const json = (body: unknown, status: number, extraHeaders?: HeadersInit) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (extraHeaders) new Headers(extraHeaders).forEach((v, k) => headers.append(k, v))
  return new Response(JSON.stringify(body), { status, headers })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  if (!body || typeof body !== 'object') return json({ error: 'invalid_body' }, 400)
  const { username, password } = body as { username?: unknown; password?: unknown }
  if (typeof username !== 'string' || typeof password !== 'string') {
    return json({ error: 'invalid_body' }, 400)
  }

  const userMatch = constantTimeEqual(username, env.WEBDAV_USERNAME ?? '')
  const passMatch = constantTimeEqual(password, env.WEBDAV_PASSWORD ?? '')
  if (!userMatch || !passMatch) return json({ error: 'unauthorized' }, 401)

  const origin = new URL(request.url).origin
  const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
  const cookie = `fd_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${DEFAULT_SESSION_TTL_SEC}`
  return json({ ok: true }, 200, { 'Set-Cookie': cookie })
}
