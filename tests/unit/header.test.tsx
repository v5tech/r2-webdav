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
  it('uses a direct icon action and toggles to dark', () => {
    renderHeader()
    const trigger = screen.getByRole('button', { name: /switch to dark|切换到深色/i })
    fireEvent.click(trigger)
    expect(setStoredThemeMock).toHaveBeenCalledWith('dark')
    expect(applyThemeMock).toHaveBeenCalledWith('dark')
    expect(screen.getByRole('button', { name: /switch to light|切换到浅色/i })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

describe('Header language switcher', () => {
  it('renders both language options in the dropdown', async () => {
    renderHeader()
    openMenu(screen.getByRole('button', { name: /change language|切换语言/i }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitemradio', { name: /中文|Chinese/i })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitemradio', { name: 'English' })).toBeInTheDocument()
  })

  it('selecting 中文 changes i18n.language to zh', async () => {
    renderHeader()
    openMenu(screen.getByRole('button', { name: /change language|切换语言/i }))
    const menu = await screen.findByRole('menu')
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: /中文|Chinese/i }))
    await waitFor(() => expect(i18n.language).toBe('zh'))
  })
})
