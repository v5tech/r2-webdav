import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/webdav', async () => {
  const actual =
    await vi.importActual<typeof import('../../src/lib/webdav')>('../../src/lib/webdav')
  return { ...actual, createFolder: vi.fn() }
})

import { createFolder } from '@/lib/webdav'

import { NewFolderDialog } from '../../src/components/files/NewFolderDialog'

const createFolderMock = vi.mocked(createFolder)

beforeEach(() => {
  createFolderMock.mockReset()
})

describe('NewFolderDialog', () => {
  it('renders title and form fields when open', () => {
    render(
      <NewFolderDialog open onOpenChange={() => {}} cwd="" onCreated={() => {}} />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/folder name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <NewFolderDialog open={false} onOpenChange={() => {}} cwd="" onCreated={() => {}} />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows validation error when name is empty', async () => {
    render(
      <NewFolderDialog open onOpenChange={() => {}} cwd="" onCreated={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(await screen.findByText(/required|empty/i)).toBeInTheDocument()
    expect(createFolderMock).not.toHaveBeenCalled()
  })

  it('shows validation error when name contains /', async () => {
    render(
      <NewFolderDialog open onOpenChange={() => {}} cwd="" onCreated={() => {}} />,
    )
    fireEvent.change(screen.getByLabelText(/folder name/i), {
      target: { value: 'bad/name' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(await screen.findByText(/\/|slash/i)).toBeInTheDocument()
    expect(createFolderMock).not.toHaveBeenCalled()
  })

  it('calls createFolder with cwd+name on valid submit', async () => {
    createFolderMock.mockResolvedValue()
    render(
      <NewFolderDialog
        open
        onOpenChange={() => {}}
        cwd="docs/"
        onCreated={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText(/folder name/i), {
      target: { value: 'photos' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => expect(createFolderMock).toHaveBeenCalledWith('docs/photos'))
  })

  it('closes dialog and calls onCreated on success', async () => {
    createFolderMock.mockResolvedValue()
    const onOpenChange = vi.fn()
    const onCreated = vi.fn()
    render(
      <NewFolderDialog open onOpenChange={onOpenChange} cwd="" onCreated={onCreated} />,
    )
    fireEvent.change(screen.getByLabelText(/folder name/i), {
      target: { value: 'newdir' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows error and stays open on failure', async () => {
    createFolderMock.mockRejectedValue(new Error('Failed to create folder: 409'))
    const onOpenChange = vi.fn()
    render(
      <NewFolderDialog open onOpenChange={onOpenChange} cwd="" onCreated={() => {}} />,
    )
    fireEvent.change(screen.getByLabelText(/folder name/i), {
      target: { value: 'exists' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('cancel button closes dialog without calling createFolder', () => {
    const onOpenChange = vi.fn()
    render(
      <NewFolderDialog open onOpenChange={onOpenChange} cwd="" onCreated={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(createFolderMock).not.toHaveBeenCalled()
  })
})
