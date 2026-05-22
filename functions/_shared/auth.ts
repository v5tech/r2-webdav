export interface BasicAuthEnv {
  WEBDAV_USERNAME: string
  WEBDAV_PASSWORD: string
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
