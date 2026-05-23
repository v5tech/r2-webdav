import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TextPreview } from '../../src/components/preview/TextPreview'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TextPreview', () => {
  it('shows loading state while fetch is pending', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    render(<TextPreview fileKey="notes/a.txt" size={1024} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/webdav/notes/a.txt')
  })

  it('renders fetched text inside <pre>', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('hello world\nline 2'),
    })
    render(<TextPreview fileKey="notes/a.txt" size={1024} />)
    const pre = await screen.findByText(/hello world/)
    expect(pre.tagName).toBe('PRE')
    expect(pre.textContent).toBe('hello world\nline 2')
  })

  it('skips fetch and shows oversize notice when size > 1MB', () => {
    render(<TextPreview fileKey="big/log.txt" size={1024 * 1024 + 1} />)
    expect(screen.getByTestId('text-preview-oversize')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows error state when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))
    render(<TextPreview fileKey="notes/a.txt" size={1024} />)
    await waitFor(() => {
      expect(screen.getByTestId('text-preview-error')).toBeInTheDocument()
    })
  })
})
