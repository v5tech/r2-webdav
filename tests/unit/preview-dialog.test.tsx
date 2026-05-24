import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({ promise: new Promise(() => {}) }),
}))

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

  it('renders VideoPreview with /webdav/<encoded> src for video/* contentType', () => {
    renderPreview(makeFile('video/mp4', 'clips/my clip.mp4'))
    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('src')).toBe('/webdav/clips/my%20clip.mp4')
    expect(video?.hasAttribute('controls')).toBe(true)
  })

  it('renders AudioPreview with /webdav/<encoded> src for audio/* contentType', () => {
    renderPreview(makeFile('audio/mpeg', 'music/song name.mp3'))
    const audio = document.querySelector('audio')
    expect(audio).not.toBeNull()
    expect(audio?.getAttribute('src')).toBe('/webdav/music/song%20name.mp3')
    expect(audio?.hasAttribute('controls')).toBe(true)
  })

  it('renders PdfPreview for application/pdf contentType', () => {
    renderPreview(makeFile('application/pdf', 'doc.pdf'))
    expect(screen.getByTestId('pdf-preview-loading')).toBeInTheDocument()
  })

  it('renders TextPreview for text/* contentType', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(() => {})),
    )
    renderPreview(makeFile('text/plain', 'readme.txt'))
    expect(document.querySelector('[data-testid^="text-preview"]')).not.toBeNull()
    vi.unstubAllGlobals()
  })

  it('renders UnsupportedPreview for unknown contentType', () => {
    renderPreview(makeFile('application/octet-stream', 'blob.bin'))
    expect(screen.getByTestId('unsupported-preview')).toBeInTheDocument()
  })
})
