export const onRequestPost: PagesFunction = async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append(
    'Set-Cookie',
    'r2_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
  )
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
}
