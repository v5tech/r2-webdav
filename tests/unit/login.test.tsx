import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import LoginPage from '../../src/pages/login'

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}</div>
}

function renderLogin(initial = '/login') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LocationProbe />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows validation errors on empty submit', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /登录|sign in|log in/i }))
    expect(await screen.findByText(/用户名不能为空/)).toBeInTheDocument()
    expect(await screen.findByText(/密码不能为空/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs /api/login with creds and navigates to / on success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    renderLogin()
    fireEvent.change(screen.getByLabelText(/用户名|username/i), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText(/密码|password/i), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /登录|sign in|log in/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/login')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ username: 'admin', password: 'secret123' })

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'))
  })

  it('shows error message on 401', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    )
    renderLogin()
    fireEvent.change(screen.getByLabelText(/用户名|username/i), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText(/密码|password/i), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByRole('button', { name: /登录|sign in|log in/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('alert')).toHaveTextContent(/用户名或密码|invalid|unauthorized/i)
    expect(screen.queryByTestId('location')).toBeNull()
  })

  it('shows error message on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network down'))
    renderLogin()
    fireEvent.change(screen.getByLabelText(/用户名|username/i), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText(/密码|password/i), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /登录|sign in|log in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/网络|network/i)
  })
})
