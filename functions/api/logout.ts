import { SESSION_COOKIE_NAME } from '../_shared/auth'

export const onRequestPost: PagesFunction = async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  )
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
}
