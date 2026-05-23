import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import { AppShell } from '../../src/components/layout/AppShell'
import { useViewport } from '../../src/hooks/use-viewport'

vi.mock('../../src/hooks/use-viewport', () => ({
  useViewport: vi.fn(),
}))

const useViewportMock = vi.mocked(useViewport)
const fetchMock = vi.fn()

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}</div>
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  useViewportMock.mockReturnValue({ isMobile: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderShell(initial = '/files') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          path="/files"
          element={
            <AppShell>
              <div data-testid="main">main</div>
            </AppShell>
          }
        />
        <Route path="/login" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell desktop', () => {
  it('renders header logo, sidebar nav, and main children', () => {
    renderShell()
    expect(screen.getByRole('img', { name: 'FlareDrive' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'primary' })).toBeInTheDocument()
    expect(screen.getByTestId('main')).toBeInTheDocument()
  })

  it('does not show mobile menu button on desktop', () => {
    renderShell()
    expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull()
  })
})

describe('AppShell mobile', () => {
  beforeEach(() => {
    useViewportMock.mockReturnValue({ isMobile: true })
  })

  it('shows menu button on mobile', () => {
    renderShell()
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('hides sticky sidebar nav on mobile (closed Sheet)', () => {
    renderShell()
    expect(screen.queryByRole('navigation', { name: 'primary' })).toBeNull()
  })

  it('opens Sheet sidebar on menu click, revealing primary nav', () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('navigation', { name: 'primary' })).toBeInTheDocument()
  })
})

describe('Header logout', () => {
  it('POSTs /api/logout then navigates to /login', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/logout')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/login'),
    )
  })

  it('navigates to /login even if logout fetch rejects', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network down'))
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/login'),
    )
  })
})
