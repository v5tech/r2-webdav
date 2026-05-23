import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PreviewDialog } from '../../src/components/preview/PreviewDialog'
import type { FileItem } from '../../src/lib/types'

function makeFile(contentType: string, key = 'sample'): FileItem {
  return {
    key,
    size: 1024,
    uploaded: 'Fri, 22 May 2026 10:00:00 GMT',
    httpMetadata: { contentType },
  }
}

function renderPreview(file: FileItem | null) {
  return render(<PreviewDialog file={file} open={file !== null} onOpenChange={() => {}} />)
}

describe('PreviewDialog type dispatch', () => {
  it('renders ImagePreview with /webdav/<encoded> src for image/* contentType', () => {
    renderPreview(makeFile('image/png', 'photos/pic name.png'))
    const img = screen.getByAltText('pic name.png') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/webdav/photos/pic%20name.png')
  })

  it('renders VideoPreview stub for video/* contentType', () => {
    renderPreview(makeFile('video/mp4', 'clip.mp4'))
    expect(screen.getByTestId('video-preview-stub')).toBeInTheDocument()
  })

  it('renders AudioPreview stub for audio/* contentType', () => {
    renderPreview(makeFile('audio/mpeg', 'song.mp3'))
    expect(screen.getByTestId('audio-preview-stub')).toBeInTheDocument()
  })

  it('renders PdfPreview stub for application/pdf contentType', () => {
    renderPreview(makeFile('application/pdf', 'doc.pdf'))
    expect(screen.getByTestId('pdf-preview-stub')).toBeInTheDocument()
  })

  it('renders TextPreview stub for text/* contentType', () => {
    renderPreview(makeFile('text/plain', 'readme.txt'))
    expect(screen.getByTestId('text-preview-stub')).toBeInTheDocument()
  })

  it('renders UnsupportedPreview for unknown contentType', () => {
    renderPreview(makeFile('application/octet-stream', 'blob.bin'))
    expect(screen.getByTestId('unsupported-preview')).toBeInTheDocument()
  })
})
