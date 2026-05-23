import { useEffect, useState } from 'react'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export function useAuth(): { status: AuthStatus } {
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false
    fetch('/api/me', { credentials: 'include' })
      .then((res) => {
        if (cancelled) return
        setStatus(res.ok ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('unauthenticated')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { status }
}
