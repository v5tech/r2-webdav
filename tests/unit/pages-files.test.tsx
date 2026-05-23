import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/webdav', async () => {
  const actual =
    await vi.importActual<typeof import('../../src/lib/webdav')>('../../src/lib/webdav')
  return {
    ...actual,
    fetchPath: vi.fn(),
    createFolder: vi.fn(),
    moveFile: vi.fn(),
    deleteFile: vi.fn(),
    uploadFile: vi.fn(),
  }
})

import { createFolder, deleteFile, fetchPath, moveFile, uploadFile } from '@/lib/webdav'

import FilesPage from '../../src/pages/files'
import type { FileItem } from '../../src/lib/types'

const fetchPathMock = vi.mocked(fetchPath)
const createFolderMock = vi.mocked(createFolder)
const moveFileMock = vi.mocked(moveFile)
const deleteFileMock = vi.mocked(deleteFile)
const uploadFileMock = vi.mocked(uploadFile)

function file(over: Partial<FileItem> & { key: string }): FileItem {
  return {
    size: 0,
    uploaded: 'Fri, 22 May 2026 10:00:00 GMT',
    httpMetadata: { contentType: 'text/plain' },
    ...over,
  }
}

function dir(key: string): FileItem {
  return {
    key,
    size: 0,
    uploaded: 'Fri, 22 May 2026 10:00:00 GMT',
    httpMetadata: { contentType: 'application/x-directory' },
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <FilesPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  fetchPathMock.mockReset()
  createFolderMock.mockReset()
  moveFileMock.mockReset()
  deleteFileMock.mockReset()
  uploadFileMock.mockReset()
})

describe('FilesPage', () => {
  it('fetches root files on mount', async () => {
    fetchPathMock.mockResolvedValue([
      file({ key: 'a.txt' }),
      file({ key: 'b.txt' }),
    ])
    renderPage()
    await waitFor(() => expect(fetchPathMock).toHaveBeenCalledWith(''))
    expect(await screen.findByText('a.txt')).toBeInTheDocument()
    expect(screen.getByText('b.txt')).toBeInTheDocument()
  })

  it('shows loading state while fetching', async () => {
    fetchPathMock.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  it('shows error state and Retry button when fetch rejects', async () => {
    fetchPathMock.mockRejectedValue(new Error('network down'))
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('Retry button re-fetches', async () => {
    fetchPathMock.mockRejectedValueOnce(new Error('boom'))
    fetchPathMock.mockResolvedValueOnce([file({ key: 'x.txt' })])
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /retry/i }))
    expect(await screen.findByText('x.txt')).toBeInTheDocument()
  })

  it('clicking a directory updates cwd and re-fetches', async () => {
    fetchPathMock.mockResolvedValueOnce([dir('photos')])
    fetchPathMock.mockResolvedValueOnce([file({ key: 'photos/pic.png' })])
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /open photos/i }))
    await waitFor(() => expect(fetchPathMock).toHaveBeenLastCalledWith('photos/'))
    expect(await screen.findByText('pic.png')).toBeInTheDocument()
  })

  it('search filters visible files by name', async () => {
    fetchPathMock.mockResolvedValue([
      file({ key: 'apple.txt' }),
      file({ key: 'banana.txt' }),
    ])
    renderPage()
    await screen.findByText('apple.txt')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ban' } })
    await waitFor(() => {
      expect(screen.queryByText('apple.txt')).not.toBeInTheDocument()
      expect(screen.getByText('banana.txt')).toBeInTheDocument()
    })
  })

  it('directories sort before files by default', async () => {
    fetchPathMock.mockResolvedValue([
      file({ key: 'a.txt' }),
      dir('zoo'),
    ])
    renderPage()
    const items = await screen.findAllByRole('button', { name: /open/i })
    expect(items[0].getAttribute('aria-label')).toMatch(/open zoo/i)
  })

  it('opens new-folder dialog', async () => {
    fetchPathMock.mockResolvedValue([])
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /new folder/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/folder name/i)).toBeInTheDocument()
  })

  it('successful new folder closes dialog and refetches', async () => {
    fetchPathMock.mockResolvedValue([])
    createFolderMock.mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: /new folder/i })
    fireEvent.click(screen.getByRole('button', { name: /new folder/i }))
    fireEvent.change(await screen.findByLabelText(/folder name/i), {
      target: { value: 'fresh' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => expect(createFolderMock).toHaveBeenCalledWith('fresh'))
    await waitFor(() => expect(fetchPathMock).toHaveBeenCalledTimes(2))
  })

  it('view toggle switches to list', async () => {
    fetchPathMock.mockResolvedValue([file({ key: 'only.txt' })])
    renderPage()
    await screen.findByText('only.txt')
    fireEvent.click(screen.getByRole('radio', { name: /list view/i }))
    expect(await screen.findByText('only.txt')).toBeInTheDocument()
  })

  it('header upload enqueues files and shows drawer', async () => {
    fetchPathMock.mockResolvedValue([])
    uploadFileMock.mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: /new folder/i })
    const input = screen.getByTestId('upload-input') as HTMLInputElement
    const blob = new File(['x'], 'pic.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [blob] } })
    })
    await screen.findByText(/uploads/i)
    expect(screen.getByText('pic.png')).toBeInTheDocument()
  })
})
