import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: () =>
      '<pre data-testid="shiki-html"><code>highlighted</code></pre>',
  }),
}))

import { CodePreview } from '../../src/components/preview/CodePreview'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CodePreview', () => {
  it('shows loading state while fetch is pending', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    render(<CodePreview fileKey="src/a.ts" size={100} lang="typescript" />)
    expect(screen.getByTestId('code-preview-loading')).toBeInTheDocument()
  })

  it('renders shiki-highlighted HTML after fetch + highlight resolve', async () => {
    fetchMock.mockResolvedValue(new Response('const x = 1', { status: 200 }))
    render(<CodePreview fileKey="src/a.ts" size={100} lang="typescript" />)
    await waitFor(() => {
      expect(screen.getByTestId('code-preview-content')).toBeInTheDocument()
    })
    expect(screen.getByTestId('shiki-html')).toBeInTheDocument()
  })

  it('shows error UI when fetch fails with non-200', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }))
    render(<CodePreview fileKey="src/a.ts" size={100} lang="typescript" />)
    await waitFor(() => {
      expect(screen.getByTestId('code-preview-error')).toBeInTheDocument()
    })
  })

  it('shows oversize UI when size exceeds 1MB cap', () => {
    render(<CodePreview fileKey="big.ts" size={2 * 1024 * 1024} lang="typescript" />)
    expect(screen.getByTestId('code-preview-oversize')).toBeInTheDocument()
  })

  it('fetches encoded webdav URL', async () => {
    fetchMock.mockResolvedValue(new Response('x', { status: 200 }))
    render(<CodePreview fileKey="src/my file.ts" size={1} lang="typescript" />)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/webdav/src/my%20file.ts')
    })
  })
})
