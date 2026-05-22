import { describe, expect, it } from 'vitest'

import { onRequestPost as loginHandler } from '../../functions/api/login'
import { onRequestPost as logoutHandler } from '../../functions/api/logout'
import { onRequestGet as meHandler } from '../../functions/api/me'
import { signSessionJwt } from '../../functions/_shared/auth'

const env = { WEBDAV_USERNAME: 'admin', WEBDAV_PASSWORD: 'secret123' }
const origin = 'https://drive.example.com'

// Pages Functions context shape — only fields the handlers touch.
const ctx = (request: Request, envOverride = env) =>
  ({ request, env: envOverride }) as unknown as Parameters<typeof loginHandler>[0]

const postLogin = (body: unknown) =>
  new Request(`${origin}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

const parseSetCookie = (res: Response) => res.headers.get('Set-Cookie') ?? ''

describe('/api/login POST', () => {
  it('returns 200 + Set-Cookie fd_session on correct creds', async () => {
    const res = await loginHandler(ctx(postLogin({ username: 'admin', password: 'secret123' })))
    expect(res.status).toBe(200)
    const cookie = parseSetCookie(res)
    expect(cookie).toMatch(/^fd_session=[^;]+/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/Secure/)
    expect(cookie).toMatch(/SameSite=Lax/)
    expect(cookie).toMatch(/Path=\//)
    expect(cookie).toMatch(/Max-Age=604800/)
    const json = await res.json()
    expect(json).toEqual({ ok: true })
  })

  it('returns 401 on wrong password', async () => {
    const res = await loginHandler(ctx(postLogin({ username: 'admin', password: 'wrong' })))
    expect(res.status).toBe(401)
    expect(parseSetCookie(res)).toBe('')
  })

  it('returns 401 on wrong username', async () => {
    const res = await loginHandler(ctx(postLogin({ username: 'root', password: 'secret123' })))
    expect(res.status).toBe(401)
  })

  it('returns 400 on malformed JSON', async () => {
    const res = await loginHandler(ctx(postLogin('not json{')))
    expect(res.status).toBe(400)
  })

  it('returns 400 on missing fields', async () => {
    const res = await loginHandler(ctx(postLogin({ username: 'admin' })))
    expect(res.status).toBe(400)
  })

  it('returns 400 on non-string field types', async () => {
    const res = await loginHandler(ctx(postLogin({ username: 'admin', password: 123 })))
    expect(res.status).toBe(400)
  })

  it('signed JWT verifies for current origin', async () => {
    const res = await loginHandler(ctx(postLogin({ username: 'admin', password: 'secret123' })))
    const cookie = parseSetCookie(res)
    const m = cookie.match(/fd_session=([^;]+)/)
    expect(m).not.toBeNull()
    const { verifySessionJwt } = await import('../../functions/_shared/auth')
    const payload = await verifySessionJwt(env, m![1], origin)
    expect(payload).not.toBeNull()
    expect(payload!.sub).toBe('owner')
    expect(payload!.iss).toBe(origin)
  })
})

describe('/api/logout POST', () => {
  it('returns 200 + Set-Cookie Max-Age=0', async () => {
    const req = new Request(`${origin}/api/logout`, { method: 'POST' })
    const res = await logoutHandler(ctx(req))
    expect(res.status).toBe(200)
    const cookie = parseSetCookie(res)
    expect(cookie).toMatch(/^fd_session=/)
    expect(cookie).toMatch(/Max-Age=0/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/Path=\//)
  })
})

describe('/api/me GET', () => {
  it('returns 200 + {ok:true} on valid cookie', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
    const req = new Request(`${origin}/api/me`, {
      headers: { Cookie: `fd_session=${token}` },
    })
    const res = await meHandler(ctx(req))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 401 on no cookie', async () => {
    const req = new Request(`${origin}/api/me`)
    const res = await meHandler(ctx(req))
    expect(res.status).toBe(401)
  })

  it('returns 401 on tampered cookie', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
    const tampered = token.slice(0, -3) + 'AAA'
    const req = new Request(`${origin}/api/me`, {
      headers: { Cookie: `fd_session=${tampered}` },
    })
    const res = await meHandler(ctx(req))
    expect(res.status).toBe(401)
  })

  it('returns 401 on cookie issued for different origin', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: 'https://other.example' })
    const req = new Request(`${origin}/api/me`, {
      headers: { Cookie: `fd_session=${token}` },
    })
    const res = await meHandler(ctx(req))
    expect(res.status).toBe(401)
  })
})
