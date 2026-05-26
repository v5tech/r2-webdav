export interface BasicAuthEnv {
  WEBDAV_USERNAME: string
  WEBDAV_PASSWORD: string
}

export interface SessionEnv {
  WEBDAV_PASSWORD: string
}

export interface SessionPayload {
  sub: 'owner'
  iss: string
  iat: number
  exp: number
}

export function constantTimeEqual(a: string, b: string): boolean {
  const aLen = a.length
  const bLen = b.length
  let diff = aLen ^ bLen
  const len = Math.max(aLen, bLen)
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export function verifyBasic(authHeader: string | null | undefined, env: BasicAuthEnv): boolean {
  if (!authHeader || !authHeader.startsWith('Basic ')) return false
  const encoded = authHeader.slice(6).trim()
  let decoded: string
  try {
    decoded = atob(encoded)
  } catch {
    return false
  }
  const colonIdx = decoded.indexOf(':')
  if (colonIdx === -1) return false
  const user = decoded.slice(0, colonIdx)
  const pass = decoded.slice(colonIdx + 1)
  const userMatch = constantTimeEqual(user, env.WEBDAV_USERNAME)
  const passMatch = constantTimeEqual(pass, env.WEBDAV_PASSWORD)
  return userMatch && passMatch
}

const SESSION_DERIVATION_MSG = 'r2_session_v1'
const SESSION_COOKIE_NAME = 'r2_session'
const DEFAULT_SESSION_TTL_SEC = 60 * 60 * 24 * 7 // 7 days

function base64urlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(padded)
  const arr = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

export async function deriveSessionSecret(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const passKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const derived = await crypto.subtle.sign('HMAC', passKey, enc.encode(SESSION_DERIVATION_MSG))
  return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

export async function signSessionJwt(
  env: SessionEnv,
  payload: { sub: 'owner'; iss: string },
  ttlSec: number = DEFAULT_SESSION_TTL_SEC,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const full: SessionPayload = { ...payload, iat: now, exp: now + ttlSec }
  const headerB64 = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadB64 = base64urlEncode(JSON.stringify(full))
  const signingInput = `${headerB64}.${payloadB64}`
  const key = await deriveSessionSecret(env.WEBDAV_PASSWORD)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  return `${signingInput}.${base64urlEncode(new Uint8Array(sig))}`
}

export async function verifySessionJwt(
  env: SessionEnv,
  token: string,
  origin: string,
): Promise<SessionPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, sigB64] = parts
  const signingInput = `${headerB64}.${payloadB64}`
  let signature: Uint8Array<ArrayBuffer>
  try {
    signature = base64urlDecode(sigB64)
  } catch {
    return null
  }
  const key = await deriveSessionSecret(env.WEBDAV_PASSWORD)
  let valid = false
  try {
    valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(signingInput),
    )
  } catch {
    return null
  }
  if (!valid) return null
  let payload: SessionPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)))
  } catch {
    return null
  }
  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null
  if (payload.sub !== 'owner') return null
  if (payload.iss !== origin) return null
  return payload
}

export function extractSession(request: Request): string | null {
  const cookie = request.headers.get('Cookie')
  if (!cookie) return null
  const match = cookie.match(/(?:^|;\s*)r2_session=([^;]+)/)
  return match ? match[1] : null
}

export { SESSION_COOKIE_NAME, DEFAULT_SESSION_TTL_SEC }

export type AuthzResult = { ok: true } | { ok: false; response: Response }

export interface WebdavAuthEnv extends BasicAuthEnv, SessionEnv {
  WEBDAV_PUBLIC_READ?: string
}

const READ_METHODS = new Set(['GET', 'HEAD', 'PROPFIND'])

function deny(withBasicChallenge: boolean): AuthzResult {
  const headers: Record<string, string> = {}
  if (withBasicChallenge) {
    headers['WWW-Authenticate'] = 'Basic realm="WebDAV"'
  }
  return { ok: false, response: new Response('Unauthorized', { status: 401, headers }) }
}

export async function authorizeWebdav(
  request: Request,
  env: WebdavAuthEnv,
  origin: string,
): Promise<AuthzResult> {
  const method = request.method
  const cookieToken = extractSession(request)

  if (cookieToken) {
    const payload = await verifySessionJwt(env, cookieToken, origin)
    if (payload) return { ok: true }
    return deny(false)
  }

  const authHeader = request.headers.get('Authorization')
  if (verifyBasic(authHeader, env)) return { ok: true }

  if (env.WEBDAV_PUBLIC_READ === '1' && READ_METHODS.has(method)) {
    return { ok: true }
  }

  return deny(true)
}
