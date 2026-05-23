import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'

import { RequireAuth } from './components/auth/RequireAuth'
import FilesPage from './pages/files'
import LoginPage from './pages/login'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/files',
    element: (
      <RequireAuth>
        <FilesPage />
      </RequireAuth>
    ),
  },
  { path: '/', element: <Navigate to="/files" replace /> },
]
