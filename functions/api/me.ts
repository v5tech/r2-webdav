import { requireOwnerSession, type SessionEnv } from '../_shared/auth'

interface Env extends SessionEnv {
  WEBDAV_USERNAME: string
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const err = await requireOwnerSession(request, env)
  if (err) return err
  return new Response(JSON.stringify({ ok: true, username: env.WEBDAV_USERNAME }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
