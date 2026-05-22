import { describe, expect, it } from 'vitest'

import {
  deriveSessionSecret,
  extractSession,
  signSessionJwt,
  verifySessionJwt,
} from '../../functions/_shared/auth'

const env = { WEBDAV_PASSWORD: 'secret123' }
const origin = 'https://drive.example.com'

const mkReq = (cookie: string | null) =>
  new Request('https://x/', { headers: cookie ? { Cookie: cookie } : {} })

describe('deriveSessionSecret', () => {
  it('derives same secret for same password', async () => {
    const k1 = await deriveSessionSecret('pw')
    const k2 = await deriveSessionSecret('pw')
    // CryptoKey instances differ but signing yields identical bytes
    const data = new TextEncoder().encode('msg')
    const s1 = new Uint8Array(await crypto.subtle.sign('HMAC', k1, data))
    const s2 = new Uint8Array(await crypto.subtle.sign('HMAC', k2, data))
    expect(Array.from(s1)).toEqual(Array.from(s2))
  })

  it('derives different secret for different password', async () => {
    const k1 = await deriveSessionSecret('a')
    const k2 = await deriveSessionSecret('b')
    const data = new TextEncoder().encode('msg')
    const s1 = new Uint8Array(await crypto.subtle.sign('HMAC', k1, data))
    const s2 = new Uint8Array(await crypto.subtle.sign('HMAC', k2, data))
    expect(Array.from(s1)).not.toEqual(Array.from(s2))
  })
})

describe('signSessionJwt + verifySessionJwt', () => {
  it('round-trips valid token', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
    const payload = await verifySessionJwt(env, token, origin)
    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe('owner')
    expect(payload?.iss).toBe(origin)
    expect(payload?.exp).toBeGreaterThan(payload!.iat)
  })

  it('rejects expired token', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin }, -10)
    expect(await verifySessionJwt(env, token, origin)).toBeNull()
  })

  it('rejects token signed with different password', async () => {
    const token = await signSessionJwt({ WEBDAV_PASSWORD: 'other' }, { sub: 'owner', iss: origin })
    expect(await verifySessionJwt(env, token, origin)).toBeNull()
  })

  it('rejects token with tampered payload', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
    const parts = token.split('.')
    const tampered = `${parts[0]}.${btoa(
      '{"sub":"admin","iss":"' + origin + '","iat":1,"exp":9999999999}',
    )
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')}.${parts[2]}`
    expect(await verifySessionJwt(env, tampered, origin)).toBeNull()
  })

  it('rejects token with tampered signature', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
    const parts = token.split('.')
    const corrupted = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -2)}aa`
    expect(await verifySessionJwt(env, corrupted, origin)).toBeNull()
  })

  it('rejects token when origin (iss) mismatches', async () => {
    const token = await signSessionJwt(env, { sub: 'owner', iss: origin })
    expect(await verifySessionJwt(env, token, 'https://attacker.com')).toBeNull()
  })

  it('rejects malformed token (not 3 segments)', async () => {
    expect(await verifySessionJwt(env, 'abc.def', origin)).toBeNull()
    expect(await verifySessionJwt(env, 'abc', origin)).toBeNull()
    expect(await verifySessionJwt(env, '', origin)).toBeNull()
  })
})

describe('extractSession', () => {
  it('extracts fd_session from cookie header', () => {
    expect(extractSession(mkReq('fd_session=abc123'))).toBe('abc123')
  })

  it('extracts fd_session when other cookies precede', () => {
    expect(extractSession(mkReq('lang=zh; fd_session=xyz; theme=dark'))).toBe('xyz')
  })

  it('returns null when no cookie header', () => {
    expect(extractSession(mkReq(null))).toBeNull()
  })

  it('returns null when fd_session absent', () => {
    expect(extractSession(mkReq('lang=zh; theme=dark'))).toBeNull()
  })
})
