import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getDocumentMock = vi.fn()

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (url: string) => getDocumentMock(url),
}))

import { PdfPreview } from '../../src/components/preview/PdfPreview'

function fakePdf(numPages: number) {
  const page = {
    getViewport: () => ({ width: 100, height: 150 }),
    render: () => ({ promise: Promise.resolve() }),
  }
  return {
    numPages,
    getPage: vi.fn().mockResolvedValue(page),
  }
}

beforeEach(() => {
  getDocumentMock.mockReset()
})

describe('PdfPreview', () => {
  it('shows loading state initially', () => {
    getDocumentMock.mockReturnValue({ promise: new Promise(() => {}) })
    render(<PdfPreview fileKey="docs/sample.pdf" />)
    expect(screen.getByTestId('pdf-preview-loading')).toBeInTheDocument()
  })

  it('passes encoded webdav URL to getDocument', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakePdf(1)) })
    render(<PdfPreview fileKey="docs/my file.pdf" />)
    await waitFor(() => {
      expect(getDocumentMock).toHaveBeenCalledWith('/webdav/docs/my%20file.pdf')
    })
  })

  it('renders canvas and pager after pdf loads', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakePdf(3)) })
    render(<PdfPreview fileKey="sample.pdf" />)
    await waitFor(() => {
      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
    })
    expect(screen.getByTestId('pdf-preview-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-preview-pager')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('shows error UI when getDocument fails', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.reject(new Error('boom')) })
    render(<PdfPreview fileKey="sample.pdf" />)
    await waitFor(() => {
      expect(screen.getByTestId('pdf-preview-error')).toBeInTheDocument()
    })
  })

  it('advances to next page on next button click', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakePdf(3)) })
    render(<PdfPreview fileKey="sample.pdf" />)
    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('pdf-pager-next'))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('disables prev button on first page', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakePdf(3)) })
    render(<PdfPreview fileKey="sample.pdf" />)
    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
    expect(screen.getByTestId('pdf-pager-prev')).toBeDisabled()
  })

  it('disables next button on last page', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakePdf(2)) })
    render(<PdfPreview fileKey="sample.pdf" />)
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('pdf-pager-next'))
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-pager-next')).toBeDisabled()
  })
})
