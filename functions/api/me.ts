import { requireOwnerSession, type SessionEnv } from '../_shared/auth'

export const onRequestGet: PagesFunction<SessionEnv> = async ({ request, env }) => {
  const err = await requireOwnerSession(request, env)
  if (err) return err
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
