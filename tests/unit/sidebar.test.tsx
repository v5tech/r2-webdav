import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import i18n from '@/lib/i18n'

import { Sidebar } from '../../src/components/layout/Sidebar'
import { AuthProvider, type AuthState } from '../../src/hooks/use-auth'

beforeEach(() => {
  void i18n.changeLanguage('en')
})

function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.pointerUp(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.click(trigger)
}

function renderSidebar(
  collapsed = false,
  onToggle = vi.fn(),
  auth: AuthState = { status: 'authenticated', username: 'admin' },
) {
  return render(
    <MemoryRouter>
      <AuthProvider value={auth}>
        <Sidebar collapsed={collapsed} onToggle={onToggle} />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Sidebar navigation', () => {
  it('renders Files, Trash, and Settings links', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /all files|全部文件/i }).getAttribute('href')).toBe(
      '/files',
    )
    expect(screen.getByRole('link', { name: /trash|回收站/i }).getAttribute('href')).toBe('/trash')
    expect(screen.getByRole('link', { name: /settings|设置/i }).getAttribute('href')).toBe(
      '/settings',
    )
  })

  it('calls onToggle from the collapse control', () => {
    const onToggle = vi.fn()
    renderSidebar(false, onToggle)
    fireEvent.click(screen.getByRole('button', { name: /collapse navigation|折叠导航/i }))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('keeps the logo as the expand action and exposes icon tooltips when collapsed', () => {
    renderSidebar(true)
    expect(screen.getByRole('button', { name: /expand navigation|展开导航/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all files|全部文件/i })).toHaveAttribute(
      'data-tooltip',
    )
  })
})

describe('Sidebar account', () => {
  it('shows the authenticated username and account actions', async () => {
    renderSidebar()
    expect(await screen.findByText('admin')).toBeInTheDocument()
    openMenu(screen.getByRole('button', { name: /account|账户/i }))
    expect(await screen.findByRole('menuitem', { name: /settings|设置/i })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /log out|sign out|logout|退出登录/i }),
    ).toBeInTheDocument()
  })

  it('localizes the account fallback when the username is unavailable', async () => {
    renderSidebar(false, vi.fn(), { status: 'authenticated' })
    expect(screen.getByText('Owner', { exact: true })).toBeInTheDocument()
    await act(async () => {
      await i18n.changeLanguage('zh')
    })
    expect(screen.getByText('所有者', { exact: true })).toBeInTheDocument()
  })
})
