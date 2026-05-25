import { describe, expect, it } from 'vitest'

import { authorizeWebdav, signSessionJwt } from '../../functions/_shared/auth'

const env = {
  WEBDAV_USERNAME: 'admin',
  WEBDAV_PASSWORD: 'secret123',
}
const origin = 'https://drive.example.com'
const basicHeader = (u: string, p: string) => `Basic ${btoa(`${u}:${p}`)}`

const mkReq = (opts: {
  method?: string
  cookie?: string
  auth?: string
  url?: string
}) => {
  const headers: Record<string, string> = {}
  if (opts.cookie) headers.Cookie = opts.cookie
  if (opts.auth) headers.Authorization = opts.auth
  return new Request(opts.url ?? `${origin}/webdav/foo.txt`, {
    method: opts.method ?? 'GET',
    headers,
  })
}

describe('authorizeWebdav — step 1: valid cookie', () => {
  it('allows when cookie JWT verifies', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
    const res = await authorizeWebdav(
      mkReq({ method: 'PUT', cookie: `fd_session=${token}` }),
      env,
      origin,
    )
    expect(res.ok).toBe(true)
  })

  it('allows valid cookie even with bogus Basic header', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
    const res = await authorizeWebdav(
      mkReq({ cookie: `fd_session=${token}`, auth: basicHeader('admin', 'wrong') }),
      env,
      origin,
    )
    expect(res.ok).toBe(true)
  })
})

describe('authorizeWebdav — step 2: invalid cookie → 401 no fallback', () => {
  it('rejects tampered cookie even when Basic would pass', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
    const tampered = token.slice(0, -3) + 'AAA'
    const res = await authorizeWebdav(
      mkReq({
        cookie: `fd_session=${tampered}`,
        auth: basicHeader('admin', 'secret123'),
      }),
      env,
      origin,
    )
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.response.status).toBe(401)
    expect(res.response.headers.get('WWW-Authenticate')).toBeNull()
  })

  it('rejects cookie signed for different origin', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: 'https://other.example' })
    const res = await authorizeWebdav(
      mkReq({ cookie: `fd_session=${token}` }),
      env,
      origin,
    )
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.response.status).toBe(401)
    expect(res.response.headers.get('WWW-Authenticate')).toBeNull()
  })

  it('rejects malformed cookie value', async () => {
    const res = await authorizeWebdav(
      mkReq({ cookie: 'fd_session=not.a.jwt' }),
      env,
      origin,
    )
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.response.status).toBe(401)
    expect(res.response.headers.get('WWW-Authenticate')).toBeNull()
  })
})

describe('authorizeWebdav — step 3: no cookie, valid Basic', () => {
  it('allows when Basic creds correct', async () => {
    const res = await authorizeWebdav(
      mkReq({ method: 'PUT', auth: basicHeader('admin', 'secret123') }),
      env,
      origin,
    )
    expect(res.ok).toBe(true)
  })

  it('allows Basic on read method', async () => {
    const res = await authorizeWebdav(
      mkReq({ method: 'GET', auth: basicHeader('admin', 'secret123') }),
      env,
      origin,
    )
    expect(res.ok).toBe(true)
  })
})

describe('authorizeWebdav — step 4: WEBDAV_PUBLIC_READ', () => {
  const publicEnv = { ...env, WEBDAV_PUBLIC_READ: '1' }

  it('allows anonymous GET when public read enabled', async () => {
    const res = await authorizeWebdav(mkReq({ method: 'GET' }), publicEnv, origin)
    expect(res.ok).toBe(true)
  })

  it('allows anonymous HEAD when public read enabled', async () => {
    const res = await authorizeWebdav(mkReq({ method: 'HEAD' }), publicEnv, origin)
    expect(res.ok).toBe(true)
  })

  it('allows anonymous PROPFIND when public read enabled', async () => {
    const res = await authorizeWebdav(mkReq({ method: 'PROPFIND' }), publicEnv, origin)
    expect(res.ok).toBe(true)
  })

  it('rejects anonymous PUT even when public read enabled', async () => {
    const res = await authorizeWebdav(mkReq({ method: 'PUT' }), publicEnv, origin)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.response.status).toBe(401)
    expect(res.response.headers.get('WWW-Authenticate')).toMatch(/^Basic /)
  })

  it('rejects anonymous DELETE even when public read enabled', async () => {
    const res = await authorizeWebdav(mkReq({ method: 'DELETE' }), publicEnv, origin)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.response.status).toBe(401)
  })

  it('rejects anonymous MOVE/COPY/MKCOL/POST even when public read enabled', async () => {
    for (const m of ['MOVE', 'COPY', 'MKCOL', 'POST']) {
      const res = await authorizeWebdav(mkReq({ method: m }), publicEnv, origin)
      expect(res.ok).toBe(false)
    }
  })

  it('does NOT activate when WEBDAV_PUBLIC_READ !== "1"', async () => {
    const e = { ...env, WEBDAV_PUBLIC_READ: 'true' }
    const res = await authorizeWebdav(mkReq({ method: 'GET' }), e, origin)
    expect(res.ok).toBe(false)
  })
})

describe('authorizeWebdav — step 5: full deny', () => {
  it('rejects no-creds GET with WWW-Authenticate Basic', async () => {
    const res = await authorizeWebdav(mkReq({ method: 'GET' }), env, origin)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.response.status).toBe(401)
    expect(res.response.headers.get('WWW-Authenticate')).toMatch(/^Basic /)
  })

  it('rejects no-creds HEAD/PROPFIND with WWW-Authenticate Basic', async () => {
    for (const m of ['HEAD', 'PROPFIND']) {
      const res = await authorizeWebdav(mkReq({ method: m }), env, origin)
      expect(res.ok).toBe(false)
      if (res.ok) continue
      expect(res.response.status).toBe(401)
      expect(res.response.headers.get('WWW-Authenticate')).toMatch(/^Basic /)
    }
  })

  it('rejects no-creds write method with WWW-Authenticate challenge', async () => {
    for (const m of ['PUT', 'POST', 'DELETE', 'MOVE', 'COPY', 'MKCOL']) {
      const res = await authorizeWebdav(mkReq({ method: m }), env, origin)
      expect(res.ok).toBe(false)
      if (res.ok) continue
      expect(res.response.status).toBe(401)
      expect(res.response.headers.get('WWW-Authenticate')).toMatch(/^Basic /)
    }
  })

  it('rejects wrong Basic creds on read method WITHOUT WWW-Authenticate (cookie absent but auth present)', async () => {
    // No cookie + wrong basic → step 3 fails → step 4 not active → step 5: no cookie, so WWW-Authenticate header allowed
    const res = await authorizeWebdav(
      mkReq({ method: 'GET', auth: basicHeader('admin', 'nope') }),
      env,
      origin,
    )
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.response.status).toBe(401)
    expect(res.response.headers.get('WWW-Authenticate')).toMatch(/^Basic /)
  })
})
