import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/trash', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/trash')>('../../src/lib/trash')
  return {
    ...actual,
    fetchTrash: vi.fn(),
    restoreSession: vi.fn(),
    permanentDeleteSession: vi.fn(),
  }
})

import { fetchTrash, permanentDeleteSession, restoreSession } from '@/lib/trash'

import TrashPage from '../../src/pages/trash'

const fetchTrashMock = vi.mocked(fetchTrash)
const restoreSessionMock = vi.mocked(restoreSession)
const permanentDeleteSessionMock = vi.mocked(permanentDeleteSession)

beforeEach(() => {
  fetchTrashMock.mockReset()
  restoreSessionMock.mockReset()
  permanentDeleteSessionMock.mockReset()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <TrashPage />
    </MemoryRouter>,
  )
}

describe('TrashPage', () => {
  it('shows empty state when trash has no sessions', async () => {
    fetchTrashMock.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/trash is empty|回收站为空/i)).toBeInTheDocument()
  })

  it('renders deletion sessions returned from API', async () => {
    fetchTrashMock.mockResolvedValue([
      { deletedAt: 1716499000000, rootEntries: ['docs'], totalCount: 3 },
      { deletedAt: 1716489000000, rootEntries: ['photo.png'], totalCount: 1 },
    ])
    renderPage()
    expect(await screen.findByText('docs')).toBeInTheDocument()
    expect(screen.getByText('photo.png')).toBeInTheDocument()
    expect(screen.getByText(/^3$/)).toBeInTheDocument()
  })

  it('shows error state when fetch rejects', async () => {
    fetchTrashMock.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('clicking restore calls restoreSession with deletedAt then refreshes', async () => {
    fetchTrashMock.mockResolvedValueOnce([
      { deletedAt: 1716499000000, rootEntries: ['docs'], totalCount: 3 },
    ])
    restoreSessionMock.mockResolvedValue(undefined)
    fetchTrashMock.mockResolvedValueOnce([])

    renderPage()
    const restoreBtn = await screen.findByRole('button', { name: /restore|恢复/i })
    fireEvent.click(restoreBtn)

    await waitFor(() => {
      expect(restoreSessionMock).toHaveBeenCalledWith(1716499000000)
    })
    await waitFor(() => {
      expect(fetchTrashMock).toHaveBeenCalledTimes(2)
    })
  })

  it('clicking delete opens confirm dialog', async () => {
    fetchTrashMock.mockResolvedValue([
      { deletedAt: 1716499000000, rootEntries: ['docs'], totalCount: 3 },
    ])
    renderPage()
    const deleteBtn = await screen.findByRole('button', { name: /delete permanently|永久删除/i })
    fireEvent.click(deleteBtn)

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('confirming dialog calls permanentDeleteSession then refreshes', async () => {
    fetchTrashMock.mockResolvedValueOnce([
      { deletedAt: 1716499000000, rootEntries: ['docs'], totalCount: 3 },
    ])
    permanentDeleteSessionMock.mockResolvedValue(undefined)
    fetchTrashMock.mockResolvedValueOnce([])

    renderPage()
    const deleteBtn = await screen.findByRole('button', { name: /delete permanently|永久删除/i })
    fireEvent.click(deleteBtn)

    const dialog = await screen.findByRole('alertdialog')
    const confirmBtn = within(dialog).getByRole('button', { name: /^delete$|^删除$/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(permanentDeleteSessionMock).toHaveBeenCalledWith(1716499000000)
    })
    await waitFor(() => {
      expect(fetchTrashMock).toHaveBeenCalledTimes(2)
    })
  })
})
