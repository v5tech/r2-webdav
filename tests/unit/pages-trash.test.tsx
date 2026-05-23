import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/trash', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/trash')>('../../src/lib/trash')
  return {
    ...actual,
    fetchTrash: vi.fn(),
  }
})

import { fetchTrash } from '@/lib/trash'

import TrashPage from '../../src/pages/trash'

const fetchTrashMock = vi.mocked(fetchTrash)

beforeEach(() => {
  fetchTrashMock.mockReset()
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
})
