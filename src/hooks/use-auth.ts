import { createContext, useContext, useEffect, useState } from 'react'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthState {
  status: AuthStatus
  username?: string
}

const AuthContext = createContext<AuthState | null>(null)

export const AuthProvider = AuthContext.Provider

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used within AuthProvider')
  return auth
}

export function useAuthRequest(): AuthState {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [username, setUsername] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me', { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setStatus('unauthenticated')
          return
        }
        const data = (await res.json()) as { username?: unknown }
        if (cancelled) return
        setUsername(typeof data.username === 'string' ? data.username : undefined)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUsername(undefined)
        setStatus('unauthenticated')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { status, username }
}
