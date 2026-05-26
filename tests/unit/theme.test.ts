import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  initTheme,
  resolveTheme,
  setStoredTheme,
} from '../../src/lib/theme'

const STORAGE_KEY = 'r2_theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('light', 'dark')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getStoredTheme', () => {
  it('defaults to "system" when nothing stored', () => {
    expect(getStoredTheme()).toBe('system')
  })

  it('returns stored "light"', () => {
    localStorage.setItem(STORAGE_KEY, 'light')
    expect(getStoredTheme()).toBe('light')
  })

  it('returns stored "dark"', () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    expect(getStoredTheme()).toBe('dark')
  })

  it('falls back to "system" for invalid stored values', () => {
    localStorage.setItem(STORAGE_KEY, 'pink')
    expect(getStoredTheme()).toBe('system')
  })
})

describe('setStoredTheme', () => {
  it('writes "light" to storage', () => {
    setStoredTheme('light')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('writes "dark" to storage', () => {
    setStoredTheme('dark')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('removes key when set to "system"', () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    setStoredTheme('system')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('getSystemTheme', () => {
  it('returns "dark" when prefers-color-scheme matches', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q === '(prefers-color-scheme: dark)',
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    expect(getSystemTheme()).toBe('dark')
  })

  it('returns "light" when prefers-color-scheme does not match', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      media: '',
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    expect(getSystemTheme()).toBe('light')
  })
})

describe('resolveTheme', () => {
  it('passes through "light"', () => {
    expect(resolveTheme('light')).toBe('light')
  })

  it('passes through "dark"', () => {
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('resolves "system" via matchMedia', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    expect(resolveTheme('system')).toBe('dark')
  })
})

describe('applyTheme', () => {
  it('adds "dark" class to documentElement', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('adds "light" class to documentElement', () => {
    applyTheme('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('replaces previous theme class', () => {
    applyTheme('dark')
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})

describe('initTheme', () => {
  it('applies stored "dark" theme', () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    initTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('applies system theme when none stored', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    initTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
