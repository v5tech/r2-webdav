import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/theme', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/theme')>('../../src/lib/theme')
  return {
    ...actual,
    applyTheme: vi.fn(),
    setStoredTheme: vi.fn(),
  }
})

vi.mock('@/lib/api', () => ({
  api: { logout: vi.fn().mockResolvedValue(undefined) },
}))

import i18n from '@/lib/i18n'
import { applyTheme, setStoredTheme } from '@/lib/theme'

import { Header } from '../../src/components/layout/Header'

const applyThemeMock = vi.mocked(applyTheme)
const setStoredThemeMock = vi.mocked(setStoredTheme)

beforeEach(() => {
  applyThemeMock.mockReset()
  setStoredThemeMock.mockReset()
  localStorage.clear()
  void i18n.changeLanguage('en')
})

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header showMenuButton={false} onMenuClick={() => {}} />
    </MemoryRouter>,
  )
}

function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.pointerUp(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.click(trigger)
}

describe('Header theme switcher', () => {
  it('renders all three theme options in the dropdown', async () => {
    renderHeader()
    openMenu(screen.getByRole('button', { name: /toggle theme|切换主题/i }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitemradio', { name: /^light$/i })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitemradio', { name: /^dark$/i })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitemradio', { name: /^system$/i })).toBeInTheDocument()
  })

  it('selecting Dark calls applyTheme + setStoredTheme', async () => {
    renderHeader()
    openMenu(screen.getByRole('button', { name: /toggle theme|切换主题/i }))
    const menu = await screen.findByRole('menu')
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: /^dark$/i }))
    await waitFor(() => {
      expect(setStoredThemeMock).toHaveBeenCalledWith('dark')
      expect(applyThemeMock).toHaveBeenCalledWith('dark')
    })
  })
})

describe('Header language switcher', () => {
  it('renders both language options in the dropdown', async () => {
    renderHeader()
    openMenu(screen.getByRole('button', { name: /change language|切换语言/i }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitemradio', { name: '中文' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitemradio', { name: 'English' })).toBeInTheDocument()
  })

  it('selecting 中文 changes i18n.language to zh', async () => {
    renderHeader()
    openMenu(screen.getByRole('button', { name: /change language|切换语言/i }))
    const menu = await screen.findByRole('menu')
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: '中文' }))
    await waitFor(() => {
      expect(i18n.language).toBe('zh')
    })
  })
})
