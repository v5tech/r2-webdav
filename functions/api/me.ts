import { extractSession, verifySessionJwt, type SessionEnv } from '../_shared/auth'

export const onRequestGet: PagesFunction<SessionEnv> = async ({ request, env }) => {
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
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
