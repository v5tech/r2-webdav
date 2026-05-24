import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { FileCard } from '../../src/components/files/FileCard'
import type { FileItem } from '../../src/lib/types'

function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.pointerUp(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.click(trigger)
}

function makeFile(overrides: Partial<FileItem> = {}): FileItem {
  return {
    key: 'photos/img.png',
    size: 1024,
    uploaded: 'Fri, 22 May 2026 10:00:00 GMT',
    httpMetadata: { contentType: 'image/png' },
    ...overrides,
  }
}

function makeDir(key = 'photos'): FileItem {
  return {
    key,
    size: 0,
    uploaded: 'Fri, 22 May 2026 10:00:00 GMT',
    httpMetadata: { contentType: 'application/x-directory' },
  }
}

describe('FileCard', () => {
  it('renders filename extracted from key', () => {
    render(
      <FileCard
        file={makeFile({ key: 'a/b/c.txt' })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByText('c.txt')).toBeInTheDocument()
  })

  it('clicking directory card calls onCwdChange with key+/', () => {
    const onCwdChange = vi.fn()
    render(
      <FileCard
        file={makeDir('photos')}
        onCwdChange={onCwdChange}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /photos/i }))
    expect(onCwdChange).toHaveBeenCalledWith('photos/')
  })

  it('clicking file card opens /webdav/<encoded> in new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    render(
      <FileCard
        file={makeFile({ key: 'a b/c d.png', httpMetadata: { contentType: 'image/png' } })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /c d\.png/i }))
    expect(openSpy).toHaveBeenCalledWith(
      '/webdav/a%20b/c%20d.png',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()
  })

  it('clicking file card calls onPreview when provided (no window.open)', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    const onPreview = vi.fn()
    const file = makeFile({ key: 'docs/a.png' })
    render(
      <FileCard
        file={file}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
        onPreview={onPreview}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /a\.png/i }))
    expect(onPreview).toHaveBeenCalledWith(file)
    expect(openSpy).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('renders thumbnail img with loading=lazy when thumbnail set', () => {
    render(
      <FileCard
        file={makeFile({
          key: 'pic.png',
          customMetadata: { thumbnail: 'abc' },
        })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    const img = screen.getByAltText('pic.png') as HTMLImageElement
    expect(img.getAttribute('src')).toContain('/webdav/_$r2webdav$/thumbnails/abc.png')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('renders MimeIcon fallback when no thumbnail', () => {
    const { container } = render(
      <FileCard
        file={makeFile({ httpMetadata: { contentType: 'image/png' } })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(container.querySelector('.lucide-image')).not.toBeNull()
  })

  it('opens menu and shows Rename/Delete/Download for files', () => {
    render(
      <FileCard
        file={makeFile({ key: 'doc.txt' })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    openMenu(screen.getByRole('button', { name: /more actions/i }))
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Download' })).toBeInTheDocument()
  })

  it('omits Download for directories', () => {
    render(
      <FileCard
        file={makeDir('photos')}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    openMenu(screen.getByRole('button', { name: /more actions/i }))
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Download' })).not.toBeInTheDocument()
  })

  it('Rename menu item calls onRename(file)', () => {
    const onRename = vi.fn()
    const file = makeFile()
    render(
      <FileCard
        file={file}
        onCwdChange={() => {}}
        onRename={onRename}
        onDelete={() => {}}
      />,
    )
    openMenu(screen.getByRole('button', { name: /more actions/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    expect(onRename).toHaveBeenCalledWith(file)
  })

  it('Delete menu item calls onDelete(file)', () => {
    const onDelete = vi.fn()
    const file = makeFile()
    render(
      <FileCard
        file={file}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={onDelete}
      />,
    )
    openMenu(screen.getByRole('button', { name: /more actions/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(file)
  })

  it('Download menu item links to /webdav/<encoded> with download attr', () => {
    render(
      <FileCard
        file={makeFile({ key: 'a b/c.png' })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    openMenu(screen.getByRole('button', { name: /more actions/i }))
    const dl = screen.getByRole('menuitem', { name: 'Download' }) as HTMLAnchorElement
    expect(dl.tagName).toBe('A')
    expect(dl.getAttribute('href')).toBe('/webdav/a%20b/c.png')
    expect(dl.hasAttribute('download')).toBe(true)
  })
})
