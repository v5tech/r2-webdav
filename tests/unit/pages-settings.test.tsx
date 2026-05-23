import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

import SettingsPage from '../../src/pages/settings'

const applyThemeMock = vi.mocked(applyTheme)
const setStoredThemeMock = vi.mocked(setStoredTheme)

beforeEach(() => {
  applyThemeMock.mockReset()
  setStoredThemeMock.mockReset()
  localStorage.clear()
  void i18n.changeLanguage('en')
})

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('SettingsPage theme section', () => {
  it('renders three theme options', () => {
    renderPage()
    const group = screen.getByRole('group', { name: /theme/i })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^light$/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^dark$/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^system$/i })).toBeInTheDocument()
  })

  it('selecting Dark calls applyTheme + setStoredTheme', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('radio', { name: /^dark$/i }))
    await waitFor(() => {
      expect(setStoredThemeMock).toHaveBeenCalledWith('dark')
      expect(applyThemeMock).toHaveBeenCalledWith('dark')
    })
  })
})

describe('SettingsPage language section', () => {
  it('renders both language options', () => {
    renderPage()
    const group = screen.getByRole('group', { name: /language|语言/i })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '中文' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument()
  })

  it('selecting 中文 changes i18n.language to zh', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('radio', { name: '中文' }))
    await waitFor(() => {
      expect(i18n.language).toBe('zh')
    })
  })
})
