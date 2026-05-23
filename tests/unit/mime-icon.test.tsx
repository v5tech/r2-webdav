import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { MimeIcon } from '../../src/components/files/MimeIcon'

describe('MimeIcon', () => {
  it('renders folder icon for directory', () => {
    const { container } = render(<MimeIcon contentType="application/x-directory" />)
    expect(container.querySelector('.lucide-folder')).not.toBeNull()
  })

  it('renders image icon for image/*', () => {
    const { container } = render(<MimeIcon contentType="image/png" />)
    expect(container.querySelector('.lucide-image')).not.toBeNull()
  })

  it('renders video icon for video/*', () => {
    const { container } = render(<MimeIcon contentType="video/mp4" />)
    expect(container.querySelector('.lucide-video')).not.toBeNull()
  })

  it('renders music icon for audio/*', () => {
    const { container } = render(<MimeIcon contentType="audio/mpeg" />)
    expect(container.querySelector('.lucide-music')).not.toBeNull()
  })

  it('renders file-text icon for text/*', () => {
    const { container } = render(<MimeIcon contentType="text/plain" />)
    expect(container.querySelector('.lucide-file-text')).not.toBeNull()
  })

  it('renders file-text icon for application/pdf', () => {
    const { container } = render(<MimeIcon contentType="application/pdf" />)
    expect(container.querySelector('.lucide-file-text')).not.toBeNull()
  })

  it('renders generic file icon for unknown types', () => {
    const { container } = render(<MimeIcon contentType="application/octet-stream" />)
    expect(container.querySelector('.lucide-file')).not.toBeNull()
  })
})
