import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/webdav', async () => {
  const actual =
    await vi.importActual<typeof import('../../src/lib/webdav')>('../../src/lib/webdav')
  return { ...actual, moveFile: vi.fn() }
})

import { moveFile } from '@/lib/webdav'

import { RenameDialog } from '../../src/components/files/RenameDialog'
import type { FileItem } from '../../src/lib/types'

const moveFileMock = vi.mocked(moveFile)

function makeFile(key: string, contentType = 'text/plain'): FileItem {
  return {
    key,
    size: 0,
    uploaded: '',
    httpMetadata: { contentType },
  }
}

beforeEach(() => {
  moveFileMock.mockReset()
})

describe('RenameDialog', () => {
  it('renders title with input prefilled with filename', () => {
    render(
      <RenameDialog
        open
        onOpenChange={() => {}}
        file={makeFile('docs/note.txt')}
        onRenamed={() => {}}
      />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const input = screen.getByLabelText(/new name/i) as HTMLInputElement
    expect(input.value).toBe('note.txt')
  })

  it('does not render when closed', () => {
    render(
      <RenameDialog
        open={false}
        onOpenChange={() => {}}
        file={makeFile('a.txt')}
        onRenamed={() => {}}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows validation error when name is empty', async () => {
    render(
      <RenameDialog
        open
        onOpenChange={() => {}}
        file={makeFile('a.txt')}
        onRenamed={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText(/new name/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /rename/i }))
    expect(await screen.findByText(/required|empty/i)).toBeInTheDocument()
    expect(moveFileMock).not.toHaveBeenCalled()
  })

  it('shows validation error when name contains /', async () => {
    render(
      <RenameDialog
        open
        onOpenChange={() => {}}
        file={makeFile('a.txt')}
        onRenamed={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText(/new name/i), {
      target: { value: 'bad/name' },
    })
    fireEvent.click(screen.getByRole('button', { name: /rename/i }))
    expect(await screen.findByText(/\/|slash/i)).toBeInTheDocument()
    expect(moveFileMock).not.toHaveBeenCalled()
  })

  it('submits with parent+newName for files', async () => {
    moveFileMock.mockResolvedValue()
    render(
      <RenameDialog
        open
        onOpenChange={() => {}}
        file={makeFile('docs/old.txt')}
        onRenamed={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText(/new name/i), { target: { value: 'new.txt' } })
    fireEvent.click(screen.getByRole('button', { name: /rename/i }))
    await waitFor(() =>
      expect(moveFileMock).toHaveBeenCalledWith('docs/old.txt', 'docs/new.txt'),
    )
  })

  it('preserves trailing slash when renaming a directory', async () => {
    moveFileMock.mockResolvedValue()
    render(
      <RenameDialog
        open
        onOpenChange={() => {}}
        file={makeFile('a/old/', 'application/x-directory')}
        onRenamed={() => {}}
      />,
    )
    const input = screen.getByLabelText(/new name/i) as HTMLInputElement
    expect(input.value).toBe('old')
    fireEvent.change(input, { target: { value: 'newdir' } })
    fireEvent.click(screen.getByRole('button', { name: /rename/i }))
    await waitFor(() => expect(moveFileMock).toHaveBeenCalledWith('a/old/', 'a/newdir/'))
  })

  it('handles top-level files (no parent)', async () => {
    moveFileMock.mockResolvedValue()
    render(
      <RenameDialog
        open
        onOpenChange={() => {}}
        file={makeFile('top.txt')}
        onRenamed={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText(/new name/i), { target: { value: 'foo.txt' } })
    fireEvent.click(screen.getByRole('button', { name: /rename/i }))
    await waitFor(() => expect(moveFileMock).toHaveBeenCalledWith('top.txt', 'foo.txt'))
  })

  it('closes dialog and calls onRenamed on success', async () => {
    moveFileMock.mockResolvedValue()
    const onOpenChange = vi.fn()
    const onRenamed = vi.fn()
    render(
      <RenameDialog
        open
        onOpenChange={onOpenChange}
        file={makeFile('a.txt')}
        onRenamed={onRenamed}
      />,
    )
    fireEvent.change(screen.getByLabelText(/new name/i), { target: { value: 'b.txt' } })
    fireEvent.click(screen.getByRole('button', { name: /rename/i }))
    await waitFor(() => {
      expect(onRenamed).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows error and stays open on failure', async () => {
    moveFileMock.mockRejectedValue(new Error('Failed to move: 412'))
    const onOpenChange = vi.fn()
    render(
      <RenameDialog
        open
        onOpenChange={onOpenChange}
        file={makeFile('a.txt')}
        onRenamed={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText(/new name/i), { target: { value: 'b.txt' } })
    fireEvent.click(screen.getByRole('button', { name: /rename/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('cancel button closes dialog without calling moveFile', () => {
    const onOpenChange = vi.fn()
    render(
      <RenameDialog
        open
        onOpenChange={onOpenChange}
        file={makeFile('a.txt')}
        onRenamed={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(moveFileMock).not.toHaveBeenCalled()
  })
})
