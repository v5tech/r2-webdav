import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { AuthProvider, useAuthRequest } from '@/hooks/use-auth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuthRequest()
  if (auth.status === 'loading') return null
  if (auth.status === 'unauthenticated') return <Navigate to="/login" replace />
  return <AuthProvider value={auth}>{children}</AuthProvider>
}
