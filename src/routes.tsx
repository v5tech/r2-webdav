import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'

import { RequireAuth } from './components/auth/RequireAuth'
import FilesLegacyPage from './pages/files-legacy'
import LoginPage from './pages/login'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/files-legacy',
    element: (
      <RequireAuth>
        <FilesLegacyPage />
      </RequireAuth>
    ),
  },
  { path: '/', element: <Navigate to="/files-legacy" replace /> },
]
