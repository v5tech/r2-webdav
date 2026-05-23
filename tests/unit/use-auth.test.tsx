import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import { RequireAuth } from '../../src/components/auth/RequireAuth'
import { useAuth } from '../../src/hooks/use-auth'

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}</div>
}

describe('useAuth', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts in loading state', () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useAuth())
    expect(result.current.status).toBe('loading')
  })

  it('calls /api/me with credentials:"include" exactly once', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    renderHook(() => useAuth())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/me')
    expect(init.credentials).toBe('include')
  })

  it('transitions to authenticated on 200', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('authenticated'))
  })

  it('transitions to unauthenticated on 401', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    )
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))
  })

  it('transitions to unauthenticated on network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network down'))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))
  })
})

describe('RequireAuth', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function renderGuarded(initial = '/protected') {
    return render(
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <div data-testid="protected">secret</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('renders nothing while loading', () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    renderGuarded()
    expect(screen.queryByTestId('protected')).toBeNull()
    expect(screen.queryByTestId('location')).toBeNull()
  })

  it('renders children when authenticated', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    renderGuarded()
    await waitFor(() => expect(screen.getByTestId('protected')).toBeInTheDocument())
    expect(screen.queryByTestId('location')).toBeNull()
  })

  it('redirects to /login on 401', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    )
    renderGuarded()
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/login'),
    )
    expect(screen.queryByTestId('protected')).toBeNull()
  })
})

