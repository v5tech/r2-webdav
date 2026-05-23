import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { FileRow } from '../../src/components/files/FileRow'
import type { FileItem } from '../../src/lib/types'

function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.pointerUp(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.click(trigger)
}

function makeFile(overrides: Partial<FileItem> = {}): FileItem {
  return {
    key: 'docs/note.txt',
    size: 2048,
    uploaded: 'Fri, 22 May 2026 10:00:00 GMT',
    httpMetadata: { contentType: 'text/plain' },
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

describe('FileRow', () => {
  it('renders filename extracted from key', () => {
    render(
      <FileRow
        file={makeFile({ key: 'a/b/c.txt' })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByText('c.txt')).toBeInTheDocument()
  })

  it('clicking directory row calls onCwdChange', () => {
    const onCwdChange = vi.fn()
    render(
      <FileRow
        file={makeDir('photos')}
        onCwdChange={onCwdChange}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /open photos/i }))
    expect(onCwdChange).toHaveBeenCalledWith('photos/')
  })

  it('clicking file row opens /webdav/<encoded>', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    render(
      <FileRow
        file={makeFile({ key: 'a b/c d.txt' })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /open c d\.txt/i }))
    expect(openSpy).toHaveBeenCalledWith(
      '/webdav/a%20b/c%20d.txt',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()
  })

  it('clicking file row calls onPreview when provided (no window.open)', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    const onPreview = vi.fn()
    const file = makeFile({ key: 'docs/a.txt' })
    render(
      <FileRow
        file={file}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
        onPreview={onPreview}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /open a\.txt/i }))
    expect(onPreview).toHaveBeenCalledWith(file)
    expect(openSpy).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('renders MimeIcon (no large thumbnail)', () => {
    const { container } = render(
      <FileRow
        file={makeFile({ httpMetadata: { contentType: 'text/plain' } })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(container.querySelector('.lucide-file-text')).not.toBeNull()
  })

  it('opens menu and shows Rename/Delete/Download for files', () => {
    render(
      <FileRow
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
      <FileRow
        file={makeDir('photos')}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    openMenu(screen.getByRole('button', { name: /more actions/i }))
    expect(screen.queryByRole('menuitem', { name: 'Download' })).not.toBeInTheDocument()
  })

  it('Rename + Delete invoke callbacks with file', () => {
    const onRename = vi.fn()
    const onDelete = vi.fn()
    const file = makeFile()
    render(
      <FileRow
        file={file}
        onCwdChange={() => {}}
        onRename={onRename}
        onDelete={onDelete}
      />,
    )
    openMenu(screen.getByRole('button', { name: /more actions/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    expect(onRename).toHaveBeenCalledWith(file)
    openMenu(screen.getByRole('button', { name: /more actions/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(file)
  })

  it('Download link uses encoded href with download attr', () => {
    render(
      <FileRow
        file={makeFile({ key: 'a b/c.txt' })}
        onCwdChange={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    )
    openMenu(screen.getByRole('button', { name: /more actions/i }))
    const dl = screen.getByRole('menuitem', { name: 'Download' }) as HTMLAnchorElement
    expect(dl.tagName).toBe('A')
    expect(dl.getAttribute('href')).toBe('/webdav/a%20b/c.txt')
    expect(dl.hasAttribute('download')).toBe(true)
  })
})
