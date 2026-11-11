import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

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
import { AuthProvider } from '../../src/hooks/use-auth'
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

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="location" data-search={loc.search} />
}

function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.pointerUp(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.click(trigger)
}

async function openNewFolder() {
  openMenu(await screen.findByRole('button', { name: /^new$|^新建$/i }))
  fireEvent.click(await screen.findByRole('menuitem', { name: /new folder|新建文件夹/i }))
}

function renderPage(initial = '/files') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider value={{ status: 'authenticated', username: 'admin' }}>
        <FilesPage />
        <LocationProbe />
      </AuthProvider>
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
    fetchPathMock.mockResolvedValue([file({ key: 'a.txt' }), file({ key: 'b.txt' })])
    renderPage()
    await waitFor(() => expect(fetchPathMock).toHaveBeenCalledWith(''))
    expect(await screen.findByRole('button', { name: /open a\.txt/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open b\.txt/i })).toBeInTheDocument()
  })

  it('shows the browser time zone in the file list footer', async () => {
    fetchPathMock.mockResolvedValue([])
    renderPage()
    const footer = await screen.findByText(/time zone|浏览器时区/i)
    expect(footer).toHaveTextContent(Intl.DateTimeFormat().resolvedOptions().timeZone)
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
    expect(screen.getByRole('button', { name: /retry|reload/i })).toBeInTheDocument()
  })

  it('Retry button re-fetches', async () => {
    fetchPathMock.mockRejectedValueOnce(new Error('boom'))
    fetchPathMock.mockResolvedValueOnce([file({ key: 'x.txt' })])
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /retry|reload/i }))
    expect(await screen.findByRole('button', { name: /open x\.txt/i })).toBeInTheDocument()
  })

  it('clicking a directory updates cwd and re-fetches', async () => {
    fetchPathMock.mockResolvedValueOnce([dir('photos')])
    fetchPathMock.mockResolvedValueOnce([file({ key: 'photos/pic.png' })])
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /photos/i }))
    await waitFor(() => expect(fetchPathMock).toHaveBeenLastCalledWith('photos/'))
    expect(await screen.findByRole('button', { name: /open pic\.png/i })).toBeInTheDocument()
  })

  it('search filters visible files by name', async () => {
    fetchPathMock.mockResolvedValue([file({ key: 'apple.txt' }), file({ key: 'banana.txt' })])
    renderPage()
    await screen.findByRole('button', { name: /open apple\.txt/i })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ban' } })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /open apple\.txt/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /open banana\.txt/i })).toBeInTheDocument()
    })
  })

  it('directories sort before files by default', async () => {
    fetchPathMock.mockResolvedValue([file({ key: 'a.txt' }), dir('zoo')])
    renderPage()
    const zoo = await screen.findByRole('button', { name: /open zoo/i })
    const aTxt = screen.getByRole('button', { name: /open a\.txt/i })
    expect(zoo.compareDocumentPosition(aTxt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('opens new-folder dialog', async () => {
    fetchPathMock.mockResolvedValue([])
    renderPage()
    await openNewFolder()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/folder name/i)).toBeInTheDocument()
  })

  it('successful new folder closes dialog and refetches', async () => {
    fetchPathMock.mockResolvedValue([])
    createFolderMock.mockResolvedValue()
    renderPage()
    await openNewFolder()
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
    await screen.findByRole('button', { name: /open only\.txt/i })
    fireEvent.click(screen.getByRole('radio', { name: /list view/i }))
    expect(await screen.findByRole('button', { name: /open only\.txt/i })).toBeInTheDocument()
  })

  it('header upload enqueues files and shows drawer', async () => {
    fetchPathMock.mockResolvedValue([])
    uploadFileMock.mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: /^new$|^新建$/i })
    const input = screen.getByTestId('upload-input') as HTMLInputElement
    const blob = new File(['x'], 'pic.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [blob] } })
    })
    await screen.findByText(/uploads/i)
    expect(screen.getByText('pic.png')).toBeInTheDocument()
  })

  it('hydrates cwd from URL query on mount', async () => {
    fetchPathMock.mockResolvedValue([file({ key: 'docs/2024/r.pdf' })])
    renderPage('/files?p=docs/2024/')
    await waitFor(() => expect(fetchPathMock).toHaveBeenCalledWith('docs/2024/'))
  })

  it('normalizes URL p without trailing slash', async () => {
    fetchPathMock.mockResolvedValue([])
    renderPage('/files?p=docs')
    await waitFor(() => expect(fetchPathMock).toHaveBeenCalledWith('docs/'))
  })

  it('clicking a directory writes URL ?p=<key>', async () => {
    fetchPathMock.mockResolvedValueOnce([dir('photos')])
    fetchPathMock.mockResolvedValueOnce([])
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /photos/i }))
    await waitFor(() => expect(screen.getByTestId('location').dataset.search).toBe('?p=photos%2F'))
  })

  it('clears the search from the empty results state', async () => {
    fetchPathMock.mockResolvedValue([file({ key: 'a.txt' })])
    renderPage()
    await screen.findByRole('button', { name: /open a\.txt/i })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } })
    const clearButtons = await screen.findAllByRole('button', { name: /clear search|清空搜索/i })
    expect(clearButtons).toHaveLength(2)
    fireEvent.click(clearButtons[1])
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(await screen.findByRole('button', { name: /open a\.txt/i })).toBeInTheDocument()
  })

  it('keeps the new folder dialog and actions within the mobile viewport', async () => {
    fetchPathMock.mockResolvedValue([])
    renderPage()
    await openNewFolder()
    expect(screen.getByRole('dialog')).toHaveClass('w-[min(480px,calc(100vw-32px))]')
    expect(screen.getByRole('button', { name: /^cancel$/i }).parentElement).toHaveClass(
      'flex-row',
      'flex-wrap',
    )
  })

  it('uses prototype header actions and search styling', async () => {
    fetchPathMock.mockResolvedValue([])
    renderPage()
    const upload = await screen.findByRole('button', { name: /upload files|上传文件/i })
    expect(upload).toHaveClass('h-11', 'md:h-10', 'rounded-md')
    expect(screen.getByRole('button', { name: /all files|全部文件/i })).toBeInTheDocument()
    expect(screen.getByRole('searchbox').parentElement).toHaveClass('bg-muted/50')
  })

  it('Home breadcrumb clears the query', async () => {
    fetchPathMock.mockResolvedValueOnce([dir('photos')])
    fetchPathMock.mockResolvedValueOnce([])
    fetchPathMock.mockResolvedValueOnce([])
    renderPage('/files?p=photos/')
    await waitFor(() => expect(fetchPathMock).toHaveBeenCalledWith('photos/'))
    fireEvent.click(screen.getByRole('button', { name: /^all files$|^全部文件$/i }))
    await waitFor(() => {
      expect(screen.getByTestId('location').dataset.search).toBe('')
    })
  })

  it('prompts before uploading a duplicate and does not upload by default', async () => {
    fetchPathMock.mockResolvedValue([file({ key: 'a.txt' })])
    uploadFileMock.mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: /open a\.txt/i })
    const input = screen.getByTestId('upload-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt')] } })
    })
    expect(await screen.findByText(/file name conflict|同名文件冲突/i)).toBeInTheDocument()
    expect(uploadFileMock).not.toHaveBeenCalled()
  })

  it('prompts for duplicate names within one upload batch without uploading by default', async () => {
    fetchPathMock.mockResolvedValue([])
    uploadFileMock.mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: /^new$|^新建$/i })
    const input = screen.getByTestId('upload-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(['first'], 'same.txt'), new File(['second'], 'same.txt')] },
      })
    })
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(uploadFileMock).not.toHaveBeenCalled()
  })

  it('renames duplicates within one batch to distinct filenames after confirmation', async () => {
    fetchPathMock.mockResolvedValue([])
    uploadFileMock.mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: /^new$|^新建$/i })
    const input = screen.getByTestId('upload-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(['first'], 'same.txt'), new File(['second'], 'same.txt')] },
      })
    })
    fireEvent.click(await screen.findByRole('button', { name: /rename automatically|自动重命名/i }))
    await waitFor(() => expect(uploadFileMock).toHaveBeenCalledTimes(2))
    expect(uploadFileMock.mock.calls.map((call) => call[1].name)).toEqual([
      'same.txt',
      'same (1).txt',
    ])
  })

  it('allows same-batch overwrite only after explicit confirmation', async () => {
    fetchPathMock.mockResolvedValue([])
    uploadFileMock.mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: /^new$|^新建$/i })
    const input = screen.getByTestId('upload-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(['first'], 'same.txt'), new File(['second'], 'same.txt')] },
      })
    })
    fireEvent.click(await screen.findByRole('button', { name: /overwrite|覆盖同名文件/i }))
    await waitFor(() => expect(uploadFileMock).toHaveBeenCalledTimes(2))
    expect(uploadFileMock.mock.calls.map((call) => call[1].name)).toEqual(['same.txt', 'same.txt'])
  })

  it('shows only actual conflicts in a mixed batch and cancels the whole batch', async () => {
    fetchPathMock.mockResolvedValue([file({ key: 'a.txt' })])
    uploadFileMock.mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: /open a\.txt/i })
    const input = screen.getByTestId('upload-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(['unique'], 'unique.txt'), new File(['duplicate'], 'a.txt')] },
      })
    })
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('a.txt')
    expect(dialog).not.toHaveTextContent('unique.txt')
    fireEvent.click(screen.getByRole('button', { name: /^cancel$|^取消$/i }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(uploadFileMock).not.toHaveBeenCalled()
  })

  it('automatic rename uploads a non-conflicting filename after confirmation', async () => {
    fetchPathMock.mockResolvedValue([file({ key: 'a.txt' })])
    uploadFileMock.mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: /open a\.txt/i })
    const input = screen.getByTestId('upload-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt')] } })
    })
    fireEvent.click(await screen.findByRole('button', { name: /rename automatically|自动重命名/i }))
    await waitFor(() => expect(uploadFileMock).toHaveBeenCalled())
    expect(uploadFileMock.mock.calls[0][1].name).toBe('a (1).txt')
  })

  it('rejects duplicate folder names before creating', async () => {
    fetchPathMock.mockResolvedValue([file({ key: 'a.txt' })])
    renderPage()
    await screen.findByRole('button', { name: /open a\.txt/i })
    await openNewFolder()
    fireEvent.change(await screen.findByLabelText(/folder name/i), { target: { value: 'a.txt' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$|^创建$/i }))
    expect(await screen.findByText(/already exists|已有同名/i)).toBeInTheDocument()
    expect(createFolderMock).not.toHaveBeenCalled()
  })
})
