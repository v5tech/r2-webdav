import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import { AppShell } from '../../src/components/layout/AppShell'
import { AuthProvider } from '../../src/hooks/use-auth'
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
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ok: true, username: 'admin' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
  useViewportMock.mockReturnValue({ isMobile: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.pointerUp(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.click(trigger)
}

function renderShell(initial = '/files') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider value={{ status: 'authenticated', username: 'admin' }}>
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
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AppShell desktop', () => {
  it('renders brand, primary nav, and main children', async () => {
    renderShell()
    expect(screen.getByRole('img', { name: 'R2 WebDAV' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'primary' })).toBeInTheDocument()
    expect(screen.getByTestId('main')).toBeInTheDocument()
    expect(await screen.findByText('admin')).toBeInTheDocument()
  })

  it('places the full-height sidebar beside a workspace containing the header and main', () => {
    renderShell()
    const shell = document.querySelector('[data-collapsed]')
    const sidebar = shell?.querySelector(':scope > aside')
    const workspace = shell?.querySelector(':scope > div')
    const header = screen.getByRole('banner')
    const main = screen.getByRole('main')

    expect(sidebar).toBeInTheDocument()
    expect(workspace).toContainElement(header)
    expect(workspace).toContainElement(main)
    expect(workspace).not.toContainElement(sidebar)
  })

  it('does not show mobile menu button on desktop', () => {
    renderShell()
    expect(screen.queryByRole('button', { name: /open menu|打开菜单/i })).toBeNull()
  })

  it('collapses the sidebar and persists the preference', () => {
    renderShell()
    const shell = document.querySelector('[data-collapsed]')
    fireEvent.click(screen.getByRole('button', { name: /collapse navigation|折叠导航/i }))
    expect(shell).toHaveAttribute('data-collapsed', 'true')
    expect(shell).not.toHaveClass(
      'md:grid-cols-[216px_minmax(0,1fr)]',
      'lg:grid-cols-[240px_minmax(0,1fr)]',
    )
    expect(localStorage.getItem('r2_sidebar_collapsed')).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: /expand navigation|展开导航/i }))
    expect(shell).toHaveAttribute('data-collapsed', 'false')
  })
})

describe('AppShell mobile', () => {
  beforeEach(() => {
    useViewportMock.mockReturnValue({ isMobile: true })
  })

  it('shows menu button on mobile', () => {
    renderShell()
    expect(screen.getByRole('button', { name: /open menu|打开菜单/i })).toBeInTheDocument()
  })

  it('keeps the sidebar closed until the menu is opened', () => {
    renderShell()
    expect(screen.queryByRole('navigation', { name: 'primary' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /open menu|打开菜单/i }))
    expect(screen.getByRole('navigation', { name: 'primary' })).toBeInTheDocument()
  })

  it('uses only Files, Trash, and Settings in the mobile bottom nav', () => {
    renderShell()
    const nav = screen.getByRole('navigation', { name: /mobile navigation|移动导航/i })
    expect(nav).toHaveTextContent(/files|文件/i)
    expect(nav).toHaveTextContent(/trash|回收站/i)
    expect(nav).toHaveTextContent(/settings|设置/i)
    expect(nav).not.toHaveTextContent(/upload|上传/i)
  })
})

describe('Account menu', () => {
  it('opens from the sidebar and logs out through /api/logout', async () => {
    renderShell()
    openMenu(await screen.findByRole('button', { name: /account|账户/i }))
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /log out|sign out|logout|退出登录/i }),
    )
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => call[0] === '/api/logout')).toBe(true)
    })
    const logoutCall = fetchMock.mock.calls.find((call) => call[0] === '/api/logout')
    expect(logoutCall[1].method).toBe('POST')
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/login'))
  })

  it('navigates to /login even if logout fetch rejects', async () => {
    fetchMock.mockImplementation((url) => {
      if (url === '/api/logout') return Promise.reject(new TypeError('network down'))
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true, username: 'admin' }), { status: 200 }),
      )
    })
    renderShell()
    openMenu(await screen.findByRole('button', { name: /account|账户/i }))
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /log out|sign out|logout|退出登录/i }),
    )
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/login'))
  })
})
