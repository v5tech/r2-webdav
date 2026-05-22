import { describe, expect, it } from 'vitest'

import { constantTimeEqual, verifyBasic } from '../../functions/_shared/auth'

const env = { WEBDAV_USERNAME: 'admin', WEBDAV_PASSWORD: 'secret123' }

const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`

describe('constantTimeEqual', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true)
  })

  it('returns true for identical empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true)
  })

  it('returns false for equal-length differing strings', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false)
  })

  it('returns false for unequal-length strings', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
    expect(constantTimeEqual('', 'abc')).toBe(false)
  })

  it('handles unicode characters', () => {
    expect(constantTimeEqual('密码', '密码')).toBe(true)
    expect(constantTimeEqual('密码', '密令')).toBe(false)
  })
})

describe('verifyBasic', () => {
  it('returns true for correct credentials', () => {
    expect(verifyBasic(basic('admin', 'secret123'), env)).toBe(true)
  })

  it('returns false for wrong password', () => {
    expect(verifyBasic(basic('admin', 'wrong'), env)).toBe(false)
  })

  it('returns false for wrong username', () => {
    expect(verifyBasic(basic('root', 'secret123'), env)).toBe(false)
  })

  it('returns false for missing header', () => {
    expect(verifyBasic(null, env)).toBe(false)
    expect(verifyBasic(undefined, env)).toBe(false)
    expect(verifyBasic('', env)).toBe(false)
  })

  it('returns false for non-Basic scheme', () => {
    expect(verifyBasic('Bearer xyz', env)).toBe(false)
    expect(verifyBasic('Digest realm=foo', env)).toBe(false)
  })

  it('returns false for malformed Basic payload (no colon)', () => {
    expect(verifyBasic(`Basic ${btoa('justuser')}`, env)).toBe(false)
  })

  it('returns false for non-base64 payload', () => {
    expect(verifyBasic('Basic !!!not-base64!!!', env)).toBe(false)
  })

  it('handles password containing colons', () => {
    const env2 = { WEBDAV_USERNAME: 'admin', WEBDAV_PASSWORD: 'a:b:c' }
    expect(verifyBasic(basic('admin', 'a:b:c'), env2)).toBe(true)
  })
})
